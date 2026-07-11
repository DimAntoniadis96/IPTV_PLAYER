/* =====================================================================
 * format.js — Small pure formatting/normalization helpers
 * ===================================================================== */

/**
 * Normalize a string for case/diacritic-insensitive search matching.
 * @param {string} s
 * @returns {string}
 */
export function normalize(s) {
    return String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '') // strip accents
        .trim();
}

/** Escape a string for safe use inside HTML text. */
export function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Format seconds as H:MM:SS or M:SS. */
export function formatTime(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Truncate with an ellipsis. */
export function truncate(s, max = 40) {
    s = String(s || '');
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
