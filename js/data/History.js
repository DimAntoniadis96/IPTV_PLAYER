/* =====================================================================
 * History.js — Per-account "recently watched"
 * ---------------------------------------------------------------------
 * Most-recent-first, de-duplicated, capped list stored in localStorage.
 * ===================================================================== */

import { prefs } from '../core/Prefs.js';
import { LS } from '../core/constants.js';
import { accounts } from './AccountManager.js';

const MAX = 60;

class History {
    _all() { return prefs.get(LS.HISTORY, {}); }
    _accountId() { const a = accounts.getActive(); return a ? a.id : '_'; }

    /** @returns {object[]} recent items (newest first). */
    list() { return this._all()[this._accountId()] || []; }

    /** Record a played item at the top of the list. */
    add(item) {
        if (!item || !item.id) return;
        const all = this._all();
        const key = this._accountId();
        let list = (all[key] || []).filter((x) => x.id !== item.id);
        list.unshift({
            id: item.id, name: item.name, logo: item.logo || '', section: item.section,
            url: item.url || '', ext: item.ext, seriesId: item.seriesId,
            categoryId: item.categoryId, watchedAt: Date.now()
        });
        if (list.length > MAX) list = list.slice(0, MAX);
        all[key] = list;
        prefs.set(LS.HISTORY, all);
    }

    clear() {
        const all = this._all();
        all[this._accountId()] = [];
        prefs.set(LS.HISTORY, all);
    }
}

export const history = new History();
