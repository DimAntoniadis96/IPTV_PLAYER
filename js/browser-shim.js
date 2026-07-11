/* =====================================================================
 * browser-shim.js — Desktop browser development mode
 * ---------------------------------------------------------------------
 * Loaded ONLY when running in a desktop browser (never on Tizen).
 *
 * Provides:
 *  1. M3U parser (shared logic — will move to js/m3u-parser.js in Module 4)
 *  2. HTML5 <video> playback instead of Samsung AVPlay
 *  3. Keyboard → TV remote mapping (Arrow keys, Enter, Escape, Backspace)
 *  4. A minimal channel-browser UI (for testing the boot → login → browse flow)
 *
 * This file does NOT modify or break any Tizen-specific code paths.
 * ===================================================================== */

/* ── M3U parser ──────────────────────────────────────────────────────── */

/**
 * Parse an M3U/M3U8 playlist string into an array of channel objects.
 * Each channel: { name, url, logo, group, id, extra }
 */
function parseM3U(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lines[0]?.startsWith('#EXTM3U')) {
        throw new Error('Not a valid M3U playlist (missing #EXTM3U header)');
    }

    const channels = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].startsWith('#EXTINF:')) continue;
        const infoLine = lines[i];
        const urlLine = lines[i + 1];
        if (!urlLine || urlLine.startsWith('#')) continue;
        i++; // skip URL line on next iteration

        /* Parse attributes from #EXTINF line */
        const getAttr = (key) => {
            const m = infoLine.match(new RegExp(`${key}="([^"]*)"`, 'i'));
            return m ? m[1] : '';
        };

        /* Channel name is after the last comma */
        const nameMatch = infoLine.match(/,(.+)$/);
        const name = nameMatch ? nameMatch[1].trim() : 'Unnamed';

        channels.push({
            id: getAttr('tvg-id') || `ch-${channels.length}`,
            name,
            url: urlLine,
            logo: getAttr('tvg-logo'),
            group: getAttr('group-title') || 'Uncategorized',
            extra: {},
        });
    }
    return channels;
}

/**
 * Group channels by their `group` field.
 * Returns Map<string, Channel[]>
 */
function groupByCategory(channels) {
    const map = new Map();
    for (const ch of channels) {
        if (!map.has(ch.group)) map.set(ch.group, []);
        map.get(ch.group).push(ch);
    }
    return map;
}

/* ── HTML5 Video player (replaces AVPlay) ────────────────────────────── */

class BrowserPlayer {
    constructor({ Log, Bus }) {
        this.Log = Log;
        this.Bus = Bus;
        /** @type {HTMLVideoElement|null} */
        this._video = null;
        this._overlay = null;
        this._active = false;
    }

    _createOverlay() {
        if (this._overlay) return;
        this._overlay = document.createElement('div');
        this._overlay.id = 'player-overlay';
        this._overlay.className = 'player-overlay';
        this._overlay.innerHTML = `
            <div class="player-info-bar">
                <span id="player-channel-name" class="player-ch-name"></span>
                <span id="player-status" class="player-status"></span>
            </div>
            <video id="html5-player" class="player-video" autoplay></video>
            <div id="player-error" class="player-error" hidden></div>
            <div class="player-hint">ESC / Backspace = Back &nbsp;│&nbsp; ↑↓ = Channel &nbsp;│&nbsp; Space = Pause</div>
        `;
        document.body.appendChild(this._overlay);
        this._video = document.getElementById('html5-player');

        this._video.addEventListener('playing', () => {
            this.Log.info('Player: playing');
            this._setStatus('Playing');
            this._hideError();
        });
        this._video.addEventListener('waiting', () => {
            this.Log.info('Player: buffering');
            this._setStatus('Buffering…');
        });
        this._video.addEventListener('error', () => {
            const err = this._video.error;
            const msg = err ? `Media error ${err.code}: ${err.message || 'unknown'}` : 'Unknown playback error';
            this.Log.error('Player:', msg);
            this._showError(msg);
            this._setStatus('Error');
        });
        this._video.addEventListener('ended', () => {
            this._setStatus('Ended');
        });
    }

    _setStatus(txt) {
        const el = document.getElementById('player-status');
        if (el) el.textContent = txt;
    }

    _showError(msg) {
        const el = document.getElementById('player-error');
        if (el) { el.textContent = msg; el.hidden = false; }
    }
    _hideError() {
        const el = document.getElementById('player-error');
        if (el) el.hidden = true;
    }

