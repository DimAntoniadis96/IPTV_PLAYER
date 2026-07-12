/* =====================================================================
 * dom.js — Tiny DOM helpers (no framework)
 * ---------------------------------------------------------------------
 * A handful of ergonomic helpers so screens can build UI declaratively
 * without a virtual DOM. Keeps view code short and consistent.
 * ===================================================================== */

/**
 * Create an element with props/attributes and children in one call.
 *   el('div', { class: 'card', dataset: { id: 5 } }, [ el('span', {}, 'Hi') ])
 * @param {string} tag
 * @param {object} [props]  className/class, dataset, style, on* handlers, attrs
 * @param {(Node|string)[]|Node|string} [children]
 * @returns {HTMLElement}
 */
export function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
        if (value == null) continue;
        if (key === 'class' || key === 'className') {
            node.className = value;
        } else if (key === 'dataset') {
            for (const [dk, dv] of Object.entries(value)) node.dataset[dk] = dv;
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(node.style, value);
        } else if (key === 'html') {
            node.innerHTML = value;
        } else if (key === 'text') {
            node.textContent = value;
        } else if (key.startsWith('on') && typeof value === 'function') {
            node.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (key in node && key !== 'list') {
            try { node[key] = value; } catch { node.setAttribute(key, value); }
        } else {
            node.setAttribute(key, value);
        }
    }
    appendChildren(node, children);
    return node;
}

/** Append a child, array of children, string, or Node. */
export function appendChildren(node, children) {
    if (children == null) return node;
    const list = Array.isArray(children) ? children : [children];
    for (const c of list) {
        if (c == null || c === false) continue;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
}

/** Remove all children of a node. */
export function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
}

/** querySelector shorthand. */
export const qs = (sel, root = document) => root.querySelector(sel);
/** querySelectorAll -> real array. */
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/**
 * Load an image lazily with a graceful fallback. Returns the <img> node
 * immediately; the src is applied only when `load()` is called (used by
 * the virtual grid when a card scrolls into view).
 * @param {string} src @param {object} [opts] { alt, fallback }
 */
export function lazyImage(src, opts = {}) {
    const img = el('img', { class: 'lazy-img', alt: opts.alt || '', decoding: 'async' });
    img._pendingSrc = src || '';
    img.load = () => {
        if (!img._pendingSrc) { img.classList.add('is-empty'); return; }
        img.onerror = () => { img.classList.add('is-error'); img.removeAttribute('src'); };
        img.onload = () => img.classList.add('is-loaded');
        img.src = img._pendingSrc;
    };
    return img;
}
