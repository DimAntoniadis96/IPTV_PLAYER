/* =====================================================================
 * connect.js — Shared "connect to account" flow
 * ---------------------------------------------------------------------
 * Validates an account, loads its playlist (with progress feedback) and
 * navigates to Home. Used by both the accounts list and the login form,
 * and by auto-reconnect on startup.
 * ===================================================================== */

import { validate, AUTH } from '../../data/AuthService.js';
import { playlist } from '../../data/PlaylistService.js';
import { accounts } from '../../data/AccountManager.js';
import { showLoading, updateLoading, hideLoading } from '../components/Loading.js';
import { toast } from '../components/Toast.js';
import { bus } from '../../core/EventBus.js';
import { EVENT, VIEW, LOGIN_METHOD } from '../../core/constants.js';
import { logger } from '../../core/Logger.js';

const log = logger.child('Connect');

/**
 * Connect to an account and, on success, open Home.
 * @param {import('../Router.js').Router} router
 * @param {import('../../data/AccountManager.js').Account} account
 * @param {{silent?:boolean}} [opts]  silent = auto-reconnect (softer errors)
 * @returns {Promise<boolean>} success
 */
export async function connectAccount(router, account, opts = {}) {
    showLoading('Connecting…');

    // Progress feedback while a large M3U downloads.
    const off = bus.on(EVENT.PLAYLIST_PROGRESS, (p) => {
        if (p && p.mb != null) updateLoading(`Downloading playlist… ${p.mb} MB`);
    });

    try {
        const res = await validate(account);
        if (!res.ok) {
            hideLoading();
            if (!opts.silent) toast(res.message, res.status === AUTH.EXPIRED ? 'warn' : 'error', 4500);
            return false;
        }

        updateLoading(account.method === LOGIN_METHOD.M3U ? 'Loading playlist…' : 'Loading categories…');
        await playlist.load(account, { force: false });

        accounts.setActive(account.id);
        hideLoading();
        router.replaceAll(VIEW.HOME);
        return true;
    } catch (err) {
        log.warn('connect failed', err && err.message);
        hideLoading();
        if (!opts.silent) toast('Could not load the playlist. Please try again.', 'error', 4500);
        return false;
    } finally {
        off();
    }
}
