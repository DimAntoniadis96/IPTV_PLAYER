/* =====================================================================
 * AccountManager.js — CRUD for saved accounts + active-account tracking
 * ---------------------------------------------------------------------
 * Persists a list of accounts and the active account id in localStorage.
 * Supports both login methods, editing, deleting and multiple profiles.
 *
 * SECURITY: credentials are stored locally only (required for reconnect)
 * and are never logged. The logger redacts them defensively regardless.
 * ===================================================================== */

import { prefs } from '../core/Prefs.js';
import { LS, LOGIN_METHOD } from '../core/constants.js';
import { normalizeServer } from '../core/UrlBuilder.js';
import { bus } from '../core/EventBus.js';
import { EVENT } from '../core/constants.js';

/** Generate a reasonably-unique id (crypto when available). */
function uid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'acc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * @typedef {Object} Account
 * @property {string} id
 * @property {string} name          user-facing label / playlist name
 * @property {'xtream'|'m3u'} method
 * @property {string} [serverUrl]   xtream
 * @property {string} [username]    xtream
 * @property {string} [password]    xtream
 * @property {string} [m3uUrl]      m3u
 * @property {'ts'|'m3u8'} streamFormat
 * @property {number} createdAt
 * @property {number} lastUsedAt
 */

export class AccountManager {
    constructor() {
        /** @type {Account[]} */
        this._accounts = prefs.get(LS.ACCOUNTS, []);
        this._activeId = prefs.get(LS.ACTIVE_ACCOUNT, null);
    }

    /** @returns {Account[]} shallow copy so callers can't mutate internals. */
    list() { return this._accounts.map((a) => ({ ...a })); }

    /** @returns {number} */
    get count() { return this._accounts.length; }

    /** @param {string} id @returns {Account|null} */
    get(id) {
        const a = this._accounts.find((x) => x.id === id);
        return a ? { ...a } : null;
    }

    /** @returns {Account|null} the currently active account. */
    getActive() {
        if (!this._activeId) return null;
        return this.get(this._activeId);
    }

    /** @param {string|null} id */
    setActive(id) {
        this._activeId = id;
        prefs.set(LS.ACTIVE_ACCOUNT, id);
        const acc = this.getActive();
        if (acc) {
            acc.lastUsedAt = Date.now();
            this._replace(acc);
        }
        bus.emit(EVENT.ACCOUNT_CHANGED, acc);
        return acc;
    }

    /**
     * Validate + normalise raw form input into a persistable Account.
     * @param {Partial<Account>} data
     * @returns {{account?:Account, error?:string}}
     */
    _sanitize(data) {
        const method = data.method === LOGIN_METHOD.M3U ? LOGIN_METHOD.M3U : LOGIN_METHOD.XTREAM;
        const name = String(data.name || '').trim() || 'My Playlist';
        const streamFormat = data.streamFormat === 'm3u8' ? 'm3u8' : 'ts';

        if (method === LOGIN_METHOD.XTREAM) {
            const serverUrl = normalizeServer(data.serverUrl);
            const username = String(data.username || '').trim();
            const password = String(data.password || '');
            if (!serverUrl) return { error: 'Server URL is required.' };
            if (!username) return { error: 'Username is required.' };
            if (!password) return { error: 'Password is required.' };
            return { account: { method, name, serverUrl, username, password, streamFormat } };
        }
        // M3U method
        const m3uUrl = String(data.m3uUrl || '').trim();
        if (!/^https?:\/\//i.test(m3uUrl)) return { error: 'A valid M3U URL (http/https) is required.' };
        return { account: { method, name, m3uUrl, streamFormat } };
    }

    /**
     * Add a new account.
     * @param {Partial<Account>} data
     * @returns {{account?:Account, error?:string}}
     */
    add(data) {
        const { account, error } = this._sanitize(data);
        if (error) return { error };
        account.id = uid();
        account.createdAt = Date.now();
        account.lastUsedAt = 0;
        this._accounts.push(account);
        this._save();
        return { account: { ...account } };
    }

    /**
     * Edit an existing account. Empty password on an xtream edit keeps the
     * previous password (so the field can be left blank when editing).
     * @param {string} id @param {Partial<Account>} data
     * @returns {{account?:Account, error?:string}}
     */
    update(id, data) {
        const existing = this._accounts.find((a) => a.id === id);
        if (!existing) return { error: 'Account not found.' };

        const merged = { ...existing, ...data };
        if (existing.method === LOGIN_METHOD.XTREAM &&
            (data.password === '' || data.password == null)) {
            merged.password = existing.password; // preserve on blank edit
        }
        const { account, error } = this._sanitize(merged);
        if (error) return { error };
        account.id = existing.id;
        account.createdAt = existing.createdAt;
        account.lastUsedAt = existing.lastUsedAt;
        this._replace(account);
        return { account: { ...account } };
    }

    /** Delete an account (and clear active if it was active). */
    remove(id) {
        this._accounts = this._accounts.filter((a) => a.id !== id);
        if (this._activeId === id) this.setActive(this._accounts[0]?.id || null);
        this._save();
    }

    /** Replace one account in place and persist. */
    _replace(account) {
        const i = this._accounts.findIndex((a) => a.id === account.id);
        if (i >= 0) { this._accounts[i] = account; this._save(); }
    }

    _save() { prefs.set(LS.ACCOUNTS, this._accounts); }
}

/** Shared singleton. */
export const accounts = new AccountManager();
