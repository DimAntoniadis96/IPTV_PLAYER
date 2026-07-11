/* =====================================================================
 * Favorites.js — Per-account favorite channels/streams
 * ---------------------------------------------------------------------
 * Stored in localStorage keyed by account id. Items are the same shape as
 * catalog items so they render in the same grid and play the same way.
 * ===================================================================== */

import { prefs } from '../core/Prefs.js';
import { LS } from '../core/constants.js';
import { accounts } from './AccountManager.js';

class Favorites {
    _all() { return prefs.get(LS.FAVORITES, {}); }
    _accountId() { const a = accounts.getActive(); return a ? a.id : '_'; }

    /** @returns {object[]} favorites for the active account. */
    list() { return this._all()[this._accountId()] || []; }

    /** @param {string} id @returns {boolean} */
    has(id) { return this.list().some((x) => x.id === id); }

    /**
     * Toggle an item's favorite state.
     * @param {object} item
     * @returns {boolean} new state (true = now a favorite)
     */
    toggle(item) {
        const all = this._all();
        const key = this._accountId();
        const list = all[key] || [];
        const i = list.findIndex((x) => x.id === item.id);
        let added;
        if (i >= 0) { list.splice(i, 1); added = false; }
        else { list.unshift(this._slim(item)); added = true; }
        all[key] = list;
        prefs.set(LS.FAVORITES, all);
        return added;
    }

    remove(id) {
        const all = this._all();
        const key = this._accountId();
        all[key] = (all[key] || []).filter((x) => x.id !== id);
        prefs.set(LS.FAVORITES, all);
    }

    /** Keep only the fields needed to render + play. */
    _slim(it) {
        return {
            id: it.id, name: it.name, logo: it.logo || '', section: it.section,
            url: it.url || '', ext: it.ext, seriesId: it.seriesId, isSeries: it.isSeries,
            categoryId: it.categoryId
        };
    }
}

export const favorites = new Favorites();
