/* =====================================================================
 * Http.js — Robust fetch wrapper (timeout, retry, typed errors)
 * ---------------------------------------------------------------------
 * Every network call in the app goes through here so behaviour (timeouts,
 * retries, error classification) is consistent and testable. Credentials
 * are never logged — only the redacted URL is.
 * ===================================================================== */

import { NET } from './constants.js';
import { logger } from './Logger.js';

const log = logger.child('Http');

/** Base class for all network errors so callers can `instanceof` them. */
export class HttpError extends Error {
    /** @param {string} message @param {object} [info] */
    constructor(message, info = {}) {
        super(message);
        this.name = 'HttpError';
        this.status = info.status ?? 0;   // HTTP status (0 = no response)
        this.kind = info.kind ?? 'http';  // 'timeout' | 'network' | 'http' | 'abort'
        this.url = info.url ?? '';
    }
}

/** True for errors worth retrying (transient). */
function isRetryable(err) {
    if (err.kind === 'timeout' || err.kind === 'network') return true;
    if (err.kind === 'http' && err.status >= 500) return true;
    return false;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Perform a single fetch with an AbortController-based timeout.
 * @param {string} url
 * @param {RequestInit & {timeout?: number, signal?: AbortSignal}} options
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}) {
    const timeout = options.timeout ?? NET.TIMEOUT_MS;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    // Chain an externally-provided signal (e.g. to cancel on view change).
    if (options.signal) {
        if (options.signal.aborted) controller.abort();
        else options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (err) {
        // Distinguish an abort caused by our timer from a network failure.
        const timedOut = controller.signal.aborted && !(options.signal && options.signal.aborted);
        throw new HttpError(timedOut ? 'Request timed out' : 'Network request failed', {
            url,
            kind: timedOut ? 'timeout' : (options.signal && options.signal.aborted ? 'abort' : 'network')
        });
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Fetch with automatic retry + exponential backoff for transient failures.
 * @param {string} url
 * @param {object} [options]
 * @returns {Promise<Response>}
 */
export async function request(url, options = {}) {
    const retries = options.retries ?? NET.RETRIES;
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            const res = await fetchWithTimeout(url, options);
            if (!res.ok) {
                throw new HttpError(`HTTP ${res.status}`, { url, status: res.status, kind: 'http' });
            }
            return res;
        } catch (err) {
            const e = err instanceof HttpError ? err : new HttpError(String(err && err.message), { url, kind: 'network' });
            if (e.kind === 'abort') throw e; // deliberate cancellation: don't retry
            if (attempt < retries && isRetryable(e)) {
                const delay = NET.RETRY_BASE_MS * Math.pow(2, attempt);
                log.warn(`retry ${attempt + 1}/${retries} in ${delay}ms for`, url, `(${e.kind}${e.status ? ' ' + e.status : ''})`);
                await sleep(delay);
                attempt += 1;
                continue;
            }
            throw e;
        }
    }
}

/**
 * GET and parse JSON. Xtream endpoints occasionally return an empty body or
 * HTML on error, so we parse defensively.
 * @template T
 * @param {string} url @param {object} [options]
 * @returns {Promise<T>}
 */
export async function getJson(url, options = {}) {
    const res = await request(url, { ...options, method: 'GET' });
    const text = await res.text();
    if (!text || !text.trim()) return null;
    try {
        return JSON.parse(text);
    } catch {
        throw new HttpError('Invalid JSON in server response', { url, status: res.status, kind: 'http' });
    }
}

/**
 * GET raw text (used for M3U downloads). Enforces a size cap to protect memory.
 * @param {string} url @param {object} [options]
 * @returns {Promise<string>}
 */
export async function getText(url, options = {}) {
    const res = await request(url, { ...options, method: 'GET' });
    const len = Number(res.headers.get('content-length') || 0);
    if (len && len > NET.MAX_PLAYLIST_BYTES) {
        throw new HttpError('Playlist too large', { url, kind: 'http' });
    }
    return res.text();
}

/**
 * Stream a large text response line-by-line without holding the whole body
 * in a second buffer — critical for 20k+ channel M3U files.
 * @param {string} url
 * @param {(line: string) => void} onLine  called per line
 * @param {object} [options]  may include onProgress(bytes)
 * @returns {Promise<void>}
 */
export async function streamLines(url, onLine, options = {}) {
    const res = await request(url, { ...options, method: 'GET' });
    if (!res.body || !res.body.getReader) {
        // Fallback for environments without a readable stream.
        const text = await res.text();
        for (const line of text.split(/\r?\n/)) onLine(line);
        return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let bytes = 0;
    try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            bytes += value.byteLength;
            if (bytes > NET.MAX_PLAYLIST_BYTES) {
                reader.cancel();
                throw new HttpError('Playlist too large', { url, kind: 'http' });
            }
            if (options.onProgress) options.onProgress(bytes);
            buffer += decoder.decode(value, { stream: true });
            let nl;
            while ((nl = buffer.indexOf('\n')) >= 0) {
                const line = buffer.slice(0, nl).replace(/\r$/, '');
                buffer = buffer.slice(nl + 1);
                onLine(line);
            }
        }
        if (buffer.length) onLine(buffer.replace(/\r$/, ''));
    } catch (err) {
        // A caller cancelling the stream (e.g. validation aborting after the
        // header) surfaces here as an AbortError — classify it as a typed
        // 'abort' so callers can distinguish it from a real network failure.
        if (err instanceof HttpError) throw err;
        const aborted = (options.signal && options.signal.aborted) || (err && err.name === 'AbortError');
        throw new HttpError(aborted ? 'Stream aborted' : 'Stream read failed', {
            url, kind: aborted ? 'abort' : 'network'
        });
    }
}
