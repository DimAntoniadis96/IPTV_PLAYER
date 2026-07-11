/* =====================================================================
 * Store.js — Promise-based IndexedDB wrapper for the playlist cache
 * ---------------------------------------------------------------------
 * localStorage caps out around ~5MB and is synchronous — unusable for a
 * 20k+ channel catalog. IndexedDB is async and effectively unbounded, so
 * parsed categories/streams are cached here for instant reloads.
 * ===================================================================== */

import { DB } from './constants.js';
import { logger } from './Logger.js';

const log = logger.child('Store');

class Store {
    constructor() {
        /** @type {IDBDatabase|null} */
        this._db = null;
        this._openPromise = null;
        this._available = typeof indexedDB !== 'undefined';
    }

    /** Whether IndexedDB exists in this environment. */
    get available() { return this._available; }

    /**
     * Open (and lazily create) the database. Safe to call repeatedly.
     * @returns {Promise<IDBDatabase>}
     */
    open() {
        if (!this._available) return Promise.reject(new Error('IndexedDB unavailable'));
        if (this._db) return Promise.resolve(this._db);
        if (this._openPromise) return this._openPromise;

        this._openPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(DB.NAME, DB.VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                for (const name of Object.values(DB.STORES)) {
                    if (!db.objectStoreNames.contains(name)) {
                        db.createObjectStore(name, { keyPath: 'key' });
                    }
                }
            };
            req.onsuccess = () => {
                this._db = req.result;
                this._db.onversionchange = () => this.close();
                resolve(this._db);
            };
            req.onerror = () => reject(req.error);
        });
        return this._openPromise;
    }

    /** @returns {Promise<IDBTransaction store>} internal helper */
    async _tx(storeName, mode) {
        const db = await this.open();
        return db.transaction(storeName, mode).objectStore(storeName);
    }

    /**
     * Put a record ({ key, ... }) into a store.
     * @param {string} storeName @param {object} record must contain `key`
     */
    async put(storeName, record) {
        const store = await this._tx(storeName, 'readwrite');
        return this._wrap(store.put(record));
    }

    /**
     * Bulk put many records in one transaction (fast for big catalogs).
     * @param {string} storeName @param {object[]} records
     */
    async bulkPut(storeName, records) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            for (const r of records) store.put(r);
            tx.oncomplete = () => resolve(records.length);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    }

    /** Get a record by key (or null). */
    async get(storeName, key) {
        const store = await this._tx(storeName, 'readonly');
        const rec = await this._wrap(store.get(key));
        return rec ?? null;
    }

    /** Delete a record by key. */
    async delete(storeName, key) {
        const store = await this._tx(storeName, 'readwrite');
        return this._wrap(store.delete(key));
    }

    /** Clear an entire object store. */
    async clearStore(storeName) {
        const store = await this._tx(storeName, 'readwrite');
        return this._wrap(store.clear());
    }

    /** Wipe every store (Settings → Clear cache). */
    async clearAll() {
        for (const name of Object.values(DB.STORES)) {
            try { await this.clearStore(name); } catch (e) { log.warn('clear failed', name, e); }
        }
    }

    close() {
        if (this._db) { this._db.close(); this._db = null; this._openPromise = null; }
    }

    /** Promisify an IDBRequest. */
    _wrap(req) {
        return new Promise((resolve, reject) => {
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }
}

/** Shared cache store instance. */
export const store = new Store();
export { Store };
