/* =====================================================================
 * M3UParser.js — Streaming M3U / M3U-plus parser
 * ---------------------------------------------------------------------
 * Fed one line at a time (from Http.streamLines) so a 20k+ entry playlist
 * is parsed incrementally without building a second giant string. Produces
 * normalized channel objects and collects group names by section.
 * ===================================================================== */

import { SECTION } from '../core/constants.js';

/** Pull `attr="value"` pairs out of an #EXTINF line. */
const ATTR_RE = /([a-zA-Z0-9_-]+)="([^"]*)"/g;

/** Classify an entry into a SECTION using its URL and group hints. */
function classify(url, group) {
    const u = (url || '').toLowerCase();
    if (u.includes('/movie/')) return SECTION.MOVIE;
    if (u.includes('/series/')) return SECTION.SERIES;
    const g = (group || '').toLowerCase();
    if (/\b(vod|movie|film|cinema)\b/.test(g)) return SECTION.MOVIE;
    if (/\b(series|show|serie)\b/.test(g)) return SECTION.SERIES;
    return SECTION.LIVE; // default: live TV
}

/** Guess a container extension from a stream URL. */
function extFromUrl(url) {
    const m = /\.([a-z0-9]{2,4})(?:\?|$)/i.exec(url || '');
    return m ? m[1].toLowerCase() : 'ts';
}

export class M3UParser {
    constructor() {
        /** @type {object[]} parsed channels */
        this.items = [];
        /** section -> Set of group names */
        this.groups = { [SECTION.LIVE]: new Set(), [SECTION.MOVIE]: new Set(), [SECTION.SERIES]: new Set() };
        this._pending = null; // channel awaiting its URL line
        this._seenHeader = false;
        this._index = 0;
    }

    /** True if the stream began with a valid #EXTM3U header. */
    get valid() { return this._seenHeader; }

    /**
     * Consume a single line of the playlist.
     * @param {string} rawLine
     */
    push(rawLine) {
        const line = rawLine.trim();
        if (!line) return;

        if (line.toUpperCase().startsWith('#EXTM3U')) { this._seenHeader = true; return; }

        if (line.startsWith('#EXTINF')) {
            this._pending = this._parseExtInf(line);
            return;
        }

        // Some playlists carry the group on a separate #EXTGRP line.
        if (line.startsWith('#EXTGRP:')) {
            if (this._pending) this._pending.group = line.slice(8).trim() || this._pending.group;
            return;
        }

        // Ignore any other directives.
        if (line.startsWith('#')) return;

        // Non-directive line = the stream URL for the pending #EXTINF.
        if (this._pending) {
            const ch = this._pending;
            ch.url = line;
            ch.ext = extFromUrl(line);
            ch.section = classify(line, ch.group);
            ch.id = ch.tvgId || `m3u_${this._index}`;
            this._index += 1;
            this.groups[ch.section].add(ch.group);
            this.items.push(ch);
            this._pending = null;
        }
    }

    /** Parse one #EXTINF line into a partial channel object. */
    _parseExtInf(line) {
        const commaIdx = line.indexOf(',');
        const attrsPart = commaIdx >= 0 ? line.slice(0, commaIdx) : line;
        const name = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : '';

        const attrs = {};
        let m;
        ATTR_RE.lastIndex = 0;
        while ((m = ATTR_RE.exec(attrsPart)) !== null) attrs[m[1].toLowerCase()] = m[2];

        return {
            name: name || attrs['tvg-name'] || 'Unknown',
            tvgId: attrs['tvg-id'] || '',
            tvgName: attrs['tvg-name'] || '',
            logo: attrs['tvg-logo'] || '',
            group: attrs['group-title'] || 'Uncategorized',
            url: '',
            ext: 'ts',
            section: SECTION.LIVE
        };
    }

    /**
     * Group parsed items by section into {categories, streamsByCategory}
     * so the result matches the Xtream shape used by PlaylistService.
     * @returns {{sections: object}}
     */
    finalize() {
        const sections = {};
        for (const sec of [SECTION.LIVE, SECTION.MOVIE, SECTION.SERIES]) {
            const groupNames = [...this.groups[sec]].sort((a, b) => a.localeCompare(b));
            const categories = groupNames.map((name, i) => ({ id: `${sec}:${i}`, name }));
            const idByName = new Map(categories.map((c) => [c.name, c.id]));
            const streamsByCategory = {};
            for (const c of categories) streamsByCategory[c.id] = [];
            for (const item of this.items) {
                if (item.section !== sec) continue;
                const cid = idByName.get(item.group);
                item.categoryId = cid;
                streamsByCategory[cid].push(item);
            }
            sections[sec] = { categories, streamsByCategory };
        }
        return { sections };
    }
}
