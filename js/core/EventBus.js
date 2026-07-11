/* =====================================================================
 * EventBus.js — Minimal pub/sub for decoupled module communication
 * ---------------------------------------------------------------------
 * Follows the Observer pattern. A single shared instance (`bus`) wires
 * the app together without modules importing each other directly.
 * ===================================================================== */

import { logger } from './Logger.js';

const log = logger.child('EventBus');

class EventBus {
    constructor() {
        /** @type {Map<string, Set<Function>>} */
        this._handlers = new Map();
    }

    /**
     * Subscribe to an event.
     * @param {string} type
     * @param {Function} handler
     * @returns {() => void} unsubscribe function
     */
    on(type, handler) {
        if (typeof handler !== 'function') throw new TypeError('handler must be a function');
        if (!this._handlers.has(type)) this._handlers.set(type, new Set());
        this._handlers.get(type).add(handler);
        return () => this.off(type, handler);
    }

    /**
     * Subscribe for a single invocation.
     * @param {string} type @param {Function} handler
     * @returns {() => void} unsubscribe function
     */
    once(type, handler) {
        const off = this.on(type, (payload) => {
            off();
            handler(payload);
        });
        return off;
    }

    /** Unsubscribe a handler. */
    off(type, handler) {
        const set = this._handlers.get(type);
        if (set) {
            set.delete(handler);
            if (set.size === 0) this._handlers.delete(type);
        }
    }

    /**
     * Emit an event. Handler exceptions are isolated so one bad listener
     * cannot break the others.
     * @param {string} type @param {*} [payload]
     */
    emit(type, payload) {
        const set = this._handlers.get(type);
        if (!set || set.size === 0) return;
        // Copy to allow handlers to unsubscribe during dispatch.
        for (const handler of [...set]) {
            try {
                handler(payload);
            } catch (err) {
                log.error(`handler for "${type}" threw`, err);
            }
        }
    }

    /** Remove every handler (used on teardown). */
    clear() { this._handlers.clear(); }
}

/** Shared application-wide event bus. */
export const bus = new EventBus();
export { EventBus };