    async play(channel) {
        this.Log.info('Player: attempting playback →', channel.name, channel.url);
        this._createOverlay();
        this._overlay.classList.add('is-active');
        this._active = true;

        const nameEl = document.getElementById('player-channel-name');
        if (nameEl) nameEl.textContent = channel.name;
        this._setStatus('Loading…');
        this._hideError();

        const url = channel.url;
        /* HLS streams need hls.js in browsers that don't support native HLS.
           Safari has native HLS; for Chrome/Firefox we try native first, then show an error
           with guidance.  We keep it simple — no external libs in this scaffold. */
        this._video.src = url;
        try {
            await this._video.play();
        } catch (err) {
            this.Log.warn('Player: play() rejected:', err.message);
            /* Browsers may block autoplay; show a message */
            if (err.name === 'NotAllowedError') {
                this._showError('Autoplay blocked — click the page first or use Safari for native HLS.');
            } else if (err.name === 'NotSupportedError') {
                this._showError('Browser cannot play HLS natively. Use Safari, or add hls.js for Chrome/Firefox.');
            } else {
                this._showError(err.message);
            }
        }
    }

    stop() {
        if (!this._video) return;
        this._video.pause();
        this._video.removeAttribute('src');
        this._video.load();
        if (this._overlay) this._overlay.classList.remove('is-active');
        this._active = false;
        this.Log.info('Player: stopped');
    }

    togglePause() {
        if (!this._video) return;
        if (this._video.paused) { this._video.play(); }
        else { this._video.pause(); this._setStatus('Paused'); }
    }

    get isActive() { return this._active; }
}

/* ── Keyboard → Remote mapping ───────────────────────────────────────── */

const KEY_MAP = {
    ArrowUp:    'UP',
    ArrowDown:  'DOWN',
    ArrowLeft:  'LEFT',
    ArrowRight: 'RIGHT',
    Enter:      'OK',
    Escape:     'BACK',
    Backspace:  'BACK',
    ' ':        'PLAY_PAUSE',   // space bar
};

function initKeyboard(Bus, Log) {
    document.addEventListener('keydown', (e) => {
        const mapped = KEY_MAP[e.key];
        if (mapped) {
            e.preventDefault();
            Log.debug('Key:', e.key, '→', mapped);
            Bus.emit('remote:key', mapped);
        }
    });
    Log.info('Keyboard → remote mapping active (↑↓←→ Enter Esc Backspace Space)');
}

/* ── Minimal channel-browser UI ─────────────────────────────────────── */

class ChannelBrowserUI {
    constructor({ Log, Bus, player }) {
        this.Log = Log;
        this.Bus = Bus;
        this.player = player;
        /** @type {Map<string, object[]>} */
        this.categories = new Map();
        /** @type {string[]} */
        this.categoryNames = [];
        /** @type {number} */
        this.catIdx = 0;
        /** @type {number} */
        this.chIdx = 0;
        /** @type {'categories'|'channels'} */
        this.focusCol = 'categories';

        Bus.on('remote:key', (k) => this._onKey(k));
    }

    render(categories) {
        this.categories = categories;
        this.categoryNames = [...categories.keys()];
        this.catIdx = 0;
        this.chIdx = 0;
        this.focusCol = 'categories';

        const app = document.getElementById('app');
        app.innerHTML = '';

        /* Two-column layout: category list | channel grid */
        app.innerHTML = `
            <div class="browser-layout">
                <aside id="cat-list" class="cat-list" role="navigation" aria-label="Categories">
                    <h2 class="cat-heading">Categories</h2>
                    <ul id="cat-items"></ul>
                </aside>
                <section id="ch-panel" class="ch-panel" role="main" aria-label="Channels">
                    <h2 id="ch-heading" class="ch-heading"></h2>
                    <ul id="ch-items" class="ch-grid"></ul>
                </section>
            </div>
            <footer class="browser-footer">
                <span>↑↓ Navigate</span>
                <span>← → Switch panel</span>
                <span>Enter = Select</span>
                <span>Esc = Back</span>
            </footer>
        `;

        this._renderCategories();
        this._renderChannels();
        this._updateFocus();
    }

    _renderCategories() {
        const ul = document.getElementById('cat-items');
        ul.innerHTML = this.categoryNames.map((name, i) => {
            const count = this.categories.get(name).length;
            return `<li class="cat-item" data-idx="${i}">
                <span class="cat-name">${name}</span>
                <span class="cat-count">${count}</span>
            </li>`;
        }).join('');
    }

