/* =====================================================================
 * main.js — Application entry point (Module 2 bootstrap)
 * ---------------------------------------------------------------------
 * Detects whether we're running on a Samsung Tizen TV or in a desktop
 * browser.  On Tizen it will (eventually) initialise AVPlay and the
 * remote‑key subsystem; in a browser it loads `browser-shim.js` which
 * provides HTML5 <video> playback and keyboard → remote-key mapping.
 *
 * This file is loaded as an ES module (`type="module"` in index.html).
 * ===================================================================== */

const IS_TIZEN = typeof tizen !== 'undefined';
const IS_BROWSER = !IS_TIZEN;

/* --- Tiny logger (Module 2) --- */
const Log = {
    _fmt(tag, args) { return [`[IPTV:${tag}]`, ...args]; },
    info(...a)  { console.log(...this._fmt('INFO', a)); },
    warn(...a)  { console.warn(...this._fmt('WARN', a)); },
    error(...a) { console.error(...this._fmt('ERR', a)); },
    debug(...a) { console.debug(...this._fmt('DBG', a)); },
};

/* --- Simple event bus (Module 2) --- */
const Bus = (() => {
    const _subs = {};
    return {
        on(evt, fn) { (_subs[evt] ||= []).push(fn); },
        off(evt, fn) { _subs[evt] = (_subs[evt] || []).filter(f => f !== fn); },
        emit(evt, data) { (_subs[evt] || []).forEach(fn => fn(data)); },
    };
})();

/* --- Boot-screen helpers --- */
const bootScreen = document.getElementById('boot-screen');
const bootStatus = document.getElementById('boot-status');
function setBootStatus(msg) {
    if (bootStatus) bootStatus.textContent = msg;
    Log.info('Boot:', msg);
}
function hideBootScreen() {
    if (bootScreen) bootScreen.classList.add('is-hidden');
}

/* === Bootstrap ============================================================ */
async function boot() {
    Log.info('Environment:', IS_TIZEN ? 'Samsung Tizen TV' : 'Desktop browser');

    setBootStatus('Loading modules…');

    if (IS_BROWSER) {
        /* Dynamically import the browser dev shim */
        try {
            const { initBrowserShim } = await import('./browser-shim.js');
            await initBrowserShim({ Log, Bus, setBootStatus, hideBootScreen });
        } catch (err) {
            Log.error('Failed to load browser shim:', err);
            setBootStatus('Error: ' + err.message);
        }
    } else {
        /* Tizen path — placeholder until Modules 5-7 land */
        setBootStatus('Tizen mode — modules not yet loaded');
        // Future: import tizen-specific modules
    }
}

/* Kick off after DOM is ready */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}

export { Log, Bus, IS_TIZEN, IS_BROWSER };
