/* =====================================================================
 * Logger.js — Safe, credential-redacting logger
 * ---------------------------------------------------------------------
 * SECURITY REQUIREMENT: usernames, passwords and tokens must NEVER be
 * written to the console. Every value passed through the logger is run
 * through a redactor that masks sensitive query params and object keys.
 * ===================================================================== */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

/** Query-string params whose values must be masked (case-insensitive). */
const SENSITIVE_PARAMS = /([?&](?:username|password|user|pass|pwd|token|auth|api_key)=)[^&#\s]*/gi;

/** Object keys whose values must be masked. */
const SENSITIVE_KEYS = /^(username|password|user|pass|pwd|token|auth|apikey|api_key)$/i;

/**
 * Redact sensitive substrings from any string (URLs, messages).
 * @param {string} str
 * @returns {string}
 */
function redactString(str) {
    return String(str).replace(SENSITIVE_PARAMS, '$1***');
}

/**
 * Deep-clone a value while masking sensitive object keys. Guards against
 * cycles and huge structures so logging can never crash the app.
 * @param {*} value
 * @param {WeakSet} [seen]
 * @param {number} [depth]
 * @returns {*}
 */
function redactValue(value, seen = new WeakSet(), depth = 0) {
    if (value == null) return value;
    if (typeof value === 'string') return redactString(value);
    if (typeof value !== 'object') return value;
    if (depth > 4) return '[…]';
    if (seen.has(value)) return '[Circular]';
    seen.add(value);

    if (Array.isArray(value)) {
        return value.slice(0, 50).map((v) => redactValue(v, seen, depth + 1));
    }
    const out = {};
    for (const [k, v] of Object.entries(value)) {
        out[k] = SENSITIVE_KEYS.test(k) ? '***' : redactValue(v, seen, depth + 1);
    }
    return out;
}

/**
 * Lightweight logger with levels and automatic redaction.
 * Use `Logger.child('Scope')` to prefix messages by module.
 */
class Logger {
    /** @param {string} scope @param {keyof LEVELS} level */
    constructor(scope = 'app', level = 'info') {
        this.scope = scope;
        this.setLevel(level);
    }

    /** @param {keyof LEVELS} level */
    setLevel(level) {
        this._threshold = LEVELS[level] ?? LEVELS.info;
    }

    /** Create a scoped child logger sharing the same threshold. */
    child(scope) {
        const l = new Logger(`${this.scope}:${scope}`);
        l._threshold = this._threshold;
        return l;
    }

    _emit(method, weight, args) {
        if (weight < this._threshold) return;
        const safe = args.map((a) => redactValue(a));
        // eslint-disable-next-line no-console
        (console[method] || console.log).call(console, `[${this.scope}]`, ...safe);
    }

    debug(...a) { this._emit('debug', LEVELS.debug, a); }
    info(...a)  { this._emit('info',  LEVELS.info,  a); }
    warn(...a)  { this._emit('warn',  LEVELS.warn,  a); }
    error(...a) { this._emit('error', LEVELS.error, a); }
}

/** Shared root logger. Modules should call `logger.child('Name')`. */
export const logger = new Logger('iptv', 'debug');
export { Logger, redactString };
