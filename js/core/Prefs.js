/* =====================================================================
 * Prefs.js — Safe localStorage wrapper for small structured data
 * ---------------------------------------------------------------------
 * Used for accounts, settings, favorites and history. Everything is
 * JSON-encoded. All access is wrapped so a corrupt value or a full quota
 * can never crash the app.
 * ===================================================================== */

import { logger } from './Logger.js';

const log = logger.child('Prefs');

class Prefs {
    constructor() {
        this._available = (() => {
            try {
                const k = '__probe__';
                localStorage.setItem(k, '1');
                localStorage.removeItem(k);
                return true;
            } catch { return false; }
        })();
        /** In-memory fallback if localStorage is unavailable. */
        this._mem = new Map();
    }

    /**
     * Read and JSON-parse a key.
     * @template T
     * @param {string} key @param {T} [fallback]
     * @returns {T}
     */
    get(key, fallback = null) {
        try {
            const raw = this._available ? localStorage.getItem(key) : this._mem.get(key);
            if (raw == null) return fallback;
            return JSON.parse(raw);
        } catch (e) {
            log.warn('get failed, using fallback', key);
            return fallback;
        }
    }

    /**
     * JSON-encode and store a value.
     * @param {string} key @param {*} value
     * @returns {boolean} success
     */
    set(key, value) {
        try {
            const raw = JSON.stringify(value);
            if (this._available) localStorage.setItem(key, raw);
            else this._mem.set(key, raw);
            return true;
        } catch (e) {
            // QuotaExceededError etc. — never throw to the caller.
            log.error('set failed', key, e && e.name);
            return false;
        }
    }

    /** Remove a key. */
    remove(key) {
        try {
            if (this._available) localStorage.removeItem(key);
            else this._mem.delete(key);
        } catch (e) { log.warn('remove failed', key); }
    }
}

/** Shared preferences instance. */
export const prefs = new Prefs();
export { Prefs };
