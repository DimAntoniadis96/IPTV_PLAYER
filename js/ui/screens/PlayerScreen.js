/* =====================================================================
 * PlayerScreen.js — Fullscreen playback + on-screen controls
 * ---------------------------------------------------------------------
 * Hosts the AVPlayer, shows a buffering indicator, an auto-hiding info bar,
 * and handles play/pause, mute, channel up/down and VOD seeking. Includes
 * error handling with automatic retry then a manual retry prompt.
 * ===================================================================== */

import { View } from '../View.js';
import { el, lazyImage } from '../../utils/dom.js';
import { AVPlayer, PEVENT } from '../../player/AVPlayer.js';
import { history } from '../../data/History.js';
import { toast } from '../components/Toast.js';
import { ACTION } from '../../input/Keys.js';
import { SECTION } from '../../core/constants.js';
import { logger } from '../../core/Logger.js';

const log = logger.child('Player');
const CONTROLS_TIMEOUT = 4000;
const MAX_AUTO_RETRY = 2;

export class PlayerScreen extends View {
    constructor(router, params) {
        super(router, params);
        this.context = params.context || { items: [params.item], index: 0, section: params.item.section };
        this.index = this.context.index || 0;
        this.item = params.item;
        this._retry = 0;
        this._hideTimer = null;
        this._retryTimer = null;
        this._destroyed = false;
        this._suspended = false;
    }

    render() {
        this.surface = el('div', { class: 'player-surface' });
        this.spinner = el('div', { class: 'player-buffering' }, [el('div', { class: 'spinner' })]);
        this.centerIcon = el('div', { class: 'player-center-icon' });

        this.infoLogo = el('div', { class: 'player-info-logo' });
        this.infoName = el('div', { class: 'player-info-name' }, this.item.name || '');
        this.infoMeta = el('div', { class: 'player-info-meta' }, '');
        this.infoBar = el('div', { class: 'player-infobar' }, [
            this.infoLogo,
            el('div', { class: 'player-info-text' }, [this.infoName, this.infoMeta])
        ]);

        this.errorPanel = el('div', { class: 'player-error is-hidden' }, [
            el('div', { class: 'player-error-title' }, 'Playback error'),
            el('div', { class: 'player-error-msg' }, ''),
            el('div', { class: 'player-error-hint' }, 'Press OK to retry · BACK to exit')
        ]);

        return el('div', { class: 'player-screen' }, [
            this.surface, this.spinner, this.centerIcon, this.infoBar, this.errorPanel
        ]);
    }

    onMount() {
        // AVPlay's video plane is composited BEHIND the web page, so the body
        // must be transparent while playing for the video to show through.
        document.body.classList.add('av-playing');
        this.player = new AVPlayer(this.surface);
        this.player.setEventHandler((name, data) => this._onEvent(name, data));

        // App lifecycle: release the decoder when backgrounded (Home/Multitask),
        // resume when we come back. Prevents background audio + a leaked decoder.
        this._onVisibility = () => { if (document.hidden) this._suspend(); else this._resume(); };
        document.addEventListener('visibilitychange', this._onVisibility);

        this._playCurrent();
    }

    onShow() { this._showControls(); }

    onUnmount() {
        this._destroyed = true;
        if (this._hideTimer) clearTimeout(this._hideTimer);
        if (this._retryTimer) clearTimeout(this._retryTimer);
        if (this._onVisibility) document.removeEventListener('visibilitychange', this._onVisibility);
        if (this.player) this.player.destroy();
        document.body.classList.remove('av-playing');
    }

    /** Backgrounded: stop playback and release the hardware decoder. */
    _suspend() {
        if (this._destroyed || this._suspended) return;
        this._suspended = true;
        if (this._retryTimer) { clearTimeout(this._retryTimer); this._retryTimer = null; }
        if (this.player) this.player.stop();
    }

    /** Foregrounded: reopen the current stream from scratch. */
    _resume() {
        if (this._destroyed || !this._suspended) return;
        this._suspended = false;
        this._playCurrent();
    }

    // ---------------- Playback ----------------

    _playableAt(i) {
        const it = this.context.items[i];
        return it && it.url ? it : null;
    }

    async _playCurrent() {
        if (this._destroyed || this._suspended || !this.player) return;
        const item = this._playableAt(this.index) || this.item;
        this.item = item;
        this._retry = 0;
        if (this._retryTimer) { clearTimeout(this._retryTimer); this._retryTimer = null; }
        this._updateInfo(item);
        this._showSpinner(true);
        this._hideError();
        history.add(item);
        const ok = await this.player.open(item.url);
        // The screen may have been torn down or backgrounded during open().
        if (this._destroyed || this._suspended || !this.player) return;
        if (!ok) this._handleError();
    }

