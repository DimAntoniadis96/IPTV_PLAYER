/* =====================================================================
 * i18n.js — Minimal internationalization
 * ---------------------------------------------------------------------
 * String lookup with English fallback. Language choice persists in
 * localStorage. Screens call i18n.t(key, fallback) at render time, so a
 * language change takes effect the next time a screen is rendered
 * (Settings rebuilds itself immediately).
 * ===================================================================== */

import { prefs } from '../core/Prefs.js';
import en from './en.js';
import es from './es.js';

const LANG_KEY = 'iptv.lang';

const DICTS = { en, es };
const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' }
];

class I18n {
    constructor() { this.code = 'en'; }

    /** Load the persisted language (default English). */
    init() {
        const saved = prefs.get(LANG_KEY, null);
        this.code = DICTS[saved] ? saved : 'en';
        document.documentElement.lang = this.code;
    }

    /** @returns {{code,label}[]} */
    get languages() { return LANGUAGES; }
    get current() { return this.code; }
    get currentLabel() { return (LANGUAGES.find((l) => l.code === this.code) || LANGUAGES[0]).label; }

    /**
     * Translate a key, falling back to English then the provided fallback.
     * @param {string} key @param {string} [fallback]
     */
    t(key, fallback) {
        const dict = DICTS[this.code] || en;
        return dict[key] ?? en[key] ?? fallback ?? key;
    }

    setLanguage(code) {
        if (!DICTS[code]) return;
        this.code = code;
        prefs.set(LANG_KEY, code);
        document.documentElement.lang = code;
    }

    /** Advance to the next available language. */
    cycle() {
        const i = LANGUAGES.findIndex((l) => l.code === this.code);
        const next = LANGUAGES[(i + 1) % LANGUAGES.length];
        this.setLanguage(next.code);
    }
}

export const i18n = new I18n();
