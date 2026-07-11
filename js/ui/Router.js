/* =====================================================================
 * Router.js — Screen stack + central input routing
 * ---------------------------------------------------------------------
 * Keeps a stack of mounted screens (previous ones hidden, not destroyed,
 * so Back is instant and state is preserved). All remote input flows
 * through handleKey(): the top screen gets first refusal, then Back and
 * arrow/OK navigation are applied as defaults.
 * ===================================================================== */

import { focus } from '../input/FocusManager.js';
import { remote } from '../input/RemoteControl.js';
import { ACTION } from '../input/Keys.js';
import { logger } from '../core/Logger.js';

const log = logger.child('Router');

export class Router {
    /** @param {HTMLElement} container  the #app mount point */
    constructor(container) {
        this.container = container;
        /** @type {Array<{view:string, screen:import('./View.js').View}>} */
        this.stack = [];
        /** view name -> (router, params) => View */
        this._factories = new Map();
        // Route all input through this router.
        remote.setDefaultHandler((action, payload) => this.handleKey(action, payload));
    }

    /** Register a screen factory for a view name. */
    register(view, factory) { this._factories.set(view, factory); return this; }

    get top() { return this.stack[this.stack.length - 1]?.screen || null; }

    _create(view, params) {
        const factory = this._factories.get(view);
        if (!factory) throw new Error(`No screen registered for "${view}"`);
        return factory(this, params);
    }

    /**
     * Push a new screen on top of the stack.
     * @param {string} view @param {object} [params]
     */
    navigate(view, params = {}) {
        log.info('navigate ->', view);
        if (this.top) this.top.hide();
        const screen = this._create(view, params);
        screen.mount(this.container);
        this.stack.push({ view, screen });
        screen.show();
        return screen;
    }

    /**
     * Replace the ENTIRE stack with a single screen (e.g. after login).
     * @param {string} view @param {object} [params]
     */
    replaceAll(view, params = {}) {
        while (this.stack.length) this.stack.pop().screen.unmount();
        return this.navigate(view, params);
    }

    /** Pop the top screen and reveal the one beneath. */
    back() {
        if (this.stack.length <= 1) { this._exitApp(); return; }
        const { screen } = this.stack.pop();
        screen.unmount();
        const below = this.top;
        if (below) below.show();
    }

    /** Central key dispatch (installed as RemoteControl's default handler). */
    handleKey(action, payload) {
        if (action === ACTION.EXIT) { this._exitApp(); return; }

        const screen = this.top;
        // 1) Let the active screen intercept.
        if (screen && screen.onKey && screen.onKey(action, payload) === true) return;

        // 2) Back handling (screen may override via onBack).
        if (action === ACTION.BACK) {
            if (screen && typeof screen.onBack === 'function') { if (screen.onBack() === true) return; }
            this.back();
            return;
        }

        // 3) Default: spatial focus navigation (arrows/OK).
        focus.handle(action);
    }

    /** Cleanly exit the Tizen application (no-op in a browser). */
    _exitApp() {
        try {
            if (typeof tizen !== 'undefined' && tizen.application) {
                tizen.application.getCurrentApplication().exit();
                return;
            }
        } catch (e) { log.warn('exit failed', e); }
        log.info('exit requested (no-op off-device)');
    }
}
