/* =====================================================================
 * SettingsScreen.js — Language, theme, cache, reconnect, reload, version
 * ===================================================================== */

import { View } from '../View.js';
import { el } from '../../utils/dom.js';
import { i18n } from '../../i18n/i18n.js';
import { theme } from '../../utils/theme.js';
import { prefs } from '../../core/Prefs.js';
import { LS, APP_VERSION, LOGIN_METHOD } from '../../core/constants.js';
import { accounts } from '../../data/AccountManager.js';
import { playlist } from '../../data/PlaylistService.js';
import { connectAccount } from '../flows/connect.js';
import { showLoading, hideLoading } from '../components/Loading.js';
import { toast } from '../components/Toast.js';
import { focus } from '../../input/FocusManager.js';

export class SettingsScreen extends View {
    constructor(router, params) {
        super(router, params);
        this.settings = prefs.get(LS.SETTINGS, { autoUpdate: true });
    }

    render() {
        this.listEl = el('div', { class: 'settings-list' });
        const screen = el('div', { class: 'settings-screen screen' }, [
            el('div', { class: 'list-header' }, [el('h1', { class: 'list-title' }, i18n.t('settings.title', 'Settings'))]),
            this.listEl
        ]);
        this._build();
        return screen;
    }

    _build() {
        this.listEl.innerHTML = '';
        const acc = accounts.getActive();

        this._row('settings.language', 'Language', i18n.currentLabel, () => {
            i18n.cycle();
            toast(i18n.t('settings.languageChanged', 'Language updated'), 'success', 1500);
            this.rebuild();
        });

        this._row('settings.theme', 'Theme', theme.currentLabel, () => {
            theme.cycle();
            this.rebuild();
        });

        this._row('settings.autoUpdate', 'Automatic updates', this.settings.autoUpdate ? 'On' : 'Off', () => {
            this.settings.autoUpdate = !this.settings.autoUpdate;
            prefs.set(LS.SETTINGS, this.settings);
            this.rebuild();
        });

        this._row('settings.reload', 'Reload playlist', '', async () => {
            if (!acc) return;
            showLoading(i18n.t('settings.reloading', 'Reloading playlist…'));
            try { await playlist.load(acc, { force: true }); toast(i18n.t('settings.reloaded', 'Playlist reloaded'), 'success'); }
            catch { toast(i18n.t('settings.reloadFailed', 'Reload failed'), 'error'); }
            finally { hideLoading(); }
        });

        this._row('settings.clearCache', 'Clear cache', '', async () => {
            await playlist.clearCache();
            toast(i18n.t('settings.cacheCleared', 'Cache cleared'), 'success');
        });

        this._row('settings.reconnect', 'Reconnect', '', () => {
            if (acc) connectAccount(this.router, acc);
        });

        // Account summary (read-only).
        if (acc) {
            const meta = acc.method === LOGIN_METHOD.XTREAM ? acc.serverUrl : 'M3U playlist';
            this._info('settings.account', 'Account', `${acc.name} · ${meta}`);
        }
        this._info('settings.version', 'App version', APP_VERSION);
    }

    _row(key, fallback, value, onSelect) {
        const valEl = el('div', { class: 'setting-value' }, value || '');
        const row = el('div', { class: 'setting-row focusable', tabindex: '-1' }, [
            el('div', { class: 'setting-label' }, i18n.t(key, fallback)),
            valEl
        ]);
        row.onSelect = onSelect;
        this.listEl.appendChild(row);
        return row;
    }

    _info(key, fallback, value) {
        this.listEl.appendChild(el('div', { class: 'setting-row' }, [
            el('div', { class: 'setting-label' }, i18n.t(key, fallback)),
            el('div', { class: 'setting-value' }, value)
        ]));
    }

    /** Rebuild the list, preserving focus position where possible. */
    rebuild() {
        const idx = Array.from(this.listEl.children).indexOf(focus.current);
        this._build();
        const rows = this.listEl.querySelectorAll('.focusable');
        const target = rows[Math.max(0, Math.min(idx, rows.length - 1))];
        if (target) focus.setFocus(target);
    }

    onShow() { focus.focusFirst(this.el); }
}
