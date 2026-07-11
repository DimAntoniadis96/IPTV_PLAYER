/* =====================================================================
 * View.js — Base class for all screens
 * ---------------------------------------------------------------------
 * Provides a consistent lifecycle (render -> mount -> show/hide -> unmount)
 * and default key handling. Screens subclass this and implement render()
 * plus optional onMount/onShow/onKey/onBack hooks.
 * ===================================================================== */

import { focus } from '../input/FocusManager.js';

export class View {
    /**
     * @param {import('./Router.js').Router} router
     * @param {object} [params]
     */
    constructor(router, params = {}) {
        this.router = router;
        this.params = params;
        /** @type {HTMLElement} root element (created in render) */
        this.el = null;
    }

    /** Build and return the root element. Must be implemented by subclasses. */
    render() { throw new Error('render() not implemented'); }

    /** Attach into a container. */
    mount(container) {
        this.el = this.render();
        this.el.classList.add('screen');
        container.appendChild(this.el);
        if (this.onMount) this.onMount();
    }

    /** Make visible and take focus. */
    show() {
        this.el.classList.remove('screen-hidden');
        focus.setRoot(this.el);
        if (this.onShow) this.onShow();
        else focus.focusFirst(this.el);
    }

    /** Hide without destroying (state preserved for Back). */
    hide() {
        this.el.classList.add('screen-hidden');
        if (this.onHide) this.onHide();
    }

    /** Destroy and detach. */
    unmount() {
        if (this.onUnmount) this.onUnmount();
        if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
        this.el = null;
    }

    /**
     * Optional key hook. Return true to consume the key before default
     * focus navigation runs. Base implementation consumes nothing.
     * @param {string} action @param {object} payload
     * @returns {boolean}
     */
    onKey(action, payload) { return false; }
}
