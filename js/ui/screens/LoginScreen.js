/* =====================================================================
 * LoginScreen.js — Add / edit an account (both login methods)
 * ---------------------------------------------------------------------
 * Method 1: Server URL + Username + Password + Playlist name (Xtream).
 * Method 2: Paste a complete M3U URL.
 * Fields are focusable; pressing OK on a text field opens the TV keyboard.
 * ===================================================================== */

import { View } from '../View.js';
import { el, clear } from '../../utils/dom.js';
import { accounts } from '../../data/AccountManager.js';
import { connectAccount } from '../flows/connect.js';
import { toast } from '../components/Toast.js';
import { LOGIN_METHOD, VIEW } from '../../core/constants.js';
import { focus } from '../../input/FocusManager.js';

export class LoginScreen extends View {
    constructor(router, params) {
        super(router, params);
        const editing = params.accountId ? accounts.get(params.accountId) : null;
        this.editing = editing;
        this.model = editing ? { ...editing } : {
            name: '', method: LOGIN_METHOD.XTREAM,
            serverUrl: '', username: '', password: '',
            m3uUrl: '', streamFormat: 'ts'
        };
        // Never prefill the password field on edit; blank keeps the old one.
        if (editing) this.model.password = '';
    }

    render() {
        this.form = el('div', { class: 'login-form' });
        const wrap = el('div', { class: 'login-screen' }, [
            el('div', { class: 'login-header' }, [
                el('span', { class: 'brand-play' }),
                el('h1', { class: 'login-title' }, this.editing ? 'Edit account' : 'Add account')
            ]),
            this.form
        ]);
        this._buildForm();
        return wrap;
    }

    /** (Re)build fields according to the selected method. */
    _buildForm() {
        clear(this.form);

        // Playlist name (always shown).
        this.form.appendChild(this._textField('name', 'Playlist name', 'e.g. My Playlist'));

        // Method toggle.
        this.form.appendChild(this._toggle('method', 'Login method', [
            { value: LOGIN_METHOD.XTREAM, label: 'Server + Login' },
            { value: LOGIN_METHOD.M3U, label: 'M3U URL' }
        ], () => this._buildForm()));

        if (this.model.method === LOGIN_METHOD.XTREAM) {
            this.form.appendChild(this._textField('serverUrl', 'Server URL', 'https://server.com:8080'));
            this.form.appendChild(this._textField('username', 'Username', 'username'));
            this.form.appendChild(this._textField('password', 'Password', '••••••', true));
        } else {
            this.form.appendChild(this._textField('m3uUrl', 'M3U playlist URL', 'https://server.com/get.php?...'));
        }

        this.form.appendChild(this._toggle('streamFormat', 'Live stream format', [
            { value: 'ts', label: 'MPEG-TS' },
            { value: 'm3u8', label: 'HLS (m3u8)' }
        ]));

        // Actions.
        const actions = el('div', { class: 'login-actions' }, [
            this._button(this.editing ? 'Save & Connect' : 'Connect', 'primary', () => this._submit()),
            this._button('Cancel', 'ghost', () => this.router.back())
        ]);
        this.form.appendChild(actions);
    }

    /** A focusable text field wrapping a native input (for the TV keyboard). */
    _textField(key, label, placeholder, isPassword = false) {
        const input = el('input', {
            class: 'field-input',
            type: isPassword ? 'password' : 'text',
            value: this.model[key] || '',
            placeholder,
            autocomplete: 'off', autocapitalize: 'off', spellcheck: false
        });
        input.addEventListener('blur', () => { this.model[key] = input.value; });
        input.addEventListener('keydown', (e) => {
            const code = e.keyCode || e.which;
            // Down / Enter -> confirm and move to the next control.
            if (code === 40 || code === 13) { e.preventDefault(); e.stopPropagation(); input.blur(); focus.move('down'); }
            else if (code === 38) { e.preventDefault(); e.stopPropagation(); input.blur(); focus.move('up'); }
            else if (code === 10009 || code === 461 || code === 27) { e.preventDefault(); e.stopPropagation(); input.blur(); }
        });

        const field = el('div', { class: 'form-field focusable', tabindex: '-1' }, [
            el('label', { class: 'field-label' }, label),
            input
        ]);
        // OK on the field opens the keyboard by focusing the native input.
        field.onSelect = () => input.focus();
        return field;
    }

    /** A focusable segmented toggle bound to a model key. */
    _toggle(key, label, options, onChange) {
        const seg = el('div', { class: 'seg' });
        const sync = () => {
            seg.querySelectorAll('.seg-opt').forEach((b) => {
                b.classList.toggle('is-active', b.dataset.value === String(this.model[key]));
            });
        };
        options.forEach((opt) => {
            const b = el('div', { class: 'seg-opt focusable', tabindex: '-1', dataset: { value: opt.value } }, opt.label);
            b.onSelect = () => { this.model[key] = opt.value; sync(); if (onChange) onChange(); };
            seg.appendChild(b);
        });
        sync();
        return el('div', { class: 'form-field' }, [
            el('label', { class: 'field-label' }, label),
            seg
        ]);
    }

    _button(label, variant, onSelect) {
        const b = el('button', { class: `btn btn--${variant} focusable`, tabindex: '-1' }, label);
        b.onSelect = onSelect;
        b.addEventListener('click', onSelect);
        return b;
    }

    /** Validate + persist + connect. */
    async _submit() {
        // Flush any focused input.
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();

        const result = this.editing
            ? accounts.update(this.editing.id, this.model)
            : accounts.add(this.model);

        if (result.error) { toast(result.error, 'error'); return; }
        await connectAccount(this.router, result.account);
    }

    onShow() { focus.focusFirst(this.el); }

    onBack() { this.router.back(); return true; }
}
