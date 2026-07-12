/* =====================================================================
 * ListScreen.js — Categories + grid with TWO-LEVEL search
 * ---------------------------------------------------------------------
 * Drives Live TV, Movies, Series, Favorites and Recently-watched.
 *
 * Four focus zones (arranged like a cross):
 *   catSearch  — filter the CATEGORY list (e.g. find "Greek Series")
 *   cats       — the category list
 *   gridSearch — filter items WITHIN the selected category
 *   grid       — the item grid (virtual-scrolled)
 *
 * Navigation:
 *   catSearch  ↓ cats   → gridSearch
 *   cats       ↑ (top) catSearch   →/OK grid
 *   gridSearch ↓ grid   ← cats   ↑ catSearch
 *   grid       ← (col0) cats   ↑ (top) gridSearch
 * Favorites/Recent have no categories, so only gridSearch + grid are used.
 * ===================================================================== */

import { View } from '../View.js';
import { el, clear, lazyImage } from '../../utils/dom.js';
import { VirtualGrid } from '../components/VirtualGrid.js';
import { playlist } from '../../data/PlaylistService.js';
import { favorites } from '../../data/Favorites.js';
import { history } from '../../data/History.js';
import { normalize } from '../../utils/format.js';
import { SECTION, VIEW } from '../../core/constants.js';
import { ACTION } from '../../input/Keys.js';
import { toast } from '../components/Toast.js';

const TITLES = {
    [SECTION.LIVE]: 'Live TV', [SECTION.MOVIE]: 'Movies', [SECTION.SERIES]: 'Series',
    [SECTION.FAVORITES]: 'Favorites', [SECTION.RECENT]: 'Recently watched'
};

/** Grid geometry per section. */
function gridConfig(section) {
    if (section === SECTION.MOVIE || section === SECTION.SERIES) {
        return { columns: 7, cellHeight: 300, poster: true };
    }
    return { columns: 5, cellHeight: 190, poster: false };
}

export class ListScreen extends View {
    constructor(router, params) {
        super(router, params);
        this.section = params.section;
        this.hasCats = [SECTION.LIVE, SECTION.MOVIE, SECTION.SERIES].includes(this.section);
        this.zone = this.hasCats ? 'cats' : 'grid';
        this.catIndex = 0;
        this.allCategories = [];   // full category list (unfiltered)
        this.categories = [];      // currently displayed (filtered) categories
        this.allItems = [];        // full items of the selected category
        this.seriesStack = null;   // set when viewing a series' episodes
        this._catDeb = null;
        this._itemDeb = null;
    }

    render() {
        const cfg = gridConfig(this.section);
        this.catsEl = el('div', { class: 'cats' });
        this.grid = new VirtualGrid({
            columns: cfg.columns, cellHeight: cfg.cellHeight, gap: 24,
            renderCell: (item, i) => this._renderCell(item, i, cfg.poster),
            onSelect: (item) => this._open(item)
        });

        // Left pane: category search + category list.
        const catSearch = this._searchField('Search categories…',
            (v) => this._debounceCat(v),
            (dir) => {
                if (dir === 'up') this._setZone('catSearch');
                else this._setZone(this.categories.length ? 'cats' : 'gridSearch'); // down/back
            });
        this.catSearchField = catSearch.field;
        this.catSearchInput = catSearch.input;
        this.catsPane = el('div', { class: 'cats-pane' }, [this.catSearchField, this.catsEl]);

        // Right pane: in-category search + grid.
        const itemSearch = this._searchField('Search in this category…',
            (v) => this._debounceItem(v),
            (dir) => {
                if (dir === 'up') this._setZone(this.hasCats ? 'catSearch' : 'gridSearch');
                else if (dir === 'back') this._setZone(this.hasCats ? 'cats' : (this.grid.isEmpty ? 'gridSearch' : 'grid'));
                else this._setZone(this.grid.isEmpty ? 'gridSearch' : 'grid'); // down -> results
            });
        this.itemSearchField = itemSearch.field;
        this.itemSearchInput = itemSearch.input;
        this.gridPane = el('div', { class: 'grid-pane' }, [this.itemSearchField, this.grid.el]);

        this.titleEl = el('h1', { class: 'list-title' }, TITLES[this.section] || 'Browse');
        return el('div', { class: 'list-screen' }, [
            el('div', { class: 'list-header' }, [this.titleEl]),
            el('div', { class: 'list-body' }, [this.catsPane, this.gridPane]),
            el('div', { class: 'hintbar' }, [
                this._hint('⌕', 'Search'),
                this._hint('OK', 'Open'),
                this._hint('YELLOW', 'Favorite', 'yellow'),
                this._hint('BACK', 'Back')
            ])
        ]);
    }

