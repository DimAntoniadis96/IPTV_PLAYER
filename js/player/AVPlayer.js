/* =====================================================================
 * AVPlayer.js — Thin wrapper over Samsung AVPlay (HTML5 fallback for dev)
 * ---------------------------------------------------------------------
 * Exposes one small interface regardless of environment:
 *   open(url) prepare()->play, play(), pause(), stop(), close(),
 *   toggleMute(), seek(±sec), plus a single onEvent callback with
 *   normalized event names: 'buffering' | 'ready' | 'playing' | 'paused'
 *   | 'completed' | 'error'.
 * ===================================================================== */

import { logger } from '../core/Logger.js';

const log = logger.child('AVPlayer');

/** Normalized player events. */
export const PEVENT = Object.freeze({
    BUFFERING: 'buffering', READY: 'ready', PLAYING: 'playing',
    PAUSED: 'paused', COMPLETED: 'completed', ERROR: 'error'
});

export class AVPlayer {
    /** @param {HTMLElement} container element that hosts the media surface */
    constructor(container) {
        this.container = container;
        this.onEvent = () => {};
        this._muted = false;
        this._url = '';
        this._useAvplay = typeof webapis !== 'undefined' && !!webapis.avplay;
        this._media = null; // <object> (avplay) or <video> (html5)
        this._buildSurface();
    }

    get isAvplay() { return this._useAvplay; }

    /** Create the appropriate media surface. */
    _buildSurface() {
        if (this._useAvplay) {
            // AVPlay renders into an <object> plane sized to the screen.
            const obj = document.createElement('object');
            obj.type = 'application/avplayer';
            obj.className = 'av-surface';
            this.container.appendChild(obj);
            this._media = obj;
        } else {
            const video = document.createElement('video');
            video.className = 'av-surface';
            video.setAttribute('playsinline', '');
            this.container.appendChild(video);
            this._media = video;
            this._bindHtml5(video);
        }
    }

    /** Register the single normalized event callback. */
    setEventHandler(fn) { this.onEvent = fn || (() => {}); }

    _emit(name, data) { try { this.onEvent(name, data); } catch (e) { log.error('event handler threw', e); } }

    /**
     * Open + prepare + play a stream URL.
     * @param {string} url
     */
    async open(url) {
        this._url = url;
        this._emit(PEVENT.BUFFERING);
        if (this._useAvplay) return this._openAvplay(url);
        return this._openHtml5(url);
    }

    // ---------------- AVPlay path ----------------

    _openAvplay(url) {
        const av = webapis.avplay;
        try {
            this.close(); // ensure a clean slate
            av.open(url);
            av.setListener({
                onbufferingstart: () => this._emit(PEVENT.BUFFERING),
                onbufferingprogress: (pct) => this._emit(PEVENT.BUFFERING, { percent: pct }),
                onbufferingcomplete: () => this._emit(PEVENT.PLAYING),
                onstreamcompleted: () => this._emit(PEVENT.COMPLETED),
                oncurrentplaytime: (ms) => this._emit('time', { current: ms / 1000 }),
                onerror: (err) => { log.warn('avplay error', err); this._emit(PEVENT.ERROR, { code: err }); }
            });
            // Fill the whole 1920x1080 screen.
            av.setDisplayRect(0, 0, 1920, 1080);
            try { av.setDisplayMethod('PLAYER_DISPLAY_MODE_LETTER_BOX'); } catch (e) { /* optional */ }

            return new Promise((resolve) => {
                av.prepareAsync(
                    () => {
                        this._emit(PEVENT.READY);
                        av.play();
                        this._screenSaver(false); // keep the TV awake during playback
                        this._emit(PEVENT.PLAYING);
                        resolve(true);
                    },
                    (e) => { log.warn('prepareAsync failed', e); this._emit(PEVENT.ERROR, { code: e }); resolve(false); }
                );
            });
        } catch (e) {
            log.error('avplay open failed', e && e.name);
            this._emit(PEVENT.ERROR, { code: e && e.name });
            return false;
        }
    }

    // ---------------- HTML5 path (desktop dev) ----------------

