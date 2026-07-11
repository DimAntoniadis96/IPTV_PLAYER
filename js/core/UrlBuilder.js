/* =====================================================================
 * UrlBuilder.js — Build Xtream API / stream URLs from account credentials
 * ---------------------------------------------------------------------
 * Centralises every URL construction so credentials are assembled in ONE
 * audited place. No server is hardcoded — the host always comes from the
 * account the user configured.
 * ===================================================================== */

/**
 * Normalise a user-entered server URL:
 *  - trims whitespace
 *  - adds http:// if no scheme given
 *  - strips any trailing slash and any accidental path (keeps origin[:port])
 * @param {string} input
 * @returns {string} e.g. "https://host.example:8080"
 */
export function normalizeServer(input) {
    let s = String(input || '').trim();
    if (!s) return '';
    if (!/^https?:\/\//i.test(s)) s = 'http://' + s;
    try {
        const u = new URL(s);
        const port = u.port ? ':' + u.port : '';
        return `${u.protocol}//${u.hostname}${port}`;
    } catch {
        return s.replace(/\/+$/, '');
    }
}

/** URL-encode a credential component safely. */
const enc = (v) => encodeURIComponent(String(v ?? ''));

/**
 * Builds all URLs for a single Xtream account.
 * Construct once per active account and reuse.
 */
export class XtreamUrls {
    /**
     * @param {{serverUrl:string, username:string, password:string,
     *          streamFormat?:string}} account
     */
    constructor(account) {
        this.server = normalizeServer(account.serverUrl);
        this.username = account.username;
        this.password = account.password;
        // Container extension for live streams: 'ts' (default) or 'm3u8'.
        this.liveExt = account.streamFormat || 'ts';
        this._auth = `username=${enc(this.username)}&password=${enc(this.password)}`;
    }

    /** player_api.php base with credentials. */
    api(action, params = {}) {
        const extra = Object.entries(params)
            .map(([k, v]) => `&${k}=${enc(v)}`)
            .join('');
        const a = action ? `&action=${enc(action)}` : '';
        return `${this.server}/player_api.php?${this._auth}${a}${extra}`;
    }

    /** Account/auth probe (returns user_info + server_info). */
    accountInfo() { return this.api(''); }

    liveCategories()  { return this.api('get_live_categories'); }
    vodCategories()   { return this.api('get_vod_categories'); }
    seriesCategories(){ return this.api('get_series_categories'); }

    liveStreams(categoryId)   { return this.api('get_live_streams',   categoryId != null ? { category_id: categoryId } : {}); }
    vodStreams(categoryId)    { return this.api('get_vod_streams',    categoryId != null ? { category_id: categoryId } : {}); }
    seriesList(categoryId)    { return this.api('get_series',         categoryId != null ? { category_id: categoryId } : {}); }
    seriesInfo(seriesId)      { return this.api('get_series_info',    { series_id: seriesId }); }
    vodInfo(vodId)            { return this.api('get_vod_info',       { vod_id: vodId }); }

    /** Full M3U export URL (used as an alternative/verification). */
    m3u() {
        return `${this.server}/get.php?${this._auth}&type=m3u_plus&output=${enc(this.liveExt)}`;
    }

    /** Playable stream URL for a LIVE channel. */
    liveStreamUrl(streamId) {
        return `${this.server}/live/${enc(this.username)}/${enc(this.password)}/${streamId}.${this.liveExt}`;
    }

    /** Playable stream URL for a MOVIE (VOD). `ext` from stream metadata. */
    movieStreamUrl(streamId, ext = 'mp4') {
        return `${this.server}/movie/${enc(this.username)}/${enc(this.password)}/${streamId}.${ext}`;
    }

    /** Playable stream URL for a SERIES EPISODE. */
    seriesStreamUrl(episodeId, ext = 'mp4') {
        return `${this.server}/series/${enc(this.username)}/${enc(this.password)}/${episodeId}.${ext}`;
    }
}

/**
 * Best-effort extraction of {server, username, password} from a pasted
 * Xtream get.php URL. Enables the M3U-paste method to *optionally* upgrade
 * to the richer player_api if the URL is a standard Xtream export.
 * @param {string} url
 * @returns {{serverUrl:string, username:string, password:string}|null}
 */
export function parseXtreamFromM3U(url) {
    try {
        const u = new URL(String(url).trim());
        const username = u.searchParams.get('username');
        const password = u.searchParams.get('password');
        if (!username || !password) return null;
        const port = u.port ? ':' + u.port : '';
        return {
            serverUrl: `${u.protocol}//${u.hostname}${port}`,
            username,
            password
        };
    } catch {
        return null;
    }
}
