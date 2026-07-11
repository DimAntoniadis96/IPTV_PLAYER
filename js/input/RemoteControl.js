/* =====================================================================
 * RemoteControl.js — Central remote/keyboard input handler
 * ---------------------------------------------------------------------
 * Registers Samsung remote keys, listens for keydown, resolves each to a
 * semantic ACTION and dispatches it. A stack of "handlers" lets the active
 * screen/player intercept keys; unhandled keys fall through to the focus
 * manager (arrow navigation + OK) as a default.
 * ===================================================================== */

import { resolveAction, REGISTER_KEYS, ACTION } from './Keys.js';
import { bus } from '../core/EventBus.js';
import { EVENT } from '../core/constants.js';
import { logger } from '../core/Logger.js';

const log = logger.child('Remote');

class RemoteControl {
    constructor() {
        /** @type {Array<(action:string, payload:object)=>boolean>} */
        this._handlers = [];
        this._started = false;
        this._defaultHandler = null;
    }

    /** Register TV keys (safe no-op off-device) and attach the listener. */
    start() {
        if (this._started) return;
        this._started = true;
        this._registerTvKeys();
        this._onKeyDown = this._onKeyDown.bind(this);
        document.addEventListener('keydown', this._onKeyDown, false);
        log.info('remote control started');
    }

    stop() {
        if (!this._started) return;
        document.removeEventListener('keydown', this._onKeyDown, false);
        this._started = false;
    }

    _registerTvKeys() {
        const tvinput = (typeof tizen !== 'undefined') && tizen.tvinputdevice;
        if (!tvinput) { log.info('tvinputdevice unavailable (desktop dev mode)'); return; }
        for (const name of REGISTER_KEYS) {
            try { tvinput.registerKey(name); }
            catch (e) { /* key not supported on this model — ignore */ }
        }
    }

    /**
     * Push a key handler onto the stack. Return `true` from the handler to
     * consume the key. Returns an unsubscribe function.
     * @param {(action:string, payload:object)=>boolean} handler
     */
    pushHandler(handler) {
        this._handlers.push(handler);
        return () => this.removeHandler(handler);
    }

    removeHandler(handler) {
        const i = this._handlers.lastIndexOf(handler);
        if (i >= 0) this._handlers.splice(i, 1);
    }

    /** The fallback handler (focus manager) used when nothing consumes a key. */
    setDefaultHandler(fn) { this._defaultHandler = fn; }

    /** True when a native text field is being edited (IME/keyboard active). */
    _isEditing() {
        const a = document.activeElement;
        if (!a) return false;
        const tag = a.tagName;
        return (tag === 'INPUT' || tag === 'TEXTAREA') && !a.readOnly && !a.disabled;
    }

    _onKeyDown(e) {
        const resolved = resolveAction(e);
        if (!resolved) return;

        // While editing a text field, let the platform IME handle characters.
        // Only BACK blurs the field (closing the keyboard); everything else
        // passes through untouched so typing works normally.
        if (this._isEditing()) {
            if (resolved.action === ACTION.BACK) {
                e.preventDefault();
                document.activeElement.blur();
            }
            return;
        }

        // Prevent the browser default for keys we own (scroll, back, etc.).
        e.preventDefault();

        const payload = { digit: resolved.digit, originalEvent: e };

        // Broadcast for observers (e.g. analytics-free logging, indicators).
        bus.emit(EVENT.KEY, { action: resolved.action, ...payload });

        // Top-of-stack handlers get first refusal.
        for (let i = this._handlers.length - 1; i >= 0; i--) {
            try {
                if (this._handlers[i](resolved.action, payload) === true) return;
            } catch (err) {
                log.error('key handler threw', err);
            }
        }

        // Fallback: focus navigation.
        if (this._defaultHandler) this._defaultHandler(resolved.action, payload);
    }
}

export const remote = new RemoteControl();
export { ACTION };
