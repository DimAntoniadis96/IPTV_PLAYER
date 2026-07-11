/* =====================================================================
 * XtreamClient.js — Typed client for the Xtream player_api
 * ---------------------------------------------------------------------
 * Wraps the player_api endpoints and normalizes their varied JSON shapes
 * into ONE internal item model shared with the M3U path. Categories and
 * streams are fetched lazily (per section / per category) so we never hold
 * the entire 20k+ catalog in memory at once.
 * ===================================================================== */

import { getJson } from '../core/Http.js';
import { XtreamUrls } from '../core/UrlBuilder.js';
import { SECTION } from '../core/constants.js';
import { logger } from '../core/Logger.js';

const log = logger.child('Xtream');

/** Normalize a raw Xtream category record. */
function mapCategory(raw) {
    return { id: String(raw.category_id), name: raw.category_name || 'Unknown' };
}

export class XtreamClient {
    /** @param {import('./AccountManager.js').Account} account */
    constructor(account) {
        this.account = account;
        this.urls = new XtreamUrls(account);
    }

    /** GET account/server info (used for expiry display in Settings). */
    async accountInfo(opts) {
        return getJson(this.urls.accountInfo(), opts);
    }

    /**
     * Fetch categories for a section.
     * @param {'live'|'movie'|'series'} section
     * @returns {Promise<{id:string,name:string}[]>}
     */
    async categories(section, opts) {
        const url = section === SECTION.LIVE ? this.urls.liveCategories()
            : section === SECTION.MOVIE ? this.urls.vodCategories()
            : this.urls.seriesCategories();
        const data = await getJson(url, opts);
        if (!Array.isArray(data)) return [];
        return data.map(mapCategory);
    }

    /**
     * Fetch streams for one category of a section, normalized to the shared
     * item model. `categoryId` may be null to fetch all (large!).
     * @returns {Promise<object[]>}
     */
    async streams(section, categoryId, opts) {
        if (section === SECTION.LIVE) {
            const data = await getJson(this.urls.liveStreams(categoryId), opts);
            return this._mapLive(data);
        }
        if (section === SECTION.MOVIE) {
            const data = await getJson(this.urls.vodStreams(categoryId), opts);
            return this._mapMovie(data);
        }
        const data = await getJson(this.urls.seriesList(categoryId), opts);
        return this._mapSeries(data);
    }

    /**
     * Fetch full series info (seasons + episodes) for a series id.
     * @returns {Promise<{seasons: object[]}>}
     */
    async seriesInfo(seriesId, opts) {
        const data = await getJson(this.urls.seriesInfo(seriesId), opts);
        return this._mapSeriesEpisodes(seriesId, data);
    }

    // ---- Normalizers (defensive against missing fields) ----

    _mapLive(data) {
        if (!Array.isArray(data)) return [];
        return data.map((s) => ({
            id: String(s.stream_id),
            name: s.name || 'Unknown',
            logo: s.stream_icon || '',
            tvgId: s.epg_channel_id || '',
            tvgName: s.name || '',
            categoryId: String(s.category_id ?? ''),
            section: SECTION.LIVE,
            ext: this.urls.liveExt,
            num: s.num,
            url: this.urls.liveStreamUrl(s.stream_id)
        }));
    }

    _mapMovie(data) {
        if (!Array.isArray(data)) return [];
        return data.map((s) => {
            const ext = s.container_extension || 'mp4';
            return {
                id: String(s.stream_id),
                name: s.name || 'Unknown',
                logo: s.stream_icon || s.cover || '',
                categoryId: String(s.category_id ?? ''),
                section: SECTION.MOVIE,
                ext,
                rating: s.rating,
                added: s.added,
                url: this.urls.movieStreamUrl(s.stream_id, ext)
            };
        });
    }

    _mapSeries(data) {
        if (!Array.isArray(data)) return [];
        return data.map((s) => ({
            id: String(s.series_id),
            seriesId: String(s.series_id),
            name: s.name || 'Unknown',
            logo: s.cover || '',
            categoryId: String(s.category_id ?? ''),
            section: SECTION.SERIES,
            plot: s.plot || '',
            rating: s.rating,
            isSeries: true // marks this as a container, not a playable stream
        }));
    }

    /** Flatten Xtream series_info seasons/episodes into playable items. */
    _mapSeriesEpisodes(seriesId, data) {
        const seasons = [];
        const episodesObj = (data && data.episodes) || {};
        for (const seasonNum of Object.keys(episodesObj).sort((a, b) => Number(a) - Number(b))) {
            const eps = (episodesObj[seasonNum] || []).map((e) => {
                const ext = e.container_extension || 'mp4';
                return {
                    id: String(e.id),
                    name: e.title || `Episode ${e.episode_num}`,
                    episodeNum: e.episode_num,
                    season: Number(seasonNum),
                    section: SECTION.SERIES,
                    ext,
                    seriesId: String(seriesId),
                    url: this.urls.seriesStreamUrl(e.id, ext)
                };
            });
            seasons.push({ season: Number(seasonNum), episodes: eps });
        }
        log.debug(`series ${seriesId}: ${seasons.length} seasons`);
        return { seasons };
    }
}