    _switch(delta) {
        // Find the next/previous playable item (skip series containers).
        const n = this.context.items.length;
        if (n <= 1) return;
        let i = this.index;
        for (let step = 0; step < n; step++) {
            i = (i + delta + n) % n;
            if (this._playableAt(i)) { this.index = i; break; }
        }
        this._flashCenter(delta > 0 ? '▲' : '▼');
        this._playCurrent();
    }

    _onEvent(name, data) {
        switch (name) {
            case PEVENT.BUFFERING: this._showSpinner(true); break;
            case PEVENT.READY:
            case PEVENT.PLAYING:
                this._retry = 0;
                this._showSpinner(false);
                this._hideError();
                break;
            case PEVENT.PAUSED: break;
            case PEVENT.COMPLETED:
                // Live never completes; for VOD, exit back to the list.
                if (this.context.section !== SECTION.LIVE) { toast('Finished', 'info', 1500); this.router.back(); }
                break;
            case PEVENT.ERROR: this._handleError(data); break;
            default: break; // 'time' etc. ignored here
        }
    }

    _handleError(data) {
        if (this._destroyed || this._suspended) return;
        // A single failure can arrive twice (AVPlay error callback + the
        // resolved open() promise). If a retry is already scheduled, don't
        // stack a second timer or double-increment the retry counter.
        if (this._retryTimer) return;
        this._showSpinner(false);
        if (this._retry < MAX_AUTO_RETRY) {
            this._retry += 1;
            const delay = 800 * this._retry;
            log.warn(`playback error, auto-retry ${this._retry}/${MAX_AUTO_RETRY} in ${delay}ms`);
            this._showSpinner(true);
            this._retryTimer = setTimeout(async () => {
                this._retryTimer = null;
                if (this._destroyed || this._suspended || !this.player) return;
                const ok = await this.player.open(this.item.url);
                if (this._destroyed || this._suspended || !this.player) return;
                if (!ok) this._handleError();
            }, delay);
            return;
        }
        this._showError('This stream could not be played. It may be offline.');
    }

    // ---------------- UI helpers ----------------

    _updateInfo(item) {
        this.infoName.textContent = item.name || '';
        const pos = `${this.index + 1} / ${this.context.items.length}`;
        this.infoMeta.textContent = this.context.section === SECTION.LIVE ? `Channel ${pos}` : pos;
        this.infoLogo.innerHTML = '';
        if (item.logo) { const img = lazyImage(item.logo, { alt: '' }); this.infoLogo.appendChild(img); img.load(); }
    }

    _showSpinner(on) { this.spinner.classList.toggle('is-visible', !!on); }

    _showError(msg) {
        this.errorPanel.querySelector('.player-error-msg').textContent = msg;
        this.errorPanel.classList.remove('is-hidden');
    }
    _hideError() { this.errorPanel.classList.add('is-hidden'); }

    _flashCenter(symbol) {
        this.centerIcon.textContent = symbol;
        this.centerIcon.classList.add('is-visible');
        setTimeout(() => this.centerIcon.classList.remove('is-visible'), 600);
    }

    _showControls() {
        this.infoBar.classList.add('is-visible');
        if (this._hideTimer) clearTimeout(this._hideTimer);
        this._hideTimer = setTimeout(() => this.infoBar.classList.remove('is-visible'), CONTROLS_TIMEOUT);
    }

    // ---------------- Input ----------------

    onKey(action) {
        // If the error panel is up, OK retries.
        if (!this.errorPanel.classList.contains('is-hidden')) {
            if (action === ACTION.OK) { this._retry = 0; this._playCurrent(); return true; }
            if (action === ACTION.BACK) return false; // let router pop
        }

        switch (action) {
            case ACTION.OK:
            case ACTION.PLAY_PAUSE: {
                const paused = this.player.togglePlay();
                this._flashCenter(paused ? '❚❚' : '►');
                this._showControls();
                return true;
            }
            case ACTION.PLAY:  this.player.play();  this._flashCenter('►');  this._showControls(); return true;
            case ACTION.PAUSE: this.player.pause(); this._flashCenter('❚❚'); this._showControls(); return true;
            case ACTION.UP:
            case ACTION.CH_UP:   this._switch(+1); this._showControls(); return true;
            case ACTION.DOWN:
            case ACTION.CH_DOWN: this._switch(-1); this._showControls(); return true;
            case ACTION.RIGHT:
            case ACTION.FF:  this.player.seek(+30); this._showControls(); return true;
            case ACTION.LEFT:
            case ACTION.REW: this.player.seek(-15); this._showControls(); return true;
            case ACTION.MUTE: { const m = this.player.toggleMute(); toast(m ? 'Muted' : 'Unmuted', 'info', 1200); return true; }
            case ACTION.INFO: this._showControls(); return true;
            case ACTION.STOP: this.router.back(); return true;
            default: return false;
        }
    }

    onBack() { this.router.back(); return true; }
}
