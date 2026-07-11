/* =====================================================================
 * AccountsScreen.js — Saved accounts list (startup screen)
 * ---------------------------------------------------------------------
 * Lists all saved accounts. OK connects; the colour keys edit (green) and
 * delete (red) the focused account; an "Add account" tile opens the form.
 * ===================================================================== */

import { View } from '../View.js';
import { el } from '../../utils/dom.js';
import { accounts } from '../../data/AccountManager.js';
import { connectAccount } from '../flows/connect.js';
import { toast } from '../components/Toast.js';
import { ACTION } from '../../input/Keys.js';
import { focus } from '../../input/FocusManager.js';
import { VIEW, LOGIN_METHOD } from '../../core/constants.js';

export class AccountsScreen extends View {
    render() {
        this.listEl = el('div', { class: 'account-list' });
        const screen = el('div', { class: 'accounts-screen' }, [
            el('div', { class: 'accounts-header' }, [
                el('span', { class: 'brand-play' }),
                el('h1', {}, 'IPTV Player'),
                el('p', { class: 'accounts-sub' }, 'Choose an account or add a new one')
            ]),
            this.listEl,
            el('div', { class: 'hintbar' }, [
                this._hint('OK', 'Connect'),
                this._hint('GREEN', 'Edit', 'green'),
                this._hint('RED', 'Delete', 'red')
            ])
        ]);
        this._buildList();
        return screen;
    }

    _hint(key, text, color = '') {
        return el('span', { class: 'hint' }, [
            el('span', { class: `hint-key ${color ? 'hint-key--' + color : ''}` }, key),
            el('span', { class: 'hint-text' }, text)
        ]);
    }

    _buildList() {
        this.listEl.innerHTML = '';
        const list = accounts.list();

        for (const acc of list) {
            const meta = acc.method === LOGIN_METHOD.XTREAM ? acc.serverUrl : 'M3U playlist';
            const card = el('div', { class: 'account-card focusable', tabindex: '-1', dataset: { id: acc.id } }, [
                el('div', { class: 'account-icon' }, [el('span', { class: 'brand-play brand-play--sm' })]),
                el('div', { class: 'account-info' }, [
                    el('div', { class: 'account-name' }, acc.name),
                    el('div', { class: 'account-meta' }, meta)
                ])
            ]);
            card.onSelect = () => connectAccount(this.router, acc);
            this.listEl.appendChild(card);
        }

        // "Add account" tile.
        const add = el('div', { class: 'account-card account-card--add focusable', tabindex: '-1' }, [
            el('div', { class: 'account-icon' }, '+'),
            el('div', { class: 'account-info' }, [el('div', { class: 'account-name' }, 'Add account')])
        ]);
        add.onSelect = () => this.router.navigate(VIEW.LOGIN);
        this.listEl.appendChild(add);
    }

    /** Colour-key shortcuts operate on the focused account card. */
    onKey(action) {
        const el = focus.current;
        const id = el && el.dataset ? el.dataset.id : null;
        if (!id) return false;

        if (action === ACTION.GREEN) {
            this.router.navigate(VIEW.LOGIN, { accountId: id });
            return true;
        }
        if (action === ACTION.RED) {
            this._confirmDelete(id);
            return true;
        }
        return false;
    }

    _confirmDelete(id) {
        const acc = accounts.get(id);
        if (!acc) return;
        // Simple two-press confirm via toast to avoid a modal dependency here.
        if (this._pendingDelete === id) {
            accounts.remove(id);
            this._pendingDelete = null;
            toast('Account deleted', 'success');
            this._buildList();
            focus.focusFirst(this.el);
        } else {
            this._pendingDelete = id;
            toast(`Press RED again to delete "${acc.name}"`, 'warn', 2500);
            setTimeout(() => { if (this._pendingDelete === id) this._pendingDelete = null; }, 2600);
        }
    }

    onShow() { focus.focusFirst(this.el); }

    onBack() { return true; } // root screen: ignore Back (use EXIT to quit)
}
