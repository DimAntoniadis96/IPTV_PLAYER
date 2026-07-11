/* =====================================================================
 * theme.js — Runtime theme switching
 * ---------------------------------------------------------------------
 * Applies a theme by setting `data-theme` on <html>; CSS in themes.css
 * overrides the design tokens per theme. Choice persists in localStorage.
 * ===================================================================== */

import { prefs } from '../core/Prefs.js';

const THEME_KEY = 'iptv.theme';

const THEMES = [
    { id: 'dark', label: 'Dark' },
    { id: 'midnight', label: 'Midnight Blue' },
    { id: 'light', label: 'Light' }
];

class Theme {
    constructor() { this.id = 'dark'; }

    /** Apply the persisted theme (default dark). */
    init() {
        const saved = prefs.get(THEME_KEY, 'dark');
        this.setTheme(THEMES.some((t) => t.id === saved) ? saved : 'dark');
    }

    get themes() { return THEMES; }
    get current() { return this.id; }
    get currentLabel() { return (THEMES.find((t) => t.id === this.id) || THEMES[0]).label; }

    setTheme(id) {
        this.id = id;
        document.documentElement.setAttribute('data-theme', id);
        prefs.set(THEME_KEY, id);
    }

    /** Advance to the next theme. */
    cycle() {
        const i = THEMES.findIndex((t) => t.id === this.id);
        this.setTheme(THEMES[(i + 1) % THEMES.length].id);
    }
}

export const theme = new Theme();