    _renderChannels() {
        const catName = this.categoryNames[this.catIdx];
        const channels = this.categories.get(catName) || [];
        document.getElementById('ch-heading').textContent = catName;
        const ul = document.getElementById('ch-items');
        ul.innerHTML = channels.map((ch, i) => {
            const logo = ch.logo
                ? `<img class="ch-logo" src="${ch.logo}" alt="" loading="lazy" onerror="this.style.display='none'">`
                : `<div class="ch-logo ch-logo-placeholder">${ch.name.charAt(0)}</div>`;
            return `<li class="ch-item" data-idx="${i}">
                ${logo}
                <span class="ch-name">${ch.name}</span>
            </li>`;
        }).join('');
        this.chIdx = 0;
    }

    _updateFocus() {
        /* Clear all focus */
        document.querySelectorAll('.is-focused').forEach(el => el.classList.remove('is-focused'));

        if (this.focusCol === 'categories') {
            const items = document.querySelectorAll('#cat-items .cat-item');
            if (items[this.catIdx]) {
                items[this.catIdx].classList.add('is-focused');
                items[this.catIdx].scrollIntoView({ block: 'nearest' });
            }
        } else {
            const items = document.querySelectorAll('#ch-items .ch-item');
            if (items[this.chIdx]) {
                items[this.chIdx].classList.add('is-focused');
                items[this.chIdx].scrollIntoView({ block: 'nearest' });
            }
        }
    }

    _onKey(k) {
        if (this.player.isActive) {
            /* Player is showing — handle player keys */
            if (k === 'BACK') {
                this.player.stop();
                return;
            }
            if (k === 'PLAY_PAUSE') {
                this.player.togglePause();
                return;
            }
            /* UP/DOWN = channel switch */
            if (k === 'UP' || k === 'DOWN') {
                const catName = this.categoryNames[this.catIdx];
                const channels = this.categories.get(catName) || [];
                if (k === 'DOWN') this.chIdx = (this.chIdx + 1) % channels.length;
                else this.chIdx = (this.chIdx - 1 + channels.length) % channels.length;
                this.player.play(channels[this.chIdx]);
                return;
            }
            return;
        }

        /* Browse mode keys */
        switch (k) {
            case 'UP':
                if (this.focusCol === 'categories') {
                    this.catIdx = Math.max(0, this.catIdx - 1);
                    this._renderChannels();
                } else {
                    this.chIdx = Math.max(0, this.chIdx - 1);
                }
                break;
            case 'DOWN':
                if (this.focusCol === 'categories') {
                    this.catIdx = Math.min(this.categoryNames.length - 1, this.catIdx + 1);
                    this._renderChannels();
                } else {
                    const catName = this.categoryNames[this.catIdx];
                    const max = (this.categories.get(catName) || []).length - 1;
                    this.chIdx = Math.min(max, this.chIdx + 1);
                }
                break;
            case 'RIGHT':
                if (this.focusCol === 'categories') {
                    this.focusCol = 'channels';
                }
                break;
            case 'LEFT':
                if (this.focusCol === 'channels') {
                    this.focusCol = 'categories';
                }
                break;
            case 'OK':
                if (this.focusCol === 'channels') {
                    const catName = this.categoryNames[this.catIdx];
                    const ch = (this.categories.get(catName) || [])[this.chIdx];
                    if (ch) this.player.play(ch);
                } else {
                    /* Enter on category → jump to channels */
                    this.focusCol = 'channels';
                    this.chIdx = 0;
                }
                break;
            case 'BACK':
                if (this.focusCol === 'channels') {
                    this.focusCol = 'categories';
                }
                break;
        }
        this._updateFocus();
    }
}

/* ── Login screen (M3U URL input) ─────────────────────────────────────
   A very minimal form to load a playlist URL or local path.  This will
   be replaced by the full login/accounts screen in Module 3/6.         */

function showLoginScreen(appEl, onSubmit) {
    appEl.innerHTML = `
        <div class="login-screen">
            <div class="login-card">
                <h1 class="login-title">
                    <span class="login-play-icon"></span>
                    IPTV Player
                </h1>
                <p class="login-subtitle">Browser Development Mode</p>
                <form id="login-form" class="login-form">
                    <label class="login-label" for="m3u-url">M3U Playlist URL</label>
                    <input id="m3u-url" class="login-input" type="text"
                           value="test-playlist.m3u"
                           placeholder="http://... or local file path"
                           autocomplete="off" spellcheck="false">
                    <button type="submit" class="login-btn">Load Playlist</button>
                </form>
                <div id="login-error" class="login-error" hidden></div>
                <p class="login-hint">
                    Tip: <code>test-playlist.m3u</code> is pre‑loaded for testing.
                </p>
            </div>
        </div>
    `;

    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const url = document.getElementById('m3u-url').value.trim();
        if (!url) return;
        onSubmit(url);
    });

    /* Focus the input */
    setTimeout(() => document.getElementById('m3u-url').focus(), 100);
}

