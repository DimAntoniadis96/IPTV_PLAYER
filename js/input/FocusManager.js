/* =====================================================================
 * FocusManager.js — Spatial (D-pad) focus navigation
 * ---------------------------------------------------------------------
 * No mouse on a TV, so focus is driven entirely by the remote's arrows +
 * OK. Any element with class "focusable" participates. Movement picks the
 * nearest focusable in the pressed direction using bounding-box geometry,
 * so layouts work without hand-wiring every neighbour.
 *
 * Elements can opt into hooks via data attributes / properties:
 *   el.onSelect  -> called on OK
 *   el.onFocus   -> called when focused
 *   [data-focus-group] -> optional grouping hint (kept simple here)
 * ===================================================================== */

import { ACTION } from './Keys.js';
import { bus } from '../core/EventBus.js';

const FOCUSABLE = '.focusable:not([disabled]):not(.is-hidden)';

class FocusManager {
    constructor() {
        /** @type {HTMLElement|null} */
        this.current = null;
        this.root = document.getElementById('app') || document.body;
    }

    /** Set the container to search within (usually the active screen). */
    setRoot(root) { this.root = root || document.body; }

    /**
     * Collect visible focusable elements under the current root, each paired
     * with its measured rect. We read every rect exactly once per keypress
     * (measuring here and reusing the value avoids a second forced layout in
     * move(), which matters on weak TV hardware with many focusable rows).
     */
    _candidates() {
        const list = this.root.querySelectorAll(FOCUSABLE);
        const out = [];
        for (const el of list) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) out.push({ el, r });
        }
        return out;
    }

    /** Center point of a DOMRect. */
    _rectCenter(r) {
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    /**
     * Focus a specific element, updating classes and firing hooks.
     * @param {HTMLElement|null} el
     */
    setFocus(el) {
        if (!el || el === this.current) { if (el) this._ensureVisible(el); return; }
        if (this.current) {
            this.current.classList.remove('is-focused');
            if (typeof this.current.onBlur === 'function') this.current.onBlur();
        }
        this.current = el;
        el.classList.add('is-focused');
        this._ensureVisible(el);
        if (typeof el.onFocus === 'function') el.onFocus();
        bus.emit('focus:changed', el);
    }

    /** Focus the first focusable (optionally within a container). */
    focusFirst(container) {
        const root = container || this.root;
        const el = root.querySelector(FOCUSABLE);
        if (el) this.setFocus(el);
        return el;
    }

    /** Re-focus current if it left the DOM (after a re-render). */
    refocus() {
        if (!this.current || !document.contains(this.current)) {
            this.current = null;
            this.focusFirst();
        }
    }

    /**
     * Handle a semantic action. Returns true if it was a navigation/OK key.
     * Wired as RemoteControl's default (fallback) handler.
     * @param {string} action
     */
    handle(action) {
        switch (action) {
            case ACTION.LEFT:  this.move('left');  return true;
            case ACTION.RIGHT: this.move('right'); return true;
            case ACTION.UP:    this.move('up');    return true;
            case ACTION.DOWN:  this.move('down');  return true;
            case ACTION.OK:    this.select();      return true;
            default: return false;
        }
    }

    /** Activate the focused element. */
    select() {
        const el = this.current;
        if (!el) return;
        if (typeof el.onSelect === 'function') el.onSelect();
        else el.click();
    }

    /**
     * Move focus in a direction to the geometrically nearest candidate.
     * @param {'left'|'right'|'up'|'down'} dir
     */
    move(dir) {
        if (!this.current) { this.focusFirst(); return; }
        const from = this._rectCenter(this.current.getBoundingClientRect());
        let best = null;
        let bestScore = Infinity;

        for (const cand of this._candidates()) {
            if (cand.el === this.current) continue;
            const to = this._rectCenter(cand.r);
            const dx = to.x - from.x;
            const dy = to.y - from.y;

            // Must be predominantly in the requested direction.
            let primary, cross;
            if (dir === 'left') { if (dx >= -2) continue; primary = -dx; cross = Math.abs(dy); }
            else if (dir === 'right') { if (dx <= 2) continue; primary = dx; cross = Math.abs(dy); }
            else if (dir === 'up') { if (dy >= -2) continue; primary = -dy; cross = Math.abs(dx); }
            else { if (dy <= 2) continue; primary = dy; cross = Math.abs(dx); }

            // Penalise cross-axis misalignment heavily so we keep to a row/column.
            const score = primary + cross * 2;
            if (score < bestScore) { bestScore = score; best = cand.el; }
        }

        if (best) this.setFocus(best);
    }

    /** Keep the focused element within view (delegates to native scroll). */
    _ensureVisible(el) {
        if (typeof el.scrollIntoViewIfNeeded === 'function') {
            el.scrollIntoViewIfNeeded(false);
        } else if (typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    }
}

export const focus = new FocusManager();
export { FocusManager };