    _hint(key, text, color = '') {
        return el('span', { class: 'hint' }, [
            el('span', { class: `hint-key ${color ? 'hint-key--' + color : ''}` }, key),
            el('span', { class: 'hint-text' }, text)
        ]);
    }

    /**
     * A focusable search box wrapping a native input (opens the TV keyboard).
     * While editing, Down/Enter leaves the field to the results, Up moves up,
     * Back/Return closes it — so you're never "trapped" typing.
     * @param {string} placeholder
     * @param {(v:string)=>void} onInput
     * @param {(dir:'down'|'up'|'back')=>void} onExit
     */
    _searchField(placeholder, onInput, onExit) {
        const input = el('input', {
            class: 'field-input search-input', type: 'text', placeholder,
            autocomplete: 'off', autocapitalize: 'off', spellcheck: false
        });
        input.addEventListener('input', () => onInput(input.value));
        input.addEventListener('keydown', (e) => {
            const code = e.keyCode || e.which;
            // Down / Enter -> confirm and move into results.
            if (code === 40 || code === 13) { e.preventDefault(); e.stopPropagation(); input.blur(); onExit('down'); }
            // Up -> leave upward.
            else if (code === 38) { e.preventDefault(); e.stopPropagation(); input.blur(); onExit('up'); }
            // Return (TV back) / Escape -> just close the field.
            else if (code === 10009 || code === 27) { e.preventDefault(); e.stopPropagation(); input.blur(); onExit('back'); }
        });
        const field = el('div', { class: 'pane-search focusable', tabindex: '-1' }, [
            el('span', { class: 'pane-search-icon' }, '⌕'),
            input
        ]);
        field.onSelect = () => input.focus();
        return { field, input };
    }

    async onMount() {
        if (!this.hasCats) {
            this.catsPane.classList.add('is-hidden');
            this.allItems = this.section === SECTION.FAVORITES ? favorites.list() : history.list();
            this.grid.setItems(this.allItems);
            this.zone = this.allItems.length ? 'grid' : 'gridSearch';
            return;
        }
        await this._loadCategories();
    }

    onShow() {
        this.grid.measure();
        this._setZone(this.zone);
    }

    onUnmount() {
        if (this._catDeb) clearTimeout(this._catDeb);
        if (this._itemDeb) clearTimeout(this._itemDeb);
    }

    // ---------------- Categories ----------------

    async _loadCategories() {
        try {
            this.allCategories = await playlist.getCategories(this.section);
        } catch {
            toast('Could not load categories.', 'error');
            this.allCategories = [];
        }
        this.categories = this.allCategories.slice();
        this._renderCats();
        if (this.categories.length) { this.catIndex = 0; await this._selectCat(0); }
        this._setZone('cats');
    }

    _renderCats() {
        clear(this.catsEl);
        if (!this.categories.length) {
            this.catsEl.appendChild(el('div', { class: 'cats-empty' }, 'No matching categories'));
            return;
        }
        this.categories.forEach((cat, i) => {
            const b = el('div', { class: 'cat', dataset: { i } }, cat.name);
            if (i === this.catIndex && this.zone === 'cats') b.classList.add('is-focused');
            if (i === this.catIndex) b.classList.add('is-active');
            this.catsEl.appendChild(b);
        });
    }