/* ── Main browser‑shim initialiser ───────────────────────────────────── */

export async function initBrowserShim({ Log, Bus, setBootStatus, hideBootScreen }) {
    Log.info('Browser development shim initialising…');

    /* Show cursor & allow selection in browser mode */
    document.body.style.cursor = 'auto';
    document.body.style.userSelect = 'auto';

    setBootStatus('Initialising browser dev mode…');

    /* Init subsystems */
    const player = new BrowserPlayer({ Log, Bus });
    const ui = new ChannelBrowserUI({ Log, Bus, player });
    initKeyboard(Bus, Log);

    /* Load dynamic CSS for browser-mode UI */
    await injectBrowserCSS();

    setBootStatus('Ready');
    hideBootScreen();

    /* Show login/playlist-loader screen */
    const appEl = document.getElementById('app');
    showLoginScreen(appEl, async (url) => {
        const errorEl = document.getElementById('login-error');
        try {
            errorEl.hidden = true;
            Log.info('Loading playlist:', url);

            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            const text = await response.text();

            Log.info('Playlist downloaded, size:', text.length, 'bytes');

            const channels = parseM3U(text);
            Log.info('Parsed', channels.length, 'channels');

            if (channels.length === 0) {
                throw new Error('Playlist contains no channels');
            }

            const categories = groupByCategory(channels);
            Log.info('Categories:', [...categories.keys()].join(', '));

            /* Switch to channel browser */
            ui.render(categories);

        } catch (err) {
            Log.error('Playlist load failed:', err);
            errorEl.textContent = err.message;
            errorEl.hidden = false;
        }
    });
}

/* ── Inject CSS for browser-mode screens ─────────────────────────────── */

