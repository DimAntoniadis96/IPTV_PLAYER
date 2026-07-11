/* =====================================================================
 * Toast.js — Transient message overlay
 * ---------------------------------------------------------------------
 * Listens for EVENT.TOAST and shows a brief message. Any module can call
 * `toast(message, type)` or emit EVENT.TOAST with { message, type }.
 * ===================================================================== */

import { bus } from '../../core/EventBus.js';
import { EVENT } from '../../core/constants.js';
import { el } from '../../utils/dom.js';

let root = null;

/** Initialise the toast system (called once at bootstrap). */
export function initToasts() {
    root = document.getElementById('toast-root');
    bus.on(EVENT.TOAST, ({ message, type, duration } = {}) => show(message, type, duration));
}

/**
 * Show a toast.
 * @param {string} message
 * @param {'info'|'success'|'warn'|'error'} [type]
 * @param {number} [duration] ms
 */
export function show(message, type = 'info', duration = 3200) {
    if (!root || !message) return;
    const node = el('div', { class: `toast toast--${type}`, role: 'status' }, String(message));
    root.appendChild(node);
    // Enter animation on next frame.
    requestAnimationFrame(() => node.classList.add('is-visible'));
    setTimeout(() => {
        node.classList.remove('is-visible');
        setTimeout(() => node.remove(), 300);
    }, duration);
}

/** Convenience helper mirroring emit. */
export function toast(message, type = 'info', duration) {
    bus.emit(EVENT.TOAST, { message, type, duration });
}
