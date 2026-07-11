/* =====================================================================
 * constants.js — App-wide constants (single source of truth)
 * ===================================================================== */

/** Semantic app version (kept in sync with config.xml). */
export const APP_VERSION = '1.0.0';

/** IndexedDB configuration used by Store.js for the playlist cache. */
export const DB = Object.freeze({
    NAME: 'iptv-player',
    VERSION: 1,
    STORES: Object.freeze({
        CATEGORIES: 'categories', // { key, accountId, type, items[] }
        STREAMS: 'streams',       // { key, accountId, type, categoryId, items[] }
        META: 'meta'              // { key, value } misc cache metadata
    })
});

/** localStorage keys (small structured data: accounts, settings, favorites…). */
export const LS = Object.freeze({
    ACCOUNTS: 'iptv.accounts',
    ACTIVE_ACCOUNT: 'iptv.activeAccountId',
    SETTINGS: 'iptv.settings',
    FAVORITES: 'iptv.favorites',
    HISTORY: 'iptv.history'
});

/** Login / account method types. */
export const LOGIN_METHOD = Object.freeze({
    XTREAM: 'xtream', // server + username + password
    M3U: 'm3u'        // pasted playlist URL
});

/** Content categories/sections shown in the app. */
export const SECTION = Object.freeze({
    LIVE: 'live',
    MOVIE: 'movie',
    SERIES: 'series',
    FAVORITES: 'favorites',
    RECENT: 'recent',
    SEARCH: 'search'
});

/** Xtream stream_type -> our internal SECTION mapping. */
export const STREAM_TYPE = Object.freeze({
    live: SECTION.LIVE,
    movie: SECTION.MOVIE,
    series: SECTION.SERIES
});

/** Networking defaults. */
export const NET = Object.freeze({
    TIMEOUT_MS: 15000,      // per-request timeout
    RETRIES: 2,             // extra attempts on transient failure
    RETRY_BASE_MS: 600,     // backoff base (exponential)
    MAX_PLAYLIST_BYTES: 80 * 1024 * 1024 // safety cap for M3U downloads (~80MB)
});

/** Named application views (used by the Router in Module 6). */
export const VIEW = Object.freeze({
    LOGIN: 'login',
    ACCOUNTS: 'accounts',
    HOME: 'home',
    LIST: 'list',
    SEARCH: 'search',
    SETTINGS: 'settings',
    PLAYER: 'player'
});

/** Global event names emitted on the shared EventBus. */
export const EVENT = Object.freeze({
    APP_READY: 'app:ready',
    NAV_TO: 'nav:to',
    NAV_BACK: 'nav:back',
    ACCOUNT_CHANGED: 'account:changed',
    PLAYLIST_PROGRESS: 'playlist:progress',
    PLAYLIST_READY: 'playlist:ready',
    PLAYLIST_ERROR: 'playlist:error',
    TOAST: 'ui:toast',
    KEY: 'input:key'
});
