/* =====================================================================
 * platform.js — Runtime platform detection (multi-TV)
 * ---------------------------------------------------------------------
 * The app runs on several targets. Only a thin layer differs per platform
 * (video engine, remote keys); this module tells the rest of the app which
 * one we're on so it can pick the right adapter.
 *   'tizen'   — Samsung Smart TV (uses AVPlay)
 *   'webos'   — LG Smart TV      (uses HTML5 + hls.js/mpegts.js)
 *   'browser' — any browser / WebView / other TV (HTML5 + hls.js/mpegts.js)
 * ===================================================================== */

function detect() {
    try {
        if (typeof tizen !== 'undefined' && typeof webapis !== 'undefined' && webapis.avplay) return 'tizen';
    } catch (e) { /* ignore */ }
    try {
        const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
        if ((typeof window !== 'undefined' && window.webOS) || /web0s|webos/i.test(ua)) return 'webos';
    } catch (e) { /* ignore */ }
    return 'browser';
}

export const PLATFORM = detect();

/** True on an actual TV (Tizen or webOS) — used to enable the fast flat theme. */
export const IS_TV = PLATFORM === 'tizen' || PLATFORM === 'webos';

/** True when the native Samsung AVPlay engine is available. */
export const HAS_AVPLAY = PLATFORM === 'tizen';