async function injectBrowserCSS() {
    const css = `
/* ====== Browser dev-mode styles (injected at runtime, Tizen never sees these) ====== */

/* Login screen */
.login-screen {
    display: flex; align-items: center; justify-content: center;
    width: 100%; height: 100%;
}
.login-card {
    background: var(--color-bg-elev-1);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--sp-6) var(--sp-7);
    max-width: 680px; width: 100%;
    box-shadow: var(--shadow-1);
    text-align: center;
}
.login-title {
    font-size: var(--fs-xl); font-weight: var(--fw-bold);
    display: flex; align-items: center; justify-content: center; gap: var(--sp-3);
    margin-bottom: var(--sp-2);
}
.login-play-icon {
    width: 0; height: 0;
    border-style: solid;
    border-width: 16px 0 16px 28px;
    border-color: transparent transparent transparent var(--color-accent);
    filter: drop-shadow(0 0 8px rgba(56, 132, 255, 0.4));
}
.login-subtitle {
    color: var(--color-text-muted); font-size: var(--fs-sm);
    margin-bottom: var(--sp-5);
}
.login-form { display: flex; flex-direction: column; gap: var(--sp-3); text-align: left; }
.login-label { font-size: var(--fs-sm); color: var(--color-text-muted); font-weight: var(--fw-medium); }
.login-input {
    background: var(--color-bg-elev-2); color: var(--color-text);
    border: 1px solid var(--color-border); border-radius: var(--radius-sm);
    padding: var(--sp-2) var(--sp-3); font-size: var(--fs-md);
    font-family: inherit; outline: none;
    transition: border-color var(--dur-fast) var(--ease-standard);
}
.login-input:focus { border-color: var(--color-accent); box-shadow: 0 0 0 3px rgba(56, 132, 255, 0.2); }
.login-btn {
    background: var(--color-accent); color: var(--color-accent-contrast);
    border: none; border-radius: var(--radius-sm);
    padding: var(--sp-2) var(--sp-4); font-size: var(--fs-md);
    font-weight: var(--fw-medium); cursor: pointer; font-family: inherit;
    transition: background var(--dur-fast) var(--ease-standard), transform var(--dur-fast);
}
.login-btn:hover { background: var(--color-accent-2); transform: scale(1.02); }
.login-btn:active { transform: scale(0.98); }
.login-error {
    margin-top: var(--sp-3); padding: var(--sp-2) var(--sp-3);
    background: rgba(255, 77, 94, 0.12); border: 1px solid var(--color-danger);
    border-radius: var(--radius-sm); color: var(--color-danger);
    font-size: var(--fs-sm); text-align: left;
}
.login-hint {
    margin-top: var(--sp-4); color: var(--color-text-muted);
    font-size: var(--fs-xs);
}
.login-hint code {
    background: var(--color-bg-elev-2); padding: 2px 8px;
    border-radius: 4px; font-size: inherit;
}

/* Channel browser layout */
.browser-layout {
    display: flex; height: 100%; width: 100%;
}
.cat-list {
    width: 360px; min-width: 360px;
    background: var(--color-bg-elev-1);
    border-right: 1px solid var(--color-border);
    padding: var(--sp-4) 0;
    overflow-y: auto;
    scrollbar-width: thin;
}
.cat-heading, .ch-heading {
    font-size: var(--fs-lg); font-weight: var(--fw-bold);
    padding: var(--sp-3) var(--sp-4);
    letter-spacing: 0.5px;
}
.cat-heading { color: var(--color-accent); }
#cat-items { list-style: none; }
.cat-item {
    display: flex; justify-content: space-between; align-items: center;
    padding: var(--sp-2) var(--sp-4);
    cursor: pointer;
    transition: background var(--dur-fast) var(--ease-standard);
    border-left: 4px solid transparent;
}
.cat-item:hover { background: var(--color-bg-elev-2); }
.cat-item.is-focused {
    background: var(--color-bg-elev-2);
    border-left-color: var(--color-accent);
    box-shadow: var(--shadow-focus);
}
.cat-name { font-size: var(--fs-md); }
.cat-count {
    background: var(--color-bg-elev-2); border-radius: 99px;
    padding: 2px 14px; font-size: var(--fs-xs);
    color: var(--color-text-muted);
}

/* Channel panel */
.ch-panel {
    flex: 1; overflow-y: auto; padding: var(--sp-4);
    scrollbar-width: thin;
}
.ch-grid { list-style: none; display: flex; flex-direction: column; gap: var(--sp-2); }
.ch-item {
    display: flex; align-items: center; gap: var(--sp-3);
    padding: var(--sp-2) var(--sp-3);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background var(--dur-fast) var(--ease-standard),
                box-shadow var(--dur-fast) var(--ease-standard);
}
.ch-item:hover { background: var(--color-bg-elev-1); }
.ch-item.is-focused {
    background: var(--color-bg-elev-1);
    box-shadow: var(--shadow-focus);
}
.ch-logo {
    width: 60px; height: 60px; border-radius: var(--radius-sm);
    object-fit: cover; background: var(--color-bg-elev-2);
    flex-shrink: 0;
}
.ch-logo-placeholder {
    display: flex; align-items: center; justify-content: center;
    font-size: var(--fs-lg); font-weight: var(--fw-bold);
    color: var(--color-accent); text-transform: uppercase;
}
.ch-name { font-size: var(--fs-md); }

.browser-footer {
    position: absolute; bottom: 0; left: 0; right: 0;
    display: flex; justify-content: center; gap: var(--sp-5);
    padding: var(--sp-2);
    background: var(--color-bg-elev-1);
    border-top: 1px solid var(--color-border);
    font-size: var(--fs-xs); color: var(--color-text-muted);
}

/* Player overlay */
.player-overlay {
    position: fixed; inset: 0; z-index: var(--z-player);
    background: #000; display: none;
    flex-direction: column;
}
.player-overlay.is-active { display: flex; }
.player-video { flex: 1; width: 100%; height: 100%; object-fit: contain; background: #000; }
.player-info-bar {
    position: absolute; top: 0; left: 0; right: 0;
    display: flex; justify-content: space-between; align-items: center;
    padding: var(--sp-3) var(--sp-4);
    background: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent);
    z-index: 1;
}
.player-ch-name { font-size: var(--fs-lg); font-weight: var(--fw-bold); }
.player-status { font-size: var(--fs-sm); color: var(--color-accent); }
.player-error {
    position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%);
    background: rgba(255, 77, 94, 0.15); border: 1px solid var(--color-danger);
    border-radius: var(--radius-sm); padding: var(--sp-2) var(--sp-4);
    color: var(--color-danger); font-size: var(--fs-sm);
    max-width: 80%; text-align: center; z-index: 1;
}
.player-hint {
    position: absolute; bottom: var(--sp-3); left: 50%; transform: translateX(-50%);
    font-size: var(--fs-xs); color: var(--color-text-muted);
    z-index: 1;
}
`;

    const style = document.createElement('style');
    style.id = 'browser-shim-css';
    style.textContent = css;
    document.head.appendChild(style);
}
