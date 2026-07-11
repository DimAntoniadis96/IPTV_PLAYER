/* =====================================================================
 * Loading.js — Full-screen loading overlay with optional progress text
 * ===================================================================== */

import { el } from '../../utils/dom.js';

let overlay = null;
let label = null;

/** Show (or update) the loading overlay. */
export function showLoading(message = 'Loading…') {
    if (!overlay) {
        label = el('div', { class: 'loading-text' }, message);
        overlay = el('div', { class: 'loading-overlay' }, [
            el('div', { class: 'spinner' }),
            label
        ]);
        document.body.appendChild(overlay);
    }
    label.textContent = message;
    overlay.classList.add('is-visible');
}

/** Update just the message text (e.g. download progress). */
export function updateLoading(message) {
    if (label) label.textContent = message;
}

/** Hide the loading overlay. */
export function hideLoading() {
    if (overlay) overlay.classList.remove('is-visible');
}
