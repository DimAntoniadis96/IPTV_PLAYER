/* =====================================================================
 * PlayerScreen.js — Professional fullscreen player
 * ---------------------------------------------------------------------
 * - Movies / series (VOD): progress bar with current/total time, seek
 *   (±10s) with visual feedback, play/pause, and AUTO-PLAY of the next
 *   episode when one finishes (stays in the player — no trip to the menu).
 * - Live TV: a "LIVE" badge instead of a timeline (live can't be seeked);
 *   Ch+/Ch- switch channel.
 * - Buffering indicator, error handling with auto-retry, app-suspend
 *   handling, and auto-hiding controls (kept visible while paused).
 * ===================================================================== */

import { View } from '../View.js';
import { el, lazyImage } from '../../utils/dom.js';
import { AVPlayer, PEVENT } from '../../player/AVPlayer.js';
import { history } from '../../data/History.js';
import { toast } from '../components/Toast.js';
import { ACTION } from '../../input/Keys.js';
import { SECTION } from '../../core/constants.js';
import { formatTime, truncate } from '../../utils/format.js';
import { logger } from '../../core/Logger.js';

const log = logger.child('Player');
const CONTROLS_TIMEOUT = 4500;
const MAX_AUTO_RETRY = 2;
const SEEK_STEP = 10; // seconds per FF/REW press

export class PlayerScreen extends View {
    constructor(router, params) {
        super(router, params);
        this.context = params.context || { items: [params.item], index: 0, section: params.item.section };
        this.index = this.context.index || 0;
        this.item = params.item;
        this.isLive = this.context.section === SECTION.LIVE;
        this._retry = 0;
        this._hideTimer = null;
        this._retryTimer = null;
        this._destroyed = false;
        this._suspended = false;
        this._duration = 0;
        this._current = 0;
    }

    render() {
        this.surface = el('div', { class: 'player-surface' });
        this.spinner = el('div', { class: 'player-buffering' }, [el('div', { class: 'spinner' })]);
        this.centerIcon = el('div', { class: 'player-center-icon' });

        // ---- Controls bar ----
        this.pcTitle = el('div', { class: 'pc-title' }, this.item.name || '');
        this.pcMeta = el('div', { class: 'pc-meta' }, '');
        const infoRow = el('div', { class: 'pc-info' }, [this.pcTitle, this.pcMeta]);

        let mainRow;
        if (this.isLive) {
            mainRow = el('div', { class: 'pc-live' }, [el('span', { class: 'pc-live-dot' }), 'LIVE']);
        } else {
            this.pcCur = el('div', { class: 'pc-time' }, '0:00');
            this.pcDur = el('div', { class: 'pc-time' }, '--:--');
            this.pcFill = el('div', { class: 'pc-fill' });
            this.pcHandle = el('div', { class: 'pc-handle' });
            this.pcBar = el('div', { class: 'pc-bar' }, [this.pcFill, this.pcHandle]);
            mainRow = el('div', { class: 'pc-progress' }, [this.pcCur, this.pcBar, this.pcDur]);
        }

        // Control hints row
        const hints = el('div', { class: 'pc-hints' }, this.isLive
            ? [this._hint('▲▼', 'Channel'), this._hint('OK', 'Pause'), this._hint('m', 'Mute')]
            : [this._hint('◀ ▶', 'Seek 10s'), this._hint('OK', 'Play/Pause'), this._hint('▲▼', 'Episode')]);

        this.controls = el('div', { class: 'player-controls' }, [infoRow, mainRow, hints]);

        this.errorPanel = el('div', { class: 'player-error is-hidden' }, [
            el('div', { class: 'player-error-title' }, 'Playback error'),
            el('div', { class: 'player-error-msg' }, ''),
            el('div', { class: 'player-error-hint' }, 'Press OK to retry · BACK to exit')
        ]);

        return el('div', { class: 'player-screen' }, [
            this.surface, this.spinner, this.centerIcon, this.controls, this.errorPanel
        ]);
    }

    _hint(key, text) {
        return el('span', { class: 'pc-hint' }, [
            el('span', { class: 'pc-hint-key' }, key), el('span', {}, text)
        ]);
    }

