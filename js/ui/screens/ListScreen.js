/* =====================================================================
 * ListScreen.js — Categories sidebar + virtual grid of streams
 * ---------------------------------------------------------------------
 * Drives Live TV, Movies, Series, Favorites and Recently-watched. Two
 * focus zones: the category list (left) and the grid (right). Series items
 * expand into their episodes in-place. Selecting a playable item opens the
 * player with the current grid as its channel-up/down context.
 * ===================================================================== */

import { View } from '../View.js';
import { el, clear, lazyImage } from '../../utils/dom.js';
import { VirtualGrid } from '../components/VirtualGrid.js';
import { playlist } from '../../data/PlaylistService.js';
import { favorites } from '../../data/Favorites.js';
import { history } from '../../data/History.js';
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
        this.zone = 'cats';          // 'cats' | 'grid'
        this.catIndex = 0;
        this.categories = [];
        this.seriesStack = null;     // set when viewing a series' episodes
    }

    render() {
        const cfg = gridConfig(this.section);
        this.catsEl = el('div', { class: 'cats' });
        this.grid = new VirtualGrid({
            columns: cfg.columns,
            cellHeight: cfg.cellHeight,
            gap: 24,
            renderCell: (item, i) => this._renderCell(item, i, cfg.poster),
            onSelect: (item, i) => this._open(item, i)
        });

        this.titleEl = el('h1', { class: 'list-title' }, TITLES[this.section] || 'Browse');
        const screen = el('div', { class: 'list-screen' }, [
            el('div', { class: 'list-header' }, [this.titleEl]),
            el('div', { class: 'list-body' }, [
                el('div', { class: 'cats-pane' }, [this.catsEl]),
                el('div', { class: 'grid-pane' }, [this.grid.el])
            ]),
            el('div', { class: 'hintbar' }, [
                this._hint('OK', 'Open'),
                this._hint('YELLOW', 'Favorite', 'yellow'),
                this._hint('BACK', 'Back')
            ])
        ]);
        return screen;
    }

    _hint(key, text, color = '') {
        return el('span', { class: 'hint' }, [
            el('span', { class: `hint-key ${color ? 'hint-key--' + color : ''}` }, key),
            el('span', { class: 'hint-text' }, text)
        ]);
    }

    async onMount() {
        // Favorites / Recent have no categories — one implicit list.
        if (this.section === SECTION.FAVORITES || this.section === SECTION.RECENT) {
            this.catsEl.parentNode.classList.add('is-hidden');
            const items = this.section === SECTION.FAVORITES ? favorites.list() : history.list();
            this.grid.setItems(items);
            this.zone = 'grid';
            return;
        }
        await this._loadCategories();
    }

    onShow() {
        this.grid.measure();
        if (this.zone === 'grid') this.grid.focus();
    }

    async _loadCategories() {
        try {
            this.categories = await playlist.getCategories(this.section);
        } catch {
            toast('Could not load categories.', 'error');
            this.categories = [];
        }
        this._renderCats();
        if (this.categories.length) this._selectCat(0, true);
    }

    _renderCats() {
        clear(this.catsEl);
        this.categories.forEach((cat, i) => {
            const b = el('div', { class: 'cat', dataset: { i } }, cat.name);
            if (i === this.catIndex && this.zone === 'cats') b.classList.add('is-focused');
            if (i === this.catIndex) b.classList.add('is-active');
            this.catsEl.appendChild(b);
        });
    }

    async _selectCat(i, keepZone = false) {
        this.catIndex = Math.max(0, Math.min(i, this.categories.length - 1));
        this.seriesStack = null;
        this._syncCatClasses();
        this._ensureCatVisible();
        const cat = this.categories[this.catIndex];
        if (!cat) return;
        this.grid.setItems([]); // clear while loading
        try {
            const items = await playlist.getStreams(this.section, cat.id);
            // Guard against a newer selection having superseded this load.
            if (this.categories[this.catIndex] === cat) this.grid.setItems(items);
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

    /** Build one grid cell (logo/poster + label + favorite star). */
    _renderCell(item, index, poster) {
        const img = lazyImage(item.logo, { alt: item.name });
        const fav = favorites.has(item.id)
            ? el('span', { class: 'cell-fav' }, '★') : null;
        return el('div', { class: `cell ${poster ? 'cell--poster' : 'cell--logo'}` }, [
            el('div', { class: 'cell-thumb' }, [img, fav].filter(Boolean)),
            el('div', { class: 'cell-name' }, item.name)
        ]);
    }

    /** OK on a grid item. */
    async _open(item) {
        if (!item) return;

        // A series container: load and show its episodes in the grid.
        if (this.section === SECTION.SERIES && item.isSeries && !this.seriesStack) {
            toast('Loading episodes…', 'info', 1500);
            try {
                const info = await playlist.getSeriesEpisodes(item.seriesId);
                const episodes = info.seasons.flatMap((s) =>
                    s.episodes.map((e) => ({ ...e, name: `S${s.season}E${e.episodeNum} · ${e.name}`, logo: item.logo })));
                if (!episodes.length) { toast('No episodes found.', 'warn'); return; }
                this.seriesStack = { title: item.name };
                this.titleEl.textContent = item.name;
                this.grid.setItems(episodes);
            } catch {
                toast('Could not load episodes.', 'error');
            }
            return;
        }

        // A playable item.
        if (item.url) {
            history.add(item);
            this.router.navigate(VIEW.PLAYER, {
                item,
                context: { items: this.grid.items, index: this.grid.focusedIndex, section: this.section }
            });
        }
    }

    // ---- Input ----
    onKey(action) {
        // Favorite toggle works in the grid regardless of zone.
        if (action === ACTION.YELLOW && this.zone === 'grid') {
            const it = this.grid.current;
            if (it) { const added = favorites.toggle(it); toast(added ? 'Added to favorites' : 'Removed from favorites', 'success', 1500); this.grid.focus(); }
            return true;
        }

        if (this.zone === 'cats') return this._catKey(action);
        return this._gridKey(action);
    }

    _catKey(action) {
        switch (action) {
            case ACTION.UP:   if (this.catIndex > 0) this._selectCat(this.catIndex - 1); return true;
            case ACTION.DOWN: if (this.catIndex < this.categories.length - 1) this._selectCat(this.catIndex + 1); return true;
            case ACTION.RIGHT:
            case ACTION.OK:
                if (!this.grid.isEmpty) { this.zone = 'grid'; this._syncCatClasses(); this.grid.focus(); }
                return true;
            case ACTION.LEFT:
                return true; // already leftmost pane — consume so stale focus isn't moved
            default: return false; // let Back/colour keys fall through to router
        }
    }

    _gridKey(action) {
        if (action === ACTION.OK) { this.grid.navigate('ok'); return true; }
        if ([ACTION.LEFT, ACTION.RIGHT, ACTION.UP, ACTION.DOWN].includes(action)) {
            const dir = action;
            const result = this.grid.navigate(dir);
            if (result === 'edge-left') {
                // Leave the grid back to the category list.
                this.zone = 'cats';
                this.grid.blur();
                this._syncCatClasses();
            }
            return true;
        }
        return false;
    }

    onBack() {
        // Series episodes -> back to series list.
        if (this.seriesStack) {
            this.seriesStack = null;
            this.titleEl.textContent = TITLES[this.section] || 'Browse';
            this._selectCat(this.catIndex);
            return true;
        }
        // Grid zone -> back to categories (unless categoryless section).
        if (this.zone === 'grid' && this.categories.length) {
            this.zone = 'cats';
            this.grid.blur();
            this._syncCatClasses();
            return true;
        }
        return false; // let router pop the screen
    }
}