    /** Filter the category list by name (level-1 search). */
    _debounceCat(value) {
        if (this._catDeb) clearTimeout(this._catDeb);
        this._catDeb = setTimeout(() => this._filterCats(value), 180);
    }

    _filterCats(value) {
        const q = normalize(value);
        this.categories = q
            ? this.allCategories.filter((c) => normalize(c.name).includes(q))
            : this.allCategories.slice();
        this.catIndex = 0;
        this._renderCats();
        if (this.categories.length) this._selectCat(0);
        else { this.allItems = []; this.grid.setItems([]); }
    }

    async _selectCat(i) {
        this.catIndex = Math.max(0, Math.min(i, this.categories.length - 1));
        this.seriesStack = null;
        this._syncCatClasses();
        this._ensureCatVisible();
        // Reset the in-category search when the category changes.
        if (this.itemSearchInput) this.itemSearchInput.value = '';
        const cat = this.categories[this.catIndex];
        if (!cat) return;
        this.allItems = [];
        this.grid.setItems([]);
        try {
            const items = await playlist.getStreams(this.section, cat.id);
            if (this.categories[this.catIndex] === cat) {
                this.allItems = items;
                this.grid.setItems(items);
            }
        } catch {
            toast('Could not load this category.', 'error');
        }
    }

    _syncCatClasses() {
        this.catsEl.querySelectorAll('.cat').forEach((b) => {
            const i = Number(b.dataset.i);
            b.classList.toggle('is-active', i === this.catIndex);
            b.classList.toggle('is-focused', i === this.catIndex && this.zone === 'cats');
        });
    }

    _ensureCatVisible() {
        const node = this.catsEl.querySelector(`.cat[data-i="${this.catIndex}"]`);
        if (node && node.scrollIntoView) node.scrollIntoView({ block: 'nearest' });
    }

    // ---------------- In-category item search (level-2) ----------------

    _debounceItem(value) {
        if (this._itemDeb) clearTimeout(this._itemDeb);
        this._itemDeb = setTimeout(() => this._filterItems(value), 180);
    }

    _filterItems(value) {
        const q = normalize(value);
        const items = q ? this.allItems.filter((it) => normalize(it.name).includes(q)) : this.allItems;
        this.grid.setItems(items);
    }

    // ---------------- Grid cell + open ----------------

    _renderCell(item, index, poster) {
        const img = lazyImage(item.logo, { alt: item.name });
        const fav = favorites.has(item.id) ? el('span', { class: 'cell-fav' }, '★') : null;
        return el('div', { class: `cell ${poster ? 'cell--poster' : 'cell--logo'}` }, [
            el('div', { class: 'cell-thumb' }, [img, fav].filter(Boolean)),
            el('div', { class: 'cell-name' }, item.name)
        ]);
    }

    async _open(item) {
        if (!item) return;

        if (this.section === SECTION.SERIES && item.isSeries && !this.seriesStack) {
            toast('Loading episodes…', 'info', 1500);
            try {
                const info = await playlist.getSeriesEpisodes(item.seriesId);
                const episodes = info.seasons.flatMap((s) =>
                    s.episodes.map((e) => ({ ...e, name: `S${s.season}E${e.episodeNum} · ${e.name}`, logo: item.logo })));
                if (!episodes.length) { toast('No episodes found.', 'warn'); return; }
                this.seriesStack = { title: item.name };
                this.titleEl.textContent = item.name;
                this.allItems = episodes;
                if (this.itemSearchInput) this.itemSearchInput.value = '';
                this.grid.setItems(episodes);
            } catch {
                toast('Could not load episodes.', 'error');
            }
            return;
        }

        if (item.url) {
            history.add(item);
            this.router.navigate(VIEW.PLAYER, {
                item,
                context: { items: this.grid.items, index: this.grid.focusedIndex, section: this.section }
            });
        }
    }