    onMount() {
        document.body.classList.add('av-playing');
        this.player = new AVPlayer(this.surface);
        this.player.setEventHandler((name, data) => this._onEvent(name, data));
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

    _suspend() {
        if (this._destroyed || this._suspended) return;
        this._suspended = true;
        if (this._retryTimer) { clearTimeout(this._retryTimer); this._retryTimer = null; }
        if (this.player) this.player.stop();
    }
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

    /** Next/previous playable index. wrap=false stops at the ends. */
    _nextPlayableIndex(from, delta, wrap) {
        const n = this.context.items.length;
        if (n <= 0) return -1;
        for (let step = 1; step <= n; step++) {
            let i = from + delta * step;
            if (wrap) i = ((i % n) + n) % n;
            else if (i < 0 || i >= n) return -1;
            if (this._playableAt(i)) return i;
        }
        return -1;
    }

    async _playCurrent() {
        if (this._destroyed || this._suspended || !this.player) return;
        const item = this._playableAt(this.index) || this.item;
        this.item = item;
        this._retry = 0;
        this._duration = 0;
        this._current = 0;
        if (this._retryTimer) { clearTimeout(this._retryTimer); this._retryTimer = null; }
        this._updateInfo(item);
        this._updateProgress();
        this._showSpinner(true);
        this._hideError();
        this._showControls();
        history.add(item);
        const ok = await this.player.open(item.url);
        if (this._destroyed || this._suspended || !this.player) return;
        if (!ok) this._handleError();
    }

    /** Manual next/previous (wraps around within the context). */
    _switch(delta) {
        const i = this._nextPlayableIndex(this.index, delta, true);
        if (i < 0) return;
        this.index = i;
        this._flashCenter(delta > 0 ? '⏭' : '⏮');
        this._playCurrent();
    }

    /** Relative seek (VOD only) with optimistic UI update. */
    _seek(delta) {
        if (this.isLive || !this.player) return;
        if (!this._duration) this._duration = this.player.getDuration() || 0;
        const max = this._duration || (this._current + Math.abs(delta));
        this._current = Math.max(0, Math.min(max, this._current + delta));
        this.player.seek(delta);
        this._updateProgress();
        this._flashCenter(delta > 0 ? '⏩' : '⏪');
        this._showControls();
    }

    _onEvent(name, data) {
        switch (name) {
            case PEVENT.BUFFERING: this._showSpinner(true); break;
            case PEVENT.READY:
            case PEVENT.PLAYING:
                this._retry = 0;
                if (!this._duration) this._duration = this.player.getDuration() || 0;
                this._updateProgress();
                this._showSpinner(false);
                this._hideError();
                break;
            case PEVENT.PAUSED: break;
            case 'time':
                if (data && typeof data.current === 'number') {
                    this._current = data.current;
                    if (!this._duration) this._duration = this.player.getDuration() || 0;
                    this._updateProgress();
                }
                break;
            case PEVENT.COMPLETED: this._onCompleted(); break;
            case PEVENT.ERROR: this._handleError(data); break;
            default: break;
        }
    }

    /** VOD finished -> auto-play next episode, or exit if none. */
    _onCompleted() {
        if (this.isLive) return;
        const next = this._nextPlayableIndex(this.index, +1, false);
        if (next >= 0) {
            this.index = next;
            const item = this._playableAt(next);
            toast(`Up next: ${truncate(item.name || 'Next', 40)}`, 'info', 2200);
            this._flashCenter('⏭');
            this._playCurrent();
        } else {
            toast('Finished', 'info', 1500);
            this.router.back();
        }
    }

    _handleError(data) {
        if (this._destroyed || this._suspended) return;
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

    // ---------------- UI ----------------

    _updateInfo(item) {
        this.pcTitle.textContent = item.name || '';
        const total = this.context.items.length;
        const pos = `${this.index + 1} / ${total}`;
        if (this.isLive) this.pcMeta.textContent = `Channel ${pos}`;
        else this.pcMeta.textContent = total > 1 ? `Episode ${pos}` : '';
    }

    _updateProgress() {
        if (this.isLive || !this.pcBar) return;
        const dur = this._duration || 0;
        const cur = dur > 0 ? Math.min(this._current, dur) : this._current;
        const pct = dur > 0 ? Math.min(100, (cur / dur) * 100) : 0;
        this.pcFill.style.width = `${pct}%`;
        this.pcHandle.style.left = `${pct}%`;
        this.pcCur.textContent = formatTime(cur);
        this.pcDur.textContent = dur > 0 ? formatTime(dur) : '--:--';
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
        clearTimeout(this._centerTimer);
        this._centerTimer = setTimeout(() => this.centerIcon.classList.remove('is-visible'), 650);
    }

    /** Show controls; keep them visible while paused, auto-hide while playing. */
    _showControls() {
        this.controls.classList.add('is-visible');
        if (this._hideTimer) clearTimeout(this._hideTimer);
        const paused = this.player && this.player.isPaused();
        if (!paused) {
            this._hideTimer = setTimeout(() => this.controls.classList.remove('is-visible'), CONTROLS_TIMEOUT);
        }
    }

    // ---------------- Input ----------------

    onKey(action) {
        if (!this.errorPanel.classList.contains('is-hidden')) {
            if (action === ACTION.OK) { this._retry = 0; this._playCurrent(); return true; }
            if (action === ACTION.BACK) return false;
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
            case ACTION.RIGHT:
            case ACTION.FF:  this._seek(+SEEK_STEP); return true;
            case ACTION.LEFT:
            case ACTION.REW: this._seek(-SEEK_STEP); return true;
            case ACTION.UP:
            case ACTION.CH_UP:   this._switch(+1); this._showControls(); return true;
            case ACTION.DOWN:
            case ACTION.CH_DOWN: this._switch(-1); this._showControls(); return true;
            case ACTION.MUTE: { const m = this.player.toggleMute(); toast(m ? 'Muted' : 'Unmuted', 'info', 1200); return true; }
            case ACTION.INFO: this._showControls(); return true;
            case ACTION.STOP: this.router.back(); return true;
            default: return false;
        }
    }

    onBack() { this.router.back(); return true; }
}
