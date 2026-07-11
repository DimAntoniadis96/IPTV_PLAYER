/* =====================================================================
 * AuthService.js — Validate an account against its server
 * ---------------------------------------------------------------------
 * Turns raw connection outcomes into a precise, user-friendly status:
 *   ok | auth_failed | expired | server_unavailable | invalid | network
 * This drives the "proper messages" requirement on the login screen.
 * ===================================================================== */

import { getJson, streamLines, HttpError } from '../core/Http.js';
import { XtreamUrls } from '../core/UrlBuilder.js';
import { LOGIN_METHOD } from '../core/constants.js';
import { logger } from '../core/Logger.js';

const log = logger.child('Auth');

/** Result codes returned by validate(). */
export const AUTH = Object.freeze({
    OK: 'ok',
    AUTH_FAILED: 'auth_failed',
    EXPIRED: 'expired',
    UNAVAILABLE: 'server_unavailable',
    INVALID: 'invalid',
    NETWORK: 'network'
});

/** Human messages for each code (kept generic; i18n overrides in Module 9). */
const MESSAGES = {
    [AUTH.OK]: 'Connected successfully.',
    [AUTH.AUTH_FAILED]: 'Login failed. Please check your username and password.',
    [AUTH.EXPIRED]: 'This account has expired.',
    [AUTH.UNAVAILABLE]: 'Server is unavailable. Please try again later.',
    [AUTH.INVALID]: 'The server returned an invalid playlist.',
    [AUTH.NETWORK]: 'Network error. Check your internet connection.'
};

/**
 * @typedef {Object} AuthResult
 * @property {string} status   one of AUTH.*
 * @property {boolean} ok
 * @property {string} message
 * @property {object} [info]   xtream user_info/server_info when available
 */

/** Map an HttpError to an auth status. */
function classifyHttpError(err) {
    if (err instanceof HttpError) {
        if (err.kind === 'timeout' || err.kind === 'network') return AUTH.UNAVAILABLE;
        if (err.kind === 'http' && (err.status === 401 || err.status === 403)) return AUTH.AUTH_FAILED;
        if (err.kind === 'http') return AUTH.UNAVAILABLE;
    }
    return AUTH.NETWORK;
}

function result(status, info) {
    return { status, ok: status === AUTH.OK, message: MESSAGES[status] || 'Unknown error.', info };
}

/**
 * Validate an account by contacting its server.
 * @param {import('./AccountManager.js').Account} account
 * @param {object} [opts] { signal }
 * @returns {Promise<AuthResult>}
 */
export async function validate(account, opts = {}) {
    try {
        if (account.method === LOGIN_METHOD.XTREAM) {
            return await validateXtream(account, opts);
        }
        return await validateM3U(account, opts);
    } catch (err) {
        log.warn('validation error', err && err.kind, err && err.status);
        return result(classifyHttpError(err));
    }
}

/** Xtream: read player_api account info and inspect auth/status/expiry. */
async function validateXtream(account, opts) {
    const urls = new XtreamUrls(account);
    const data = await getJson(urls.accountInfo(), { signal: opts.signal });

    if (!data || !data.user_info) return result(AUTH.AUTH_FAILED);
    const u = data.user_info;

    // auth === 0 means bad credentials.
    if (Number(u.auth) === 0) return result(AUTH.AUTH_FAILED);

    // status can be 'Active', 'Expired', 'Disabled', 'Banned'…
    const status = String(u.status || '').toLowerCase();
    if (status === 'expired') return result(AUTH.EXPIRED, data);
    if (status && status !== 'active') return result(AUTH.AUTH_FAILED, data);

    // exp_date is a UNIX timestamp (string) or null for unlimited.
    if (u.exp_date) {
        const exp = Number(u.exp_date) * 1000;
        if (Number.isFinite(exp) && exp < Date.now()) return result(AUTH.EXPIRED, data);
    }
    return result(AUTH.OK, data);
}

/** M3U: fetch just enough to confirm it's a real playlist (#EXTM3U header). */
async function validateM3U(account, opts) {
    let sawHeader = false;
    let sawEntry = false;
    let checked = 0;
    const stop = new AbortController();
    // Chain external signal.
    if (opts.signal) opts.signal.addEventListener('abort', () => stop.abort(), { once: true });

    try {
        await streamLines(account.m3uUrl, (line) => {
            const t = line.trim();
            if (!t) return;
            checked += 1;
            if (t.toUpperCase().startsWith('#EXTM3U')) sawHeader = true;
            if (t.startsWith('#EXTINF')) sawEntry = true;
            // We only need the header + first entry to validate; then abort.
            if (sawHeader && sawEntry) stop.abort();
            if (checked > 50 && !sawHeader) stop.abort(); // clearly not an M3U
        }, { signal: stop.signal });
    } catch (err) {
        // A deliberate abort after we've seen the header is success.
        if (err instanceof HttpError && err.kind === 'abort') {
            // fall through to evaluation below
        } else {
            return result(classifyHttpError(err));
        }
    }

    if (sawHeader) return result(AUTH.OK);
    return result(AUTH.INVALID);
}

export { MESSAGES as AUTH_MESSAGES };