    // ---------------- Zones / input ----------------

    _setZone(zone) {
        this.zone = zone;
        if (this.catSearchField) this.catSearchField.classList.toggle('is-focused', zone === 'catSearch');
        if (this.itemSearchField) this.itemSearchField.classList.toggle('is-focused', zone === 'gridSearch');
        this._syncCatClasses();
        if (zone === 'grid') this.grid.focus(); else this.grid.blur();
    }

    onKey(action) {
        if (action === ACTION.YELLOW && this.zone === 'grid') {
            const it = this.grid.current;
            if (it) { const added = favorites.toggle(it); toast(added ? 'Added to favorites' : 'Removed from favorites', 'success', 1500); this.grid.focus(); }
            return true;
        }
        switch (this.zone) {
            case 'catSearch': return this._catSearchKey(action);
            case 'cats': return this._catKey(action);
            case 'gridSearch': return this._gridSearchKey(action);
            case 'grid': return this._gridKey(action);
            default: return false;
        }
    }

    _catSearchKey(action) {
        switch (action) {
            case ACTION.OK: this.catSearchInput.focus(); return true;
            case ACTION.DOWN: this._setZone(this.categories.length ? 'cats' : 'gridSearch'); return true;
            case ACTION.RIGHT: this._setZone('gridSearch'); return true;
            case ACTION.LEFT:
            case ACTION.UP: return true;
            default: return false;
        }
    }

    _catKey(action) {
        switch (action) {
            case ACTION.UP:
                if (this.catIndex > 0) this._selectCat(this.catIndex - 1);
                else this._setZone('catSearch');
                return true;
            case ACTION.DOWN:
                if (this.catIndex < this.categories.length - 1) this._selectCat(this.catIndex + 1);
                return true;
            case ACTION.RIGHT:
            case ACTION.OK:
                if (!this.grid.isEmpty) this._setZone('grid');
                else this._setZone('gridSearch');
                return true;
            case ACTION.LEFT:
                return true;
            default: return false;
        }
    }

    _gridSearchKey(action) {
        switch (action) {
            case ACTION.OK: this.itemSearchInput.focus(); return true;
            case ACTION.DOWN: if (!this.grid.isEmpty) this._setZone('grid'); return true;
            case ACTION.LEFT: if (this.hasCats) this._setZone('cats'); return true;
            case ACTION.UP: if (this.hasCats) this._setZone('catSearch'); return true;
            case ACTION.RIGHT: return true;
            default: return false;
        }
    }

    _gridKey(action) {
        if (action === ACTION.OK) { this.grid.navigate('ok'); return true; }
        if ([ACTION.LEFT, ACTION.RIGHT, ACTION.UP, ACTION.DOWN].includes(action)) {
            const result = this.grid.navigate(action);
            if (result === 'edge-left') this._setZone(this.hasCats ? 'cats' : 'gridSearch');
            else if (result === 'edge-top') this._setZone('gridSearch');
            return true;
        }
        return false;
    }

    onBack() {
        // Series episodes -> back to the series list.
        if (this.seriesStack) {
            this.seriesStack = null;
            this.titleEl.textContent = TITLES[this.section] || 'Browse';
            if (this.itemSearchInput) this.itemSearchInput.value = '';
            this._selectCat(this.catIndex);
            this._setZone('grid');
            return true;
        }
        // From grid / grid-search -> back to categories.
        if ((this.zone === 'grid' || this.zone === 'gridSearch') && this.hasCats) {
            this._setZone('cats');
            return true;
        }
        // From category search -> back to category list.
        if (this.zone === 'catSearch') { this._setZone('cats'); return true; }
        return false; // let the router pop the screen
    }
}
