/* =====================================================================
 * PlaylistService.js — Facade the UI uses to get categories & streams
 * ---------------------------------------------------------------------
 * Hides the Xtream-vs-M3U difference behind one API and adds an IndexedDB
 * cache layer for instant reloads. Xtream data loads lazily per category;
 * M3U is parsed once (streaming) into per-category buckets.
 *
 * Public API:
 *   load(account, {force})      -> prepares data source, returns summary
 *   getCategories(section)      -> [{id,name}]
 *   getStreams(section, catId)  -> [item]
 *   getSeriesEpisodes(seriesId) -> {seasons}
 *   search(query, {sections})   -> [item]
 *   clearCache()                -> void
 * ===================================================================== */

import { store } from '../core/Store.js';
import { DB, SECTION, LOGIN_METHOD, EVENT } from '../core/constants.js';
import { bus } from '../core/EventBus.js';
import { streamLines } from '../core/Http.js';
import { XtreamClient } from './XtreamClient.js';
import { M3UParser } from './M3UParser.js';
import { normalize } from '../utils/format.js';
import { logger } from '../core/Logger.js';

const log = logger.child('Playlist');
const ALL_SECTIONS = [SECTION.LIVE, SECTION.MOVIE, SECTION.SERIES];

export class PlaylistService {
    constructor() {
        this.account = null;
        /** @type {XtreamClient|null} */
        this.xtream = null;
        /** Parsed M3U result kept in memory for the active m3u account. */
        this._m3u = null;
        /** In-memory LRU-ish caches to avoid re-hitting IDB constantly. */
        this._catMem = new Map();     // section -> [cats]
        this._streamMem = new Map();  // `${section}:${catId}` -> [items]
    }

    _catKey(section) { return `${this.account.id}:${section}`; }
    _streamKey(section, catId) { return `${this.account.id}:${section}:${catId}`; }

    /**
     * Prepare the service for an account.
     * @param {import('./AccountManager.js').Account} account
     * @param {{force?:boolean}} [opts]
     * @returns {Promise<{sections: Record<string, number>}>}
     */
    async load(account, opts = {}) {
        this.account = account;
        this.xtream = null;
        this._m3u = null;
        this._catMem.clear();
        this._streamMem.clear();

        if (account.method === LOGIN_METHOD.XTREAM) {
            this.xtream = new XtreamClient(account);
            return this._loadXtream(opts);
        }
        return this._loadM3U(opts);
    }

    /** Xtream: fetch just the category lists up-front (small, fast). */
    async _loadXtream(opts) {
        const summary = { sections: {} };
        for (const section of ALL_SECTIONS) {
            const cats = await this.getCategories(section, opts);
            summary.sections[section] = cats.length;
            bus.emit(EVENT.PLAYLIST_PROGRESS, { section, categories: cats.length });
        }
        bus.emit(EVENT.PLAYLIST_READY, summary);
        return summary;
    }

    /** M3U: stream-download + parse the whole playlist, then cache buckets. */
    async _loadM3U(opts) {
        // Try cache first unless forced.
        if (!opts.force) {
            const cached = await this._readCachedM3UMeta();
            if (cached) {
                log.info('using cached M3U catalog');
                bus.emit(EVENT.PLAYLIST_READY, cached);
                return cached;
            }
        }

        const parser = new M3UParser();
        let lastEmit = 0;
        await streamLines(this.account.m3uUrl, (line) => parser.push(line), {
            signal: opts.signal,
            onProgress: (bytes) => {
                const mb = bytes / (1024 * 1024);
                if (mb - lastEmit >= 1) { // throttle to ~1 event/MB
                    lastEmit = mb;
                    bus.emit(EVENT.PLAYLIST_PROGRESS, { bytes, mb: Math.round(mb) });
                }
            }
        });

        if (!parser.valid) {
            const err = new Error('invalid_playlist');
            bus.emit(EVENT.PLAYLIST_ERROR, err);
            throw err;
        }

        const { sections } = parser.finalize();
        this._m3u = sections;
        await this._cacheM3U(sections);

        const summary = { sections: {} };
        for (const s of ALL_SECTIONS) summary.sections[s] = sections[s].categories.length;
        bus.emit(EVENT.PLAYLIST_READY, summary);
        return summary;
    }

