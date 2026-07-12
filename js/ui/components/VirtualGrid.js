/* =====================================================================
 * VirtualGrid.js — Windowed (virtual) grid for huge lists
 * ---------------------------------------------------------------------
 * Renders only the cells currently in (or near) the viewport, so a 20k+
 * channel category costs a few dozen DOM nodes instead of thousands.
 * It owns its own focus index and D-pad navigation, because generic
 * geometric focus can't target cells that aren't in the DOM yet.
 *
 * navigate(action) returns:
 *   'moved' | 'select' | 'edge-left' | 'edge-right' | 'edge-top' | 'edge-bottom'
 * so the host screen can react at the grid's edges (e.g. jump to the
 * category list when moving left past column 0).
 * ===================================================================== */

import { el, clear } from '../../utils/dom.js';

export class VirtualGrid {
    /**
     * @param {object} cfg
     * @param {number} cfg.columns
     * @param {number} cfg.cellHeight   px height of one cell
     * @param {number} [cfg.gap]        px gap between cells (default 24)
     * @param {(item:object, index:number)=>HTMLElement} cfg.renderCell
     * @param {(item:object, index:number)=>void} [cfg.onSelect]
     * @param {number} [cfg.buffer]      extra rows above/below viewport
     */
    constructor(cfg) {
        this.columns = cfg.columns;
        this.gap = cfg.gap ?? 24;
        this.cellHeight = cfg.cellHeight;
        // One "row" is a cell plus the gap beneath it — keeps scroll math exact.
        this.rowHeight = this.cellHeight + this.gap;
        this.renderCell = cfg.renderCell;
        this.onSelect = cfg.onSelect || (() => {});
        this.buffer = cfg.buffer ?? 2;

        this.items = [];
        this.focusedIndex = 0;
        this._viewportH = 720;
        this._lastStart = -1;
        this._lastEnd = -1;

        // Scrollable container -> tall spacer -> CSS-grid layer (windowed).
        this.layer = el('div', { class: 'vgrid-layer' });
        Object.assign(this.layer.style, {
            display: 'grid',
            gridTemplateColumns: `repeat(${this.columns}, 1fr)`,
            gridAutoRows: `${this.cellHeight}px`,
            columnGap: `${this.gap}px`,
            rowGap: `${this.gap}px`
        });
        this.spacer = el('div', { class: 'vgrid-spacer' }, [this.layer]);
        this.el = el('div', { class: 'vgrid' }, [this.spacer]);
        this.el.addEventListener('scroll', () => this._render(), { passive: true });
    }

    /** Provide/refresh the item set and reset focus. */
    setItems(items, keepIndex = false) {
        this.items = items || [];
        if (!keepIndex) this.focusedIndex = 0;
        this.focusedIndex = Math.min(this.focusedIndex, Math.max(0, this.items.length - 1));
        const rows = Math.ceil(this.items.length / this.columns);
        this.spacer.style.height = `${rows * this.rowHeight}px`;
        this.el.scrollTop = 0;
        this._lastStart = -1; this._lastEnd = -1;  // force a full rebuild
        this._render();
    }

    /** Measure viewport once the element is in the DOM. */
    measure() {
        this._viewportH = this.el.clientHeight || this._viewportH;
        this._render();
    }

    get isEmpty() { return this.items.length === 0; }
    get current() { return this.items[this.focusedIndex] || null; }

    /** Give visual focus to the grid (current cell). */
    focus() {
        this._ensureVisible();
        this._render();
    }

    /** Remove the focused visual state (when leaving the grid). */
    blur() {
        const cell = this.layer.querySelector('.is-focused');
        if (cell) cell.classList.remove('is-focused');
    }

    /**
     * Handle a navigation action. See class docstring for return values.
     * @param {string} action  'left'|'right'|'up'|'down'|'ok'
     * @returns {string}
     */
    navigate(action) {
        const len = this.items.length;
        if (len === 0) return 'edge-' + (action === 'right' ? 'right' : action === 'up' ? 'top' : action === 'down' ? 'bottom' : 'left');
        const col = this.focusedIndex % this.columns;
        let idx = this.focusedIndex;

        switch (action) {
            case 'left':
                if (col === 0) return 'edge-left';
                idx -= 1; break;
            case 'right':
                if (col === this.columns - 1 || idx + 1 >= len) return 'edge-right';
                idx += 1; break;
            case 'up':
                if (idx - this.columns < 0) return 'edge-top';
                idx -= this.columns; break;
            case 'down':
                if (idx + this.columns >= len) {
                    // allow moving to the last (partial) row's item in same column
                    const lastRowStart = (Math.ceil(len / this.columns) - 1) * this.columns;
                    if (idx >= lastRowStart) return 'edge-bottom';
                    idx = Math.min(len - 1, idx + this.columns);
                } else {
                    idx += this.columns;
                }
                break;
            case 'ok':
                this.onSelect(this.current, this.focusedIndex);
                return 'select';
            default:
                return 'moved';
        }
        this.focusedIndex = idx;
        this._ensureVisible();
        this._render();
        return 'moved';
    }

    /** Scroll so the focused row is fully within the viewport. */
    _ensureVisible() {
        const row = Math.floor(this.focusedIndex / this.columns);
        const top = row * this.rowHeight;
        const bottom = top + this.rowHeight;
        if (top < this.el.scrollTop) this.el.scrollTop = top;
        else if (bottom > this.el.scrollTop + this._viewportH) this.el.scrollTop = bottom - this._viewportH;
    }

    /**
     * Render only the cells within the current window. CRITICAL for TV perf:
     * if the visible window hasn't changed (i.e. focus moved but we didn't
     * scroll to new rows), we DON'T rebuild the DOM or reload images — we just
     * move the focus highlight. Rebuilding every keypress kills a weak TV GPU.
     */
    _render() {
        const len = this.items.length;
        const scrollTop = this.el.scrollTop;
        const firstRow = Math.max(0, Math.floor(scrollTop / this.rowHeight) - this.buffer);
        const visibleRows = Math.ceil(this._viewportH / this.rowHeight) + this.buffer * 2;
        const startIdx = firstRow * this.columns;
        const endIdx = Math.min(len, startIdx + visibleRows * this.columns);

        // Fast path: window unchanged -> only update the highlight.
        if (startIdx === this._lastStart && endIdx === this._lastEnd && this.layer.childElementCount) {
            this._updateFocus();
            return;
        }
        this._lastStart = startIdx;
        this._lastEnd = endIdx;

        clear(this.layer);
        this.layer.style.transform = `translateY(${firstRow * this.rowHeight}px)`;

        for (let i = startIdx; i < endIdx; i++) {
            const item = this.items[i];
            const cell = this.renderCell(item, i);
            cell.classList.add('vgrid-cell');
            cell.dataset.i = i;
            if (i === this.focusedIndex) cell.classList.add('is-focused');
            // Trigger lazy images inside the cell (only for newly-created cells).
            const imgs = cell.querySelectorAll('img.lazy-img');
            imgs.forEach((im) => im.load && im.load());
            this.layer.appendChild(cell);
        }
    }

    /** Move the focus highlight without rebuilding cells (cheap). */
    _updateFocus() {
        const prev = this.layer.querySelector('.vgrid-cell.is-focused');
        if (prev) prev.classList.remove('is-focused');
        const cur = this.layer.querySelector('.vgrid-cell[data-i="' + this.focusedIndex + '"]');
        if (cur) cur.classList.add('is-focused');
    }
}