    _bindHtml5(v) {
        v.addEventListener('waiting', () => this._emit(PEVENT.BUFFERING));
        v.addEventListener('playing', () => this._emit(PEVENT.PLAYING));
        v.addEventListener('canplay', () => this._emit(PEVENT.READY));
        v.addEventListener('pause', () => this._emit(PEVENT.PAUSED));
        v.addEventListener('ended', () => this._emit(PEVENT.COMPLETED));
        v.addEventListener('timeupdate', () => this._emit('time', { current: v.currentTime }));
        v.addEventListener('error', () => this._emit(PEVENT.ERROR, { code: v.error && v.error.code }));
    }

    async _openHtml5(url) {
        const v = this._media;
        v.src = url;
        try { await v.play(); this._emit(PEVENT.PLAYING); return true; }
        catch (e) { log.warn('html5 play rejected (autoplay?)', e && e.name); return false; }
    }

    // ---------------- Common controls ----------------

    play() {
        if (this._useAvplay) { try { webapis.avplay.play(); this._screenSaver(false); this._emit(PEVENT.PLAYING); } catch (e) {} }
        else { this._media.play(); }
    }

    pause() {
        if (this._useAvplay) { try { webapis.avplay.pause(); this._screenSaver(true); this._emit(PEVENT.PAUSED); } catch (e) {} }
        else { this._media.pause(); }
    }

    /**
     * Enable/disable the TV screen saver. Disabled during playback so a long
     * live stream isn't interrupted; re-enabled when paused/stopped. Safe
     * no-op if the appcommon API isn't present.
     * @param {boolean} enabled
     */
    _screenSaver(enabled) {
        try {
            if (typeof webapis !== 'undefined' && webapis.appcommon && webapis.appcommon.AppCommonScreenSaverState) {
                const S = webapis.appcommon.AppCommonScreenSaverState;
                webapis.appcommon.setScreenSaver(enabled ? S.SCREEN_SAVER_ON : S.SCREEN_SAVER_OFF, () => {}, () => {});
            }
        } catch (e) { /* screensaver control unavailable — ignore */ }
    }

    /** @returns {boolean} true if now paused */
    togglePlay() {
        if (this.isPaused()) { this.play(); return false; }
        this.pause(); return true;
    }

    isPaused() {
        if (this._useAvplay) {
            try { return webapis.avplay.getState() === 'PAUSED'; } catch (e) { return false; }
        }
        return this._media.paused;
    }

    /**
     * Seek by a relative number of seconds (VOD only; no-op on live).
     * @param {number} deltaSeconds
     */
    seek(deltaSeconds) {
        if (this._useAvplay) {
            try {
                if (deltaSeconds >= 0) webapis.avplay.jumpForward(deltaSeconds * 1000);
                else webapis.avplay.jumpBackward(-deltaSeconds * 1000);
            } catch (e) { /* live streams reject seeks */ }
        } else {
            try { this._media.currentTime = Math.max(0, this._media.currentTime + deltaSeconds); } catch (e) {}
        }
    }

    /** Toggle mute via the TV audio control (or the <video> element). */
    toggleMute() {
        this._muted = !this._muted;
        try {
            if (typeof tizen !== 'undefined' && tizen.tvaudiocontrol) {
                tizen.tvaudiocontrol.setMute(this._muted);
            } else if (!this._useAvplay) {
                this._media.muted = this._muted;
            }
        } catch (e) { log.warn('mute failed', e); }
        return this._muted;
    }

    /** Stop playback (keeps the surface for a subsequent open). */
    stop() {
        if (this._useAvplay) { try { webapis.avplay.stop(); this._screenSaver(true); } catch (e) {} }
        else { try { this._media.pause(); this._media.removeAttribute('src'); this._media.load(); } catch (e) {} }
    }

    /** Fully close/release the player. */
    close() {
        if (this._useAvplay) {
            try { webapis.avplay.stop(); } catch (e) {}
            try { webapis.avplay.close(); } catch (e) {}
            this._screenSaver(true); // restore screensaver on teardown
        } else if (this._media) {
            try { this._media.pause(); this._media.removeAttribute('src'); this._media.load(); } catch (e) {}
        }
    }

    /** Remove the surface entirely (on screen teardown). */
    destroy() {
        this.close();
        if (this._media && this._media.parentNode) this._media.parentNode.removeChild(this._media);
        this._media = null;
    }
}