    /** Persist parsed M3U buckets into IndexedDB. */
    async _cacheM3U(sections) {
        try {
            for (const s of ALL_SECTIONS) {
                await store.put(DB.STORES.CATEGORIES, {
                    key: this._catKey(s), items: sections[s].categories, cachedAt: Date.now()
                });
                const bulk = [];
                for (const [catId, items] of Object.entries(sections[s].streamsByCategory)) {
                    bulk.push({ key: this._streamKey(s, catId), items, cachedAt: Date.now() });
                }
                if (bulk.length) await store.bulkPut(DB.STORES.STREAMS, bulk);
            }
            await store.put(DB.STORES.META, { key: `${this.account.id}:m3u`, cachedAt: Date.now() });
        } catch (e) {
            log.warn('M3U cache write failed (continuing without cache)', e && e.name);
        }
    }

    /** Read cached M3U catalog back into memory if present. */
    async _readCachedM3UMeta() {
        if (!store.available) return null;
        try {
            const meta = await store.get(DB.STORES.META, `${this.account.id}:m3u`);
            if (!meta) return null;
            const sections = {};
            const summary = { sections: {} };
            for (const s of ALL_SECTIONS) {
                const catRec = await store.get(DB.STORES.CATEGORIES, this._catKey(s));
                const categories = catRec ? catRec.items : [];
                sections[s] = { categories, streamsByCategory: {} };
                summary.sections[s] = categories.length;
            }
            this._m3u = sections; // streams lazily pulled from IDB per category
            return summary;
        } catch { return null; }
    }

    /**
     * Categories for a section (memory -> IDB cache -> network).
     * @returns {Promise<{id:string,name:string}[]>}
     */
    async getCategories(section, opts = {}) {
        if (this._catMem.has(section)) return this._catMem.get(section);

        if (!opts.force && store.available) {
            const rec = await store.get(DB.STORES.CATEGORIES, this._catKey(section));
            if (rec && rec.items) { this._catMem.set(section, rec.items); return rec.items; }
        }

        let cats = [];
        if (this.xtream) {
            cats = await this.xtream.categories(section, opts);
            try { await store.put(DB.STORES.CATEGORIES, { key: this._catKey(section), items: cats, cachedAt: Date.now() }); } catch {}
        } else if (this._m3u) {
            cats = this._m3u[section].categories;
        }
        this._catMem.set(section, cats);
        return cats;
    }

    /**
     * Streams for a category (memory -> IDB cache -> network).
     * @returns {Promise<object[]>}
     */
    async getStreams(section, categoryId, opts = {}) {
        const memKey = `${section}:${categoryId}`;
        if (this._streamMem.has(memKey)) return this._streamMem.get(memKey);

        if (!opts.force && store.available) {
            const rec = await store.get(DB.STORES.STREAMS, this._streamKey(section, categoryId));
            if (rec && rec.items) { this._streamMem.set(memKey, rec.items); return rec.items; }
        }

        let items = [];
        if (this.xtream) {
            items = await this.xtream.streams(section, categoryId, opts);
            try { await store.put(DB.STORES.STREAMS, { key: this._streamKey(section, categoryId), items, cachedAt: Date.now() }); } catch {}
        } else if (this._m3u) {
            items = (this._m3u[section].streamsByCategory || {})[categoryId] || [];
        }
        this._streamMem.set(memKey, items);
        return items;
    }

    /** Series info: seasons + episodes + metadata (Xtream only). */
    async getSeriesEpisodes(seriesId, opts = {}) {
        if (!this.xtream) return { seasons: [], info: {} };
        return this.xtream.seriesInfo(seriesId, opts);
    }

    /** Movie (VOD) info: plot/genre/rating + play URL (Xtream only). */
    async getMovieInfo(streamId, opts = {}) {
        if (!this.xtream) return null;
        return this.xtream.movieInfo(streamId, opts);
    }

    /**
     * Search across sections. For Xtream this lazily loads all streams for
     * each requested section once (cached) then filters in memory.
     * @param {string} query
     * @param {{sections?: string[], limit?: number}} [opts]
     * @returns {Promise<object[]>}
     */
    async search(query, opts = {}) {
        const q = normalize(query);
        if (q.length < 2) return [];
        const sections = opts.sections || ALL_SECTIONS;
        const limit = opts.limit || 300;
        const out = [];

        for (const section of sections) {
            const cats = await this.getCategories(section);
            for (const cat of cats) {
                const items = await this.getStreams(section, cat.id);
                for (const it of items) {
                    if (normalize(it.name).includes(q)) {
                        out.push(it);
                        if (out.length >= limit) return out;
                    }
                }
            }
        }
        return out;
    }

    /** Drop all cached catalog data for every account. */
    async clearCache() {
        this._catMem.clear();
        this._streamMem.clear();
        this._m3u = null;
        if (store.available) await store.clearAll();
    }
}

/** Shared singleton used by the UI. */
export const playlist = new PlaylistService();
