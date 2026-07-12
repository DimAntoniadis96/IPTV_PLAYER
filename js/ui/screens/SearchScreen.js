/* =====================================================================
 * SearchScreen.js — Search across the catalog
 * ---------------------------------------------------------------------
 * A focusable search field (TV keyboard) plus a virtual results grid.
 * Queries are debounced; selecting a result plays it.
 * ===================================================================== */

import { View } from '../View.js';
import { el, lazyImage } from '../../utils/dom.js';
import { VirtualGrid } from '../components/VirtualGrid.js';
import { playlist } from '../../data/PlaylistService.js';
import { history } from '../../data/History.js';
import { toast } from '../components/Toast.js';
import { ACTION } from '../../input/Keys.js';
import { VIEW } from '../../core/constants.js';
import { i18n } from '../../i18n/i18n.js';
import { focus } from '../../input/FocusManager.js';

export class SearchScreen extends View {
    constructor(router, params) {
        super(router, params);
        this.zone = 'input';     // 'input' | 'results'
        this._debounce = null;
    }

    render() {
        this.input = el('input', {
            class: 'field-input search-input',
            type: 'text', placeholder: i18n.t('search.placeholder', 'Type to search…'),
            autocomplete: 'off', autocapitalize: 'off', spellcheck: false
        });
        this.input.addEventListener('input', () => this._onQuery());
        this.input.addEventListener('keydown', (e) => {
            const code = e.keyCode || e.which;
            // Down / Enter -> confirm and jump into the results grid.
            if (code === 40 || code === 13) {
                e.preventDefault(); e.stopPropagation(); this.input.blur();
                if (!this.grid.isEmpty) { this.zone = 'results'; this.field.classList.remove('is-focused'); this.grid.focus(); }
            } else if (code === 10009 || code === 27) {
                e.preventDefault(); e.stopPropagation(); this.input.blur();
            }
        });

        this.field = el('div', { class: 'form-field focusable', tabindex: '-1' }, [this.input]);
        this.field.onSelect = () => this.input.focus();

        this.grid = new VirtualGrid({
            columns: 5, cellHeight: 350, gap: 24,
            renderCell: (item) => this._renderCell(item),
            onSelect: (item) => this._open(item)
        });

        this.empty = el('div', { class: 'search-empty' }, i18n.t('search.hint', 'Search live TV, movies and series.'));
        this.resultsWrap = el('div', { class: 'search-results' }, [this.empty]);

        return el('div', { class: 'search-screen screen' }, [
            el('div', { class: 'list-header' }, [el('h1', { class: 'list-title' }, i18n.t('search.title', 'Search'))]),
            el('div', { class: 'search-bar' }, [this.field]),
            this.resultsWrap,
            el('div', { class: 'hintbar' }, [
                this._hint('OK', i18n.t('common.open', 'Open')),
                this._hint('BACK', i18n.t('common.back', 'Back'))
            ])
        ]);
    }

    _hint(key, text) {
        return el('span', { class: 'hint' }, [el('span', { class: 'hint-key' }, key), el('span', { class: 'hint-text' }, text)]);
    }

    _renderCell(item) {
        const img = lazyImage(item.logo, { alt: item.name });
        return el('div', { class: 'cell cell--poster' }, [
            el('div', { class: 'cell-thumb' }, [img]),
            el('div', { class: 'cell-name' }, item.name)
        ]);
    }

    onShow() {
        this.zone = 'input';
        // Make the field the real focus target so OK opens the TV keyboard
        // (rather than firing the previous screen's stale focused element).
        focus.setFocus(this.field);
    }

    _onQuery() {
        if (this._debounce) clearTimeout(this._debounce);
        this._debounce = setTimeout(() => this._runSearch(this.input.value), 400);
    }

    async _runSearch(q) {
        const query = (q || '').trim();
        if (query.length < 2) { this._showEmpty(i18n.t('search.hint', 'Search live TV, movies and series.')); return; }
        this._showEmpty(i18n.t('search.searching', 'Searching…'));
        try {
            const results = await playlist.search(query, { limit: 300 });
            if (!results.length) { this._showEmpty(i18n.t('search.none', 'No results found.')); return; }
            this.empty.classList.add('is-hidden');
            if (!this.grid.el.parentNode) this.resultsWrap.appendChild(this.grid.el);
            this.grid.setItems(results);
            this.grid.measure();
        } catch {
            this._showEmpty(i18n.t('search.error', 'Search failed. Try again.'));
        }
    }

    _showEmpty(text) {
        this.empty.textContent = text;
        this.empty.classList.remove('is-hidden');
        if (this.grid.el.parentNode) this.grid.el.remove();
    }

    _open(item) {
        if (!item || !item.url) return;
        history.add(item);
        this.router.navigate(VIEW.PLAYER, { item, context: { items: this.grid.items, index: this.grid.focusedIndex, section: item.section } });
    }

    onKey(action) {
        if (this.zone === 'input') {
            if (action === ACTION.DOWN && !this.grid.isEmpty) {
                this.zone = 'results';
                this.field.classList.remove('is-focused');
                this.grid.focus();
                return true;
            }
            return false; // OK handled by focus.select -> field.onSelect
        }
        // results zone
        if (action === ACTION.OK) { this.grid.navigate('ok'); return true; }
        if ([ACTION.LEFT, ACTION.RIGHT, ACTION.UP, ACTION.DOWN].includes(action)) {
            const res = this.grid.navigate(action);
            if (res === 'edge-top') { this.zone = 'input'; this.grid.blur(); this.field.classList.add('is-focused'); }
            return true;
        }
        return false;
    }

    onBack() {
        if (this.zone === 'results') { this.zone = 'input'; this.grid.blur(); this.field.classList.add('is-focused'); return true; }
        return false;
    }
}
