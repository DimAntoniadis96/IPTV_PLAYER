(() => {
  // js/input/Keys.js
  var KEY = Object.freeze({
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    ENTER: 13,
    RETURN: 10009,
    // Samsung "Back" / Return
    ESCAPE: 27,
    MEDIA_PLAY_PAUSE: 10252,
    MEDIA_PLAY: 415,
    MEDIA_PAUSE: 19,
    MEDIA_STOP: 413,
    MEDIA_FF: 417,
    MEDIA_RW: 412,
    MEDIA_TRACK_PREV: 10232,
    MEDIA_TRACK_NEXT: 10233,
    CH_UP: 427,
    CH_DOWN: 428,
    VOL_UP: 447,
    VOL_DOWN: 448,
    MUTE: 449,
    RED: 403,
    GREEN: 404,
    YELLOW: 405,
    BLUE: 406,
    INFO: 457,
    EXIT: 10182,
    D0: 48,
    D1: 49,
    D2: 50,
    D3: 51,
    D4: 52,
    D5: 53,
    D6: 54,
    D7: 55,
    D8: 56,
    D9: 57
  });
  var ACTION = Object.freeze({
    UP: "up",
    DOWN: "down",
    LEFT: "left",
    RIGHT: "right",
    OK: "ok",
    BACK: "back",
    PLAY: "play",
    PAUSE: "pause",
    PLAY_PAUSE: "playpause",
    STOP: "stop",
    FF: "ff",
    REW: "rew",
    CH_UP: "chup",
    CH_DOWN: "chdown",
    VOL_UP: "volup",
    VOL_DOWN: "voldown",
    MUTE: "mute",
    RED: "red",
    GREEN: "green",
    YELLOW: "yellow",
    BLUE: "blue",
    INFO: "info",
    EXIT: "exit",
    DIGIT: "digit"
  });
  var CODE_MAP = {
    [KEY.LEFT]: ACTION.LEFT,
    [KEY.UP]: ACTION.UP,
    [KEY.RIGHT]: ACTION.RIGHT,
    [KEY.DOWN]: ACTION.DOWN,
    [KEY.ENTER]: ACTION.OK,
    [KEY.RETURN]: ACTION.BACK,
    [KEY.ESCAPE]: ACTION.BACK,
    [KEY.MEDIA_PLAY_PAUSE]: ACTION.PLAY_PAUSE,
    [KEY.MEDIA_PLAY]: ACTION.PLAY,
    [KEY.MEDIA_PAUSE]: ACTION.PAUSE,
    [KEY.MEDIA_STOP]: ACTION.STOP,
    [KEY.MEDIA_FF]: ACTION.FF,
    [KEY.MEDIA_RW]: ACTION.REW,
    [KEY.MEDIA_TRACK_NEXT]: ACTION.CH_UP,
    [KEY.MEDIA_TRACK_PREV]: ACTION.CH_DOWN,
    [KEY.CH_UP]: ACTION.CH_UP,
    [KEY.CH_DOWN]: ACTION.CH_DOWN,
    [KEY.VOL_UP]: ACTION.VOL_UP,
    [KEY.VOL_DOWN]: ACTION.VOL_DOWN,
    [KEY.MUTE]: ACTION.MUTE,
    [KEY.RED]: ACTION.RED,
    [KEY.GREEN]: ACTION.GREEN,
    [KEY.YELLOW]: ACTION.YELLOW,
    [KEY.BLUE]: ACTION.BLUE,
    [KEY.INFO]: ACTION.INFO,
    [KEY.EXIT]: ACTION.EXIT
  };
  var DESKTOP_MAP = {
    ArrowLeft: ACTION.LEFT,
    ArrowUp: ACTION.UP,
    ArrowRight: ACTION.RIGHT,
    ArrowDown: ACTION.DOWN,
    Enter: ACTION.OK,
    Backspace: ACTION.BACK,
    Escape: ACTION.BACK,
    " ": ACTION.PLAY_PAUSE,
    f: ACTION.FF,
    F: ACTION.FF,
    r: ACTION.REW,
    R: ACTION.REW,
    PageUp: ACTION.CH_UP,
    PageDown: ACTION.CH_DOWN,
    m: ACTION.MUTE,
    M: ACTION.MUTE,
    i: ACTION.INFO,
    I: ACTION.INFO
  };
  function resolveAction(e) {
    const code = e.keyCode || e.which;
    if (code >= KEY.D0 && code <= KEY.D9) return { action: ACTION.DIGIT, digit: code - KEY.D0 };
    if (/^[0-9]$/.test(e.key)) return { action: ACTION.DIGIT, digit: Number(e.key) };
    if (CODE_MAP[code] != null) return { action: CODE_MAP[code] };
    if (DESKTOP_MAP[e.key] != null) return { action: DESKTOP_MAP[e.key] };
    return null;
  }
  var REGISTER_KEYS = Object.freeze([
    "MediaPlayPause",
    "MediaPlay",
    "MediaPause",
    "MediaStop",
    "MediaFastForward",
    "MediaRewind",
    "MediaTrackPrevious",
    "MediaTrackNext",
    "ChannelUp",
    "ChannelDown",
    "ColorF0Red",
    "ColorF1Green",
    "ColorF2Yellow",
    "ColorF3Blue",
    "Info",
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9"
    // Volume keys intentionally left to the TV's native OSD by default.
  ]);

  // js/core/Logger.js
  var LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };
  var SENSITIVE_PARAMS = /([?&](?:username|password|user|pass|pwd|token|auth|api_key)=)[^&#\s]*/gi;
  var SENSITIVE_PATH = /(\/(?:live|movie|series)\/)[^/\s]+\/[^/\s]+(\/)/gi;
  var SENSITIVE_KEYS = /^(username|password|user|pass|pwd|token|auth|apikey|api_key)$/i;
  function redactString(str) {
    return String(str).replace(SENSITIVE_PARAMS, "$1***").replace(SENSITIVE_PATH, "$1***/***$2");
  }
  function redactValue(value, seen = /* @__PURE__ */ new WeakSet(), depth = 0) {
    if (value == null) return value;
    if (typeof value === "string") return redactString(value);
    if (typeof value !== "object") return value;
    if (depth > 4) return "[\u2026]";
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    if (Array.isArray(value)) {
      return value.slice(0, 50).map((v) => redactValue(v, seen, depth + 1));
    }
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE_KEYS.test(k) ? "***" : redactValue(v, seen, depth + 1);
    }
    return out;
  }
  var Logger = class _Logger {
    /** @param {string} scope @param {keyof LEVELS} level */
    constructor(scope = "app", level = "info") {
      this.scope = scope;
      this.setLevel(level);
    }
    /** @param {keyof LEVELS} level */
    setLevel(level) {
      var _a;
      this._threshold = (_a = LEVELS[level]) != null ? _a : LEVELS.info;
    }
    /** Create a scoped child logger sharing the same threshold. */
    child(scope) {
      const l = new _Logger(`${this.scope}:${scope}`);
      l._threshold = this._threshold;
      return l;
    }
    _emit(method, weight, args) {
      if (weight < this._threshold) return;
      const safe = args.map((a) => redactValue(a));
      (console[method] || console.log).call(console, `[${this.scope}]`, ...safe);
    }
    debug(...a) {
      this._emit("debug", LEVELS.debug, a);
    }
    info(...a) {
      this._emit("info", LEVELS.info, a);
    }
    warn(...a) {
      this._emit("warn", LEVELS.warn, a);
    }
    error(...a) {
      this._emit("error", LEVELS.error, a);
    }
  };
  var logger = new Logger("iptv", "debug");

  // js/core/EventBus.js
  var log = logger.child("EventBus");
  var EventBus = class {
    constructor() {
      this._handlers = /* @__PURE__ */ new Map();
    }
    /**
     * Subscribe to an event.
     * @param {string} type
     * @param {Function} handler
     * @returns {() => void} unsubscribe function
     */
    on(type, handler) {
      if (typeof handler !== "function") throw new TypeError("handler must be a function");
      if (!this._handlers.has(type)) this._handlers.set(type, /* @__PURE__ */ new Set());
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
      for (const handler of [...set]) {
        try {
          handler(payload);
        } catch (err) {
          log.error(`handler for "${type}" threw`, err);
        }
      }
    }
    /** Remove every handler (used on teardown). */
    clear() {
      this._handlers.clear();
    }
  };
  var bus = new EventBus();

  // js/input/FocusManager.js
  var FOCUSABLE = ".focusable:not([disabled]):not(.is-hidden)";
  var FocusManager = class {
    constructor() {
      this.current = null;
      this.root = document.getElementById("app") || document.body;
    }
    /** Set the container to search within (usually the active screen). */
    setRoot(root2) {
      this.root = root2 || document.body;
    }
    /** Collect visible focusable elements under the current root. */
    _candidates() {
      const list = this.root.querySelectorAll(FOCUSABLE);
      const out = [];
      for (const el2 of list) {
        const r = el2.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) out.push(el2);
      }
      return out;
    }
    /** Center point of an element rect. */
    _center(el2) {
      const r = el2.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, r };
    }
    /**
     * Focus a specific element, updating classes and firing hooks.
     * @param {HTMLElement|null} el
     */
    setFocus(el2) {
      if (!el2 || el2 === this.current) {
        if (el2) this._ensureVisible(el2);
        return;
      }
      if (this.current) {
        this.current.classList.remove("is-focused");
        if (typeof this.current.onBlur === "function") this.current.onBlur();
      }
      this.current = el2;
      el2.classList.add("is-focused");
      this._ensureVisible(el2);
      if (typeof el2.onFocus === "function") el2.onFocus();
      bus.emit("focus:changed", el2);
    }
    /** Focus the first focusable (optionally within a container). */
    focusFirst(container) {
      const root2 = container || this.root;
      const el2 = root2.querySelector(FOCUSABLE);
      if (el2) this.setFocus(el2);
      return el2;
    }
    /** Re-focus current if it left the DOM (after a re-render). */
    refocus() {
      if (!this.current || !document.contains(this.current)) {
        this.current = null;
        this.focusFirst();
      }
    }
    /**
     * Handle a semantic action. Returns true if it was a navigation/OK key.
     * Wired as RemoteControl's default (fallback) handler.
     * @param {string} action
     */
    handle(action) {
      switch (action) {
        case ACTION.LEFT:
          this.move("left");
          return true;
        case ACTION.RIGHT:
          this.move("right");
          return true;
        case ACTION.UP:
          this.move("up");
          return true;
        case ACTION.DOWN:
          this.move("down");
          return true;
        case ACTION.OK:
          this.select();
          return true;
        default:
          return false;
      }
    }
    /** Activate the focused element. */
    select() {
      const el2 = this.current;
      if (!el2) return;
      if (typeof el2.onSelect === "function") el2.onSelect();
      else el2.click();
    }
    /**
     * Move focus in a direction to the geometrically nearest candidate.
     * @param {'left'|'right'|'up'|'down'} dir
     */
    move(dir) {
      if (!this.current) {
        this.focusFirst();
        return;
      }
      const from = this._center(this.current);
      let best = null;
      let bestScore = Infinity;
      for (const el2 of this._candidates()) {
        if (el2 === this.current) continue;
        const to = this._center(el2);
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        let primary, cross;
        if (dir === "left") {
          if (dx >= -2) continue;
          primary = -dx;
          cross = Math.abs(dy);
        } else if (dir === "right") {
          if (dx <= 2) continue;
          primary = dx;
          cross = Math.abs(dy);
        } else if (dir === "up") {
          if (dy >= -2) continue;
          primary = -dy;
          cross = Math.abs(dx);
        } else {
          if (dy <= 2) continue;
          primary = dy;
          cross = Math.abs(dx);
        }
        const score = primary + cross * 2;
        if (score < bestScore) {
          bestScore = score;
          best = el2;
        }
      }
      if (best) this.setFocus(best);
    }
    /** Keep the focused element within view (delegates to native scroll). */
    _ensureVisible(el2) {
      if (typeof el2.scrollIntoViewIfNeeded === "function") {
        el2.scrollIntoViewIfNeeded(false);
      } else if (typeof el2.scrollIntoView === "function") {
        el2.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    }
  };
  var focus = new FocusManager();

  // js/core/constants.js
  var APP_VERSION = "1.0.0";
  var DB = Object.freeze({
    NAME: "iptv-player",
    VERSION: 1,
    STORES: Object.freeze({
      CATEGORIES: "categories",
      // { key, accountId, type, items[] }
      STREAMS: "streams",
      // { key, accountId, type, categoryId, items[] }
      META: "meta"
      // { key, value } misc cache metadata
    })
  });
  var LS = Object.freeze({
    ACCOUNTS: "iptv.accounts",
    ACTIVE_ACCOUNT: "iptv.activeAccountId",
    SETTINGS: "iptv.settings",
    FAVORITES: "iptv.favorites",
    HISTORY: "iptv.history"
  });
  var LOGIN_METHOD = Object.freeze({
    XTREAM: "xtream",
    // server + username + password
    M3U: "m3u"
    // pasted playlist URL
  });
  var SECTION = Object.freeze({
    LIVE: "live",
    MOVIE: "movie",
    SERIES: "series",
    FAVORITES: "favorites",
    RECENT: "recent",
    SEARCH: "search"
  });
  var STREAM_TYPE = Object.freeze({
    live: SECTION.LIVE,
    movie: SECTION.MOVIE,
    series: SECTION.SERIES
  });
  var NET = Object.freeze({
    TIMEOUT_MS: 15e3,
    // per-request timeout
    RETRIES: 2,
    // extra attempts on transient failure
    RETRY_BASE_MS: 600,
    // backoff base (exponential)
    MAX_PLAYLIST_BYTES: 80 * 1024 * 1024
    // safety cap for M3U downloads (~80MB)
  });
  var VIEW = Object.freeze({
    LOGIN: "login",
    ACCOUNTS: "accounts",
    HOME: "home",
    LIST: "list",
    DETAIL: "detail",
    SEARCH: "search",
    SETTINGS: "settings",
    PLAYER: "player"
  });
  var EVENT = Object.freeze({
    APP_READY: "app:ready",
    NAV_TO: "nav:to",
    NAV_BACK: "nav:back",
    ACCOUNT_CHANGED: "account:changed",
    PLAYLIST_PROGRESS: "playlist:progress",
    PLAYLIST_READY: "playlist:ready",
    PLAYLIST_ERROR: "playlist:error",
    TOAST: "ui:toast",
    KEY: "input:key"
  });

  // js/input/RemoteControl.js
  var log2 = logger.child("Remote");
  var RemoteControl = class {
    constructor() {
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
      document.addEventListener("keydown", this._onKeyDown, false);
      log2.info("remote control started");
    }
    stop() {
      if (!this._started) return;
      document.removeEventListener("keydown", this._onKeyDown, false);
      this._started = false;
    }
    _registerTvKeys() {
      const tvinput = typeof tizen !== "undefined" && tizen.tvinputdevice;
      if (!tvinput) {
        log2.info("tvinputdevice unavailable (desktop dev mode)");
        return;
      }
      for (const name of REGISTER_KEYS) {
        try {
          tvinput.registerKey(name);
        } catch (e) {
        }
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
    setDefaultHandler(fn) {
      this._defaultHandler = fn;
    }
    /** True when a native text field is being edited (IME/keyboard active). */
    _isEditing() {
      const a = document.activeElement;
      if (!a) return false;
      const tag = a.tagName;
      return (tag === "INPUT" || tag === "TEXTAREA") && !a.readOnly && !a.disabled;
    }
    _onKeyDown(e) {
      const resolved = resolveAction(e);
      if (!resolved) return;
      if (this._isEditing()) {
        const code = e.keyCode || e.which;
        if (code === KEY.RETURN || code === KEY.ESCAPE) {
          e.preventDefault();
          document.activeElement.blur();
        }
        return;
      }
      e.preventDefault();
      const payload = { digit: resolved.digit, originalEvent: e };
      bus.emit(EVENT.KEY, { action: resolved.action, ...payload });
      for (let i = this._handlers.length - 1; i >= 0; i--) {
        try {
          if (this._handlers[i](resolved.action, payload) === true) return;
        } catch (err) {
          log2.error("key handler threw", err);
        }
      }
      if (this._defaultHandler) this._defaultHandler(resolved.action, payload);
    }
  };
  var remote = new RemoteControl();

  // js/ui/Router.js
  var log3 = logger.child("Router");
  var Router = class {
    /** @param {HTMLElement} container  the #app mount point */
    constructor(container) {
      this.container = container;
      this.stack = [];
      this._factories = /* @__PURE__ */ new Map();
      remote.setDefaultHandler((action, payload) => this.handleKey(action, payload));
    }
    /** Register a screen factory for a view name. */
    register(view, factory) {
      this._factories.set(view, factory);
      return this;
    }
    get top() {
      var _a;
      return ((_a = this.stack[this.stack.length - 1]) == null ? void 0 : _a.screen) || null;
    }
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
      log3.info("navigate ->", view);
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
      if (this.stack.length <= 1) {
        this._exitApp();
        return;
      }
      const { screen } = this.stack.pop();
      screen.unmount();
      const below = this.top;
      if (below) below.show();
    }
    /** Central key dispatch (installed as RemoteControl's default handler). */
    handleKey(action, payload) {
      if (action === ACTION.EXIT) {
        this._exitApp();
        return;
      }
      const screen = this.top;
      if (screen && screen.onKey && screen.onKey(action, payload) === true) return;
      if (action === ACTION.BACK) {
        if (screen && typeof screen.onBack === "function") {
          if (screen.onBack() === true) return;
        }
        this.back();
        return;
      }
      focus.handle(action);
    }
    /** Cleanly exit the Tizen application (no-op in a browser). */
    _exitApp() {
      try {
        if (typeof tizen !== "undefined" && tizen.application) {
          tizen.application.getCurrentApplication().exit();
          return;
        }
      } catch (e) {
        log3.warn("exit failed", e);
      }
      log3.info("exit requested (no-op off-device)");
    }
  };

  // js/utils/dom.js
  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (value == null) continue;
      if (key === "class" || key === "className") {
        node.className = value;
      } else if (key === "dataset") {
        for (const [dk, dv] of Object.entries(value)) node.dataset[dk] = dv;
      } else if (key === "style" && typeof value === "object") {
        Object.assign(node.style, value);
      } else if (key === "html") {
        node.innerHTML = value;
      } else if (key === "text") {
        node.textContent = value;
      } else if (key.startsWith("on") && typeof value === "function") {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key in node && key !== "list") {
        try {
          node[key] = value;
        } catch {
          node.setAttribute(key, value);
        }
      } else {
        node.setAttribute(key, value);
      }
    }
    appendChildren(node, children);
    return node;
  }
  function appendChildren(node, children) {
    if (children == null) return node;
    const list = Array.isArray(children) ? children : [children];
    for (const c of list) {
      if (c == null || c === false) continue;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return node;
  }
  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }
  function lazyImage(src, opts = {}) {
    const img = el("img", { class: "lazy-img", alt: opts.alt || "", decoding: "async" });
    img._pendingSrc = src || "";
    img.load = () => {
      if (!img._pendingSrc) {
        img.classList.add("is-empty");
        return;
      }
      img.onerror = () => {
        img.classList.add("is-error");
        img.removeAttribute("src");
      };
      img.onload = () => img.classList.add("is-loaded");
      img.src = img._pendingSrc;
    };
    return img;
  }

  // js/ui/components/Toast.js
  var root = null;
  function initToasts() {
    root = document.getElementById("toast-root");
    bus.on(EVENT.TOAST, ({ message, type, duration } = {}) => show(message, type, duration));
  }
  function show(message, type = "info", duration = 3200) {
    if (!root || !message) return;
    const node = el("div", { class: `toast toast--${type}`, role: "status" }, String(message));
    root.appendChild(node);
    requestAnimationFrame(() => node.classList.add("is-visible"));
    setTimeout(() => {
      node.classList.remove("is-visible");
      setTimeout(() => node.remove(), 300);
    }, duration);
  }
  function toast(message, type = "info", duration) {
    bus.emit(EVENT.TOAST, { message, type, duration });
  }

  // js/core/Prefs.js
  var log4 = logger.child("Prefs");
  var Prefs = class {
    constructor() {
      this._available = (() => {
        try {
          const k = "__probe__";
          localStorage.setItem(k, "1");
          localStorage.removeItem(k);
          return true;
        } catch {
          return false;
        }
      })();
      this._mem = /* @__PURE__ */ new Map();
    }
    /**
     * Read and JSON-parse a key.
     * @template T
     * @param {string} key @param {T} [fallback]
     * @returns {T}
     */
    get(key, fallback = null) {
      try {
        const raw = this._available ? localStorage.getItem(key) : this._mem.get(key);
        if (raw == null) return fallback;
        return JSON.parse(raw);
      } catch (e) {
        log4.warn("get failed, using fallback", key);
        return fallback;
      }
    }
    /**
     * JSON-encode and store a value.
     * @param {string} key @param {*} value
     * @returns {boolean} success
     */
    set(key, value) {
      try {
        const raw = JSON.stringify(value);
        if (this._available) localStorage.setItem(key, raw);
        else this._mem.set(key, raw);
        return true;
      } catch (e) {
        log4.error("set failed", key, e && e.name);
        return false;
      }
    }
    /** Remove a key. */
    remove(key) {
      try {
        if (this._available) localStorage.removeItem(key);
        else this._mem.delete(key);
      } catch (e) {
        log4.warn("remove failed", key);
      }
    }
  };
  var prefs = new Prefs();

  // js/core/UrlBuilder.js
  function normalizeServer(input) {
    let s = String(input || "").trim();
    if (!s) return "";
    if (!/^https?:\/\//i.test(s)) s = "http://" + s;
    try {
      const u = new URL(s);
      const port = u.port ? ":" + u.port : "";
      return `${u.protocol}//${u.hostname}${port}`;
    } catch {
      return s.replace(/\/+$/, "");
    }
  }
  var enc = (v) => encodeURIComponent(String(v != null ? v : ""));
  var XtreamUrls = class {
    /**
     * @param {{serverUrl:string, username:string, password:string,
     *          streamFormat?:string}} account
     */
    constructor(account) {
      this.server = normalizeServer(account.serverUrl);
      this.username = account.username;
      this.password = account.password;
      this.liveExt = account.streamFormat || "ts";
      this._auth = `username=${enc(this.username)}&password=${enc(this.password)}`;
    }
    /** player_api.php base with credentials. */
    api(action, params = {}) {
      const extra = Object.entries(params).map(([k, v]) => `&${k}=${enc(v)}`).join("");
      const a = action ? `&action=${enc(action)}` : "";
      return `${this.server}/player_api.php?${this._auth}${a}${extra}`;
    }
    /** Account/auth probe (returns user_info + server_info). */
    accountInfo() {
      return this.api("");
    }
    liveCategories() {
      return this.api("get_live_categories");
    }
    vodCategories() {
      return this.api("get_vod_categories");
    }
    seriesCategories() {
      return this.api("get_series_categories");
    }
    liveStreams(categoryId) {
      return this.api("get_live_streams", categoryId != null ? { category_id: categoryId } : {});
    }
    vodStreams(categoryId) {
      return this.api("get_vod_streams", categoryId != null ? { category_id: categoryId } : {});
    }
    seriesList(categoryId) {
      return this.api("get_series", categoryId != null ? { category_id: categoryId } : {});
    }
    seriesInfo(seriesId) {
      return this.api("get_series_info", { series_id: seriesId });
    }
    vodInfo(vodId) {
      return this.api("get_vod_info", { vod_id: vodId });
    }
    /** Full M3U export URL (used as an alternative/verification). */
    m3u() {
      return `${this.server}/get.php?${this._auth}&type=m3u_plus&output=${enc(this.liveExt)}`;
    }
    /** Playable stream URL for a LIVE channel. */
    liveStreamUrl(streamId) {
      return `${this.server}/live/${enc(this.username)}/${enc(this.password)}/${streamId}.${this.liveExt}`;
    }
    /** Playable stream URL for a MOVIE (VOD). `ext` from stream metadata. */
    movieStreamUrl(streamId, ext = "mp4") {
      return `${this.server}/movie/${enc(this.username)}/${enc(this.password)}/${streamId}.${ext}`;
    }
    /** Playable stream URL for a SERIES EPISODE. */
    seriesStreamUrl(episodeId, ext = "mp4") {
      return `${this.server}/series/${enc(this.username)}/${enc(this.password)}/${episodeId}.${ext}`;
    }
  };

  // js/data/AccountManager.js
  function uid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "acc_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  var AccountManager = class {
    constructor() {
      this._accounts = prefs.get(LS.ACCOUNTS, []);
      this._activeId = prefs.get(LS.ACTIVE_ACCOUNT, null);
    }
    /** @returns {Account[]} shallow copy so callers can't mutate internals. */
    list() {
      return this._accounts.map((a) => ({ ...a }));
    }
    /** @returns {number} */
    get count() {
      return this._accounts.length;
    }
    /** @param {string} id @returns {Account|null} */
    get(id) {
      const a = this._accounts.find((x) => x.id === id);
      return a ? { ...a } : null;
    }
    /** @returns {Account|null} the currently active account. */
    getActive() {
      if (!this._activeId) return null;
      return this.get(this._activeId);
    }
    /** @param {string|null} id */
    setActive(id) {
      this._activeId = id;
      prefs.set(LS.ACTIVE_ACCOUNT, id);
      const acc = this.getActive();
      if (acc) {
        acc.lastUsedAt = Date.now();
        this._replace(acc);
      }
      bus.emit(EVENT.ACCOUNT_CHANGED, acc);
      return acc;
    }
    /**
     * Validate + normalise raw form input into a persistable Account.
     * @param {Partial<Account>} data
     * @returns {{account?:Account, error?:string}}
     */
    _sanitize(data) {
      const method = data.method === LOGIN_METHOD.M3U ? LOGIN_METHOD.M3U : LOGIN_METHOD.XTREAM;
      const name = String(data.name || "").trim() || "My Playlist";
      const streamFormat = data.streamFormat === "m3u8" ? "m3u8" : "ts";
      if (method === LOGIN_METHOD.XTREAM) {
        const serverUrl = normalizeServer(data.serverUrl);
        const username = String(data.username || "").trim();
        const password = String(data.password || "");
        if (!serverUrl) return { error: "Server URL is required." };
        if (!username) return { error: "Username is required." };
        if (!password) return { error: "Password is required." };
        return { account: { method, name, serverUrl, username, password, streamFormat } };
      }
      const m3uUrl = String(data.m3uUrl || "").trim();
      if (!/^https?:\/\//i.test(m3uUrl)) return { error: "A valid M3U URL (http/https) is required." };
      return { account: { method, name, m3uUrl, streamFormat } };
    }
    /**
     * Add a new account.
     * @param {Partial<Account>} data
     * @returns {{account?:Account, error?:string}}
     */
    add(data) {
      const { account, error } = this._sanitize(data);
      if (error) return { error };
      account.id = uid();
      account.createdAt = Date.now();
      account.lastUsedAt = 0;
      this._accounts.push(account);
      this._save();
      return { account: { ...account } };
    }
    /**
     * Edit an existing account. Empty password on an xtream edit keeps the
     * previous password (so the field can be left blank when editing).
     * @param {string} id @param {Partial<Account>} data
     * @returns {{account?:Account, error?:string}}
     */
    update(id, data) {
      const existing = this._accounts.find((a) => a.id === id);
      if (!existing) return { error: "Account not found." };
      const merged = { ...existing, ...data };
      if (existing.method === LOGIN_METHOD.XTREAM && (data.password === "" || data.password == null)) {
        merged.password = existing.password;
      }
      const { account, error } = this._sanitize(merged);
      if (error) return { error };
      account.id = existing.id;
      account.createdAt = existing.createdAt;
      account.lastUsedAt = existing.lastUsedAt;
      this._replace(account);
      return { account: { ...account } };
    }
    /** Delete an account (and clear active if it was active). */
    remove(id) {
      var _a;
      this._accounts = this._accounts.filter((a) => a.id !== id);
      if (this._activeId === id) this.setActive(((_a = this._accounts[0]) == null ? void 0 : _a.id) || null);
      this._save();
    }
    /** Replace one account in place and persist. */
    _replace(account) {
      const i = this._accounts.findIndex((a) => a.id === account.id);
      if (i >= 0) {
        this._accounts[i] = account;
        this._save();
      }
    }
    _save() {
      prefs.set(LS.ACCOUNTS, this._accounts);
    }
  };
  var accounts = new AccountManager();

  // js/core/Http.js
  var log5 = logger.child("Http");
  var HttpError = class extends Error {
    /** @param {string} message @param {object} [info] */
    constructor(message, info = {}) {
      var _a, _b, _c;
      super(message);
      this.name = "HttpError";
      this.status = (_a = info.status) != null ? _a : 0;
      this.kind = (_b = info.kind) != null ? _b : "http";
      this.url = (_c = info.url) != null ? _c : "";
    }
  };
  function isRetryable(err) {
    if (err.kind === "timeout" || err.kind === "network") return true;
    if (err.kind === "http" && err.status >= 500) return true;
    return false;
  }
  var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function fetchWithTimeout(url, options = {}) {
    var _a;
    const timeout = (_a = options.timeout) != null ? _a : NET.TIMEOUT_MS;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    if (options.signal) {
      if (options.signal.aborted) controller.abort();
      else options.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (err) {
      const timedOut = controller.signal.aborted && !(options.signal && options.signal.aborted);
      throw new HttpError(timedOut ? "Request timed out" : "Network request failed", {
        url,
        kind: timedOut ? "timeout" : options.signal && options.signal.aborted ? "abort" : "network"
      });
    } finally {
      clearTimeout(timer);
    }
  }
  async function request(url, options = {}) {
    var _a;
    const retries = (_a = options.retries) != null ? _a : NET.RETRIES;
    let attempt = 0;
    while (true) {
      try {
        const res = await fetchWithTimeout(url, options);
        if (!res.ok) {
          throw new HttpError(`HTTP ${res.status}`, { url, status: res.status, kind: "http" });
        }
        return res;
      } catch (err) {
        const e = err instanceof HttpError ? err : new HttpError(String(err && err.message), { url, kind: "network" });
        if (e.kind === "abort") throw e;
        if (attempt < retries && isRetryable(e)) {
          const delay = NET.RETRY_BASE_MS * Math.pow(2, attempt);
          log5.warn(`retry ${attempt + 1}/${retries} in ${delay}ms for`, url, `(${e.kind}${e.status ? " " + e.status : ""})`);
          await sleep(delay);
          attempt += 1;
          continue;
        }
        throw e;
      }
    }
  }
  async function getJson(url, options = {}) {
    const res = await request(url, { ...options, method: "GET" });
    const text = await res.text();
    if (!text || !text.trim()) return null;
    try {
      return JSON.parse(text);
    } catch {
      throw new HttpError("Invalid JSON in server response", { url, status: res.status, kind: "http" });
    }
  }
  async function streamLines(url, onLine, options = {}) {
    const res = await request(url, { ...options, method: "GET" });
    if (!res.body || !res.body.getReader) {
      const text = await res.text();
      for (const line of text.split(/\r?\n/)) onLine(line);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > NET.MAX_PLAYLIST_BYTES) {
          reader.cancel();
          throw new HttpError("Playlist too large", { url, kind: "http" });
        }
        if (options.onProgress) options.onProgress(bytes);
        buffer += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).replace(/\r$/, "");
          buffer = buffer.slice(nl + 1);
          onLine(line);
        }
      }
      if (buffer.length) onLine(buffer.replace(/\r$/, ""));
    } catch (err) {
      if (err instanceof HttpError) throw err;
      const aborted = options.signal && options.signal.aborted || err && err.name === "AbortError";
      throw new HttpError(aborted ? "Stream aborted" : "Stream read failed", {
        url,
        kind: aborted ? "abort" : "network"
      });
    }
  }

  // js/data/AuthService.js
  var log6 = logger.child("Auth");
  var AUTH = Object.freeze({
    OK: "ok",
    AUTH_FAILED: "auth_failed",
    EXPIRED: "expired",
    UNAVAILABLE: "server_unavailable",
    INVALID: "invalid",
    NETWORK: "network"
  });
  var MESSAGES = {
    [AUTH.OK]: "Connected successfully.",
    [AUTH.AUTH_FAILED]: "Login failed. Please check your username and password.",
    [AUTH.EXPIRED]: "This account has expired.",
    [AUTH.UNAVAILABLE]: "Server is unavailable. Please try again later.",
    [AUTH.INVALID]: "The server returned an invalid playlist.",
    [AUTH.NETWORK]: "Network error. Check your internet connection."
  };
  function classifyHttpError(err) {
    if (err instanceof HttpError) {
      if (err.kind === "timeout" || err.kind === "network") return AUTH.UNAVAILABLE;
      if (err.kind === "http" && (err.status === 401 || err.status === 403)) return AUTH.AUTH_FAILED;
      if (err.kind === "http") return AUTH.UNAVAILABLE;
    }
    return AUTH.NETWORK;
  }
  function result(status, info) {
    return { status, ok: status === AUTH.OK, message: MESSAGES[status] || "Unknown error.", info };
  }
  async function validate(account, opts = {}) {
    try {
      if (account.method === LOGIN_METHOD.XTREAM) {
        return await validateXtream(account, opts);
      }
      return await validateM3U(account, opts);
    } catch (err) {
      log6.warn("validation error", err && err.kind, err && err.status);
      return result(classifyHttpError(err));
    }
  }
  async function validateXtream(account, opts) {
    const urls = new XtreamUrls(account);
    const data = await getJson(urls.accountInfo(), { signal: opts.signal });
    if (!data || !data.user_info) return result(AUTH.AUTH_FAILED);
    const u = data.user_info;
    if (Number(u.auth) === 0) return result(AUTH.AUTH_FAILED);
    const status = String(u.status || "").toLowerCase();
    if (status === "expired") return result(AUTH.EXPIRED, data);
    if (status && status !== "active") return result(AUTH.AUTH_FAILED, data);
    if (u.exp_date) {
      const exp = Number(u.exp_date) * 1e3;
      if (Number.isFinite(exp) && exp < Date.now()) return result(AUTH.EXPIRED, data);
    }
    return result(AUTH.OK, data);
  }
  async function validateM3U(account, opts) {
    let sawHeader = false;
    let sawEntry = false;
    let checked = 0;
    const stop = new AbortController();
    if (opts.signal) opts.signal.addEventListener("abort", () => stop.abort(), { once: true });
    try {
      await streamLines(account.m3uUrl, (line) => {
        const t = line.trim();
        if (!t) return;
        checked += 1;
        if (t.toUpperCase().startsWith("#EXTM3U")) sawHeader = true;
        if (t.startsWith("#EXTINF")) sawEntry = true;
        if (sawHeader && sawEntry) stop.abort();
        if (checked > 50 && !sawHeader) stop.abort();
      }, { signal: stop.signal });
    } catch (err) {
      if (err instanceof HttpError && err.kind === "abort") {
      } else {
        return result(classifyHttpError(err));
      }
    }
    if (sawHeader) return result(AUTH.OK);
    return result(AUTH.INVALID);
  }

  // js/core/Store.js
  var log7 = logger.child("Store");
  var Store = class {
    constructor() {
      this._db = null;
      this._openPromise = null;
      this._available = typeof indexedDB !== "undefined";
    }
    /** Whether IndexedDB exists in this environment. */
    get available() {
      return this._available;
    }
    /**
     * Open (and lazily create) the database. Safe to call repeatedly.
     * @returns {Promise<IDBDatabase>}
     */
    open() {
      if (!this._available) return Promise.reject(new Error("IndexedDB unavailable"));
      if (this._db) return Promise.resolve(this._db);
      if (this._openPromise) return this._openPromise;
      this._openPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB.NAME, DB.VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          for (const name of Object.values(DB.STORES)) {
            if (!db.objectStoreNames.contains(name)) {
              db.createObjectStore(name, { keyPath: "key" });
            }
          }
        };
        req.onsuccess = () => {
          this._db = req.result;
          this._db.onversionchange = () => this.close();
          resolve(this._db);
        };
        req.onerror = () => reject(req.error);
      });
      return this._openPromise;
    }
    /** @returns {Promise<IDBTransaction store>} internal helper */
    async _tx(storeName, mode) {
      const db = await this.open();
      return db.transaction(storeName, mode).objectStore(storeName);
    }
    /**
     * Put a record ({ key, ... }) into a store.
     * @param {string} storeName @param {object} record must contain `key`
     */
    async put(storeName, record) {
      const store2 = await this._tx(storeName, "readwrite");
      return this._wrap(store2.put(record));
    }
    /**
     * Bulk put many records in one transaction (fast for big catalogs).
     * @param {string} storeName @param {object[]} records
     */
    async bulkPut(storeName, records) {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store2 = tx.objectStore(storeName);
        for (const r of records) store2.put(r);
        tx.oncomplete = () => resolve(records.length);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    }
    /** Get a record by key (or null). */
    async get(storeName, key) {
      const store2 = await this._tx(storeName, "readonly");
      const rec = await this._wrap(store2.get(key));
      return rec != null ? rec : null;
    }
    /** Delete a record by key. */
    async delete(storeName, key) {
      const store2 = await this._tx(storeName, "readwrite");
      return this._wrap(store2.delete(key));
    }
    /** Clear an entire object store. */
    async clearStore(storeName) {
      const store2 = await this._tx(storeName, "readwrite");
      return this._wrap(store2.clear());
    }
    /** Wipe every store (Settings → Clear cache). */
    async clearAll() {
      for (const name of Object.values(DB.STORES)) {
        try {
          await this.clearStore(name);
        } catch (e) {
          log7.warn("clear failed", name, e);
        }
      }
    }
    close() {
      if (this._db) {
        this._db.close();
        this._db = null;
        this._openPromise = null;
      }
    }
    /** Promisify an IDBRequest. */
    _wrap(req) {
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
  };
  var store = new Store();

  // js/data/XtreamClient.js
  var log8 = logger.child("Xtream");
  function mapCategory(raw) {
    return { id: String(raw.category_id), name: raw.category_name || "Unknown" };
  }
  var XtreamClient = class {
    /** @param {import('./AccountManager.js').Account} account */
    constructor(account) {
      this.account = account;
      this.urls = new XtreamUrls(account);
    }
    /** GET account/server info (used for expiry display in Settings). */
    async accountInfo(opts) {
      return getJson(this.urls.accountInfo(), opts);
    }
    /**
     * Fetch categories for a section.
     * @param {'live'|'movie'|'series'} section
     * @returns {Promise<{id:string,name:string}[]>}
     */
    async categories(section, opts) {
      const url = section === SECTION.LIVE ? this.urls.liveCategories() : section === SECTION.MOVIE ? this.urls.vodCategories() : this.urls.seriesCategories();
      const data = await getJson(url, opts);
      if (!Array.isArray(data)) return [];
      return data.map(mapCategory);
    }
    /**
     * Fetch streams for one category of a section, normalized to the shared
     * item model. `categoryId` may be null to fetch all (large!).
     * @returns {Promise<object[]>}
     */
    async streams(section, categoryId, opts) {
      if (section === SECTION.LIVE) {
        const data2 = await getJson(this.urls.liveStreams(categoryId), opts);
        return this._mapLive(data2);
      }
      if (section === SECTION.MOVIE) {
        const data2 = await getJson(this.urls.vodStreams(categoryId), opts);
        return this._mapMovie(data2);
      }
      const data = await getJson(this.urls.seriesList(categoryId), opts);
      return this._mapSeries(data);
    }
    /**
     * Fetch full series info (seasons + episodes + metadata) for a series id.
     * @returns {Promise<{seasons: object[], info: object}>}
     */
    async seriesInfo(seriesId, opts) {
      const data = await getJson(this.urls.seriesInfo(seriesId), opts);
      return this._mapSeriesEpisodes(seriesId, data);
    }
    /**
     * Fetch full movie (VOD) info: plot, genre, rating, cover + play URL.
     * @returns {Promise<object|null>}
     */
    async movieInfo(streamId, opts) {
      const data = await getJson(this.urls.vodInfo(streamId), opts);
      const info = data && data.info || {};
      const md = data && data.movie_data || {};
      const ext = md.container_extension || "mp4";
      return {
        plot: info.plot || info.description || "",
        genre: info.genre || "",
        rating: info.rating || "",
        releaseDate: info.releasedate || info.release_date || "",
        duration: info.duration || "",
        cover: info.movie_image || info.cover_big || "",
        url: this.urls.movieStreamUrl(streamId, ext)
      };
    }
    // ---- Normalizers (defensive against missing fields) ----
    _mapLive(data) {
      if (!Array.isArray(data)) return [];
      return data.map((s) => {
        var _a;
        return {
          id: String(s.stream_id),
          name: s.name || "Unknown",
          logo: s.stream_icon || "",
          tvgId: s.epg_channel_id || "",
          tvgName: s.name || "",
          categoryId: String((_a = s.category_id) != null ? _a : ""),
          section: SECTION.LIVE,
          ext: this.urls.liveExt,
          num: s.num,
          url: this.urls.liveStreamUrl(s.stream_id)
        };
      });
    }
    _mapMovie(data) {
      if (!Array.isArray(data)) return [];
      return data.map((s) => {
        var _a;
        const ext = s.container_extension || "mp4";
        return {
          id: String(s.stream_id),
          name: s.name || "Unknown",
          logo: s.stream_icon || s.cover || "",
          categoryId: String((_a = s.category_id) != null ? _a : ""),
          section: SECTION.MOVIE,
          ext,
          rating: s.rating,
          added: s.added,
          url: this.urls.movieStreamUrl(s.stream_id, ext)
        };
      });
    }
    _mapSeries(data) {
      if (!Array.isArray(data)) return [];
      return data.map((s) => {
        var _a;
        return {
          id: String(s.series_id),
          seriesId: String(s.series_id),
          name: s.name || "Unknown",
          logo: s.cover || "",
          categoryId: String((_a = s.category_id) != null ? _a : ""),
          section: SECTION.SERIES,
          plot: s.plot || "",
          rating: s.rating,
          isSeries: true
          // marks this as a container, not a playable stream
        };
      });
    }
    /** Flatten Xtream series_info seasons/episodes into playable items. */
    _mapSeriesEpisodes(seriesId, data) {
      const seasons = [];
      const episodesObj = data && data.episodes || {};
      for (const seasonNum of Object.keys(episodesObj).sort((a, b) => Number(a) - Number(b))) {
        const eps = (episodesObj[seasonNum] || []).map((e) => {
          const ext = e.container_extension || "mp4";
          return {
            id: String(e.id),
            name: e.title || `Episode ${e.episode_num}`,
            episodeNum: e.episode_num,
            season: Number(seasonNum),
            section: SECTION.SERIES,
            ext,
            seriesId: String(seriesId),
            url: this.urls.seriesStreamUrl(e.id, ext)
          };
        });
        seasons.push({ season: Number(seasonNum), episodes: eps });
      }
      log8.debug(`series ${seriesId}: ${seasons.length} seasons`);
      return { seasons, info: data && data.info || {} };
    }
  };

  // js/data/M3UParser.js
  var ATTR_RE = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
  function classify(url, group) {
    const u = (url || "").toLowerCase();
    if (u.includes("/movie/")) return SECTION.MOVIE;
    if (u.includes("/series/")) return SECTION.SERIES;
    const g = (group || "").toLowerCase();
    if (/\b(vod|movie|film|cinema)\b/.test(g)) return SECTION.MOVIE;
    if (/\b(series|show|serie)\b/.test(g)) return SECTION.SERIES;
    return SECTION.LIVE;
  }
  function extFromUrl(url) {
    const m = /\.([a-z0-9]{2,4})(?:\?|$)/i.exec(url || "");
    return m ? m[1].toLowerCase() : "ts";
  }
  var M3UParser = class {
    constructor() {
      this.items = [];
      this.groups = { [SECTION.LIVE]: /* @__PURE__ */ new Set(), [SECTION.MOVIE]: /* @__PURE__ */ new Set(), [SECTION.SERIES]: /* @__PURE__ */ new Set() };
      this._pending = null;
      this._seenHeader = false;
      this._index = 0;
    }
    /** True if the stream began with a valid #EXTM3U header. */
    get valid() {
      return this._seenHeader;
    }
    /**
     * Consume a single line of the playlist.
     * @param {string} rawLine
     */
    push(rawLine) {
      const line = rawLine.trim();
      if (!line) return;
      if (line.toUpperCase().startsWith("#EXTM3U")) {
        this._seenHeader = true;
        return;
      }
      if (line.startsWith("#EXTINF")) {
        this._pending = this._parseExtInf(line);
        return;
      }
      if (line.startsWith("#EXTGRP:")) {
        if (this._pending) this._pending.group = line.slice(8).trim() || this._pending.group;
        return;
      }
      if (line.startsWith("#")) return;
      if (this._pending) {
        const ch = this._pending;
        ch.url = line;
        ch.ext = extFromUrl(line);
        ch.section = classify(line, ch.group);
        ch.id = ch.tvgId || `m3u_${this._index}`;
        this._index += 1;
        this.groups[ch.section].add(ch.group);
        this.items.push(ch);
        this._pending = null;
      }
    }
    /** Parse one #EXTINF line into a partial channel object. */
    _parseExtInf(line) {
      const commaIdx = line.indexOf(",");
      const attrsPart = commaIdx >= 0 ? line.slice(0, commaIdx) : line;
      const name = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : "";
      const attrs = {};
      let m;
      ATTR_RE.lastIndex = 0;
      while ((m = ATTR_RE.exec(attrsPart)) !== null) attrs[m[1].toLowerCase()] = m[2];
      return {
        name: name || attrs["tvg-name"] || "Unknown",
        tvgId: attrs["tvg-id"] || "",
        tvgName: attrs["tvg-name"] || "",
        logo: attrs["tvg-logo"] || "",
        group: attrs["group-title"] || "Uncategorized",
        url: "",
        ext: "ts",
        section: SECTION.LIVE
      };
    }
    /**
     * Group parsed items by section into {categories, streamsByCategory}
     * so the result matches the Xtream shape used by PlaylistService.
     * @returns {{sections: object}}
     */
    finalize() {
      const sections = {};
      for (const sec of [SECTION.LIVE, SECTION.MOVIE, SECTION.SERIES]) {
        const groupNames = [...this.groups[sec]].sort((a, b) => a.localeCompare(b));
        const categories = groupNames.map((name, i) => ({ id: `${sec}:${i}`, name }));
        const idByName = new Map(categories.map((c) => [c.name, c.id]));
        const streamsByCategory = {};
        for (const c of categories) streamsByCategory[c.id] = [];
        for (const item of this.items) {
          if (item.section !== sec) continue;
          const cid = idByName.get(item.group);
          item.categoryId = cid;
          streamsByCategory[cid].push(item);
        }
        sections[sec] = { categories, streamsByCategory };
      }
      return { sections };
    }
  };

  // js/utils/format.js
  function normalize(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  }
  function formatTime(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor(s % 3600 / 60);
    const sec = s % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
  }
  function truncate(s, max = 40) {
    s = String(s || "");
    return s.length > max ? s.slice(0, max - 1) + "\u2026" : s;
  }

  // js/data/PlaylistService.js
  var log9 = logger.child("Playlist");
  var ALL_SECTIONS = [SECTION.LIVE, SECTION.MOVIE, SECTION.SERIES];
  var PlaylistService = class {
    constructor() {
      this.account = null;
      this.xtream = null;
      this._m3u = null;
      this._catMem = /* @__PURE__ */ new Map();
      this._streamMem = /* @__PURE__ */ new Map();
    }
    _catKey(section) {
      return `${this.account.id}:${section}`;
    }
    _streamKey(section, catId) {
      return `${this.account.id}:${section}:${catId}`;
    }
    /**
     * Prepare the service for an account.
     * @param {import('./AccountManager.js').Account} account
     * @param {{force?:boolean}} [opts]
     * @returns {Promise<{sections: Record<string, number>}>}
     */
    async load(account, opts = {}) {
      this.account = account;
      this.xtream = null;
      this._m3u = null;
      this._catMem.clear();
      this._streamMem.clear();
      if (account.method === LOGIN_METHOD.XTREAM) {
        this.xtream = new XtreamClient(account);
        return this._loadXtream(opts);
      }
      return this._loadM3U(opts);
    }
    /** Xtream: fetch just the category lists up-front (small, fast). */
    async _loadXtream(opts) {
      const summary = { sections: {} };
      for (const section of ALL_SECTIONS) {
        const cats = await this.getCategories(section, opts);
        summary.sections[section] = cats.length;
        bus.emit(EVENT.PLAYLIST_PROGRESS, { section, categories: cats.length });
      }
      bus.emit(EVENT.PLAYLIST_READY, summary);
      return summary;
    }
    /** M3U: stream-download + parse the whole playlist, then cache buckets. */
    async _loadM3U(opts) {
      if (!opts.force) {
        const cached = await this._readCachedM3UMeta();
        if (cached) {
          log9.info("using cached M3U catalog");
          bus.emit(EVENT.PLAYLIST_READY, cached);
          return cached;
        }
      }
      const parser = new M3UParser();
      let lastEmit = 0;
      await streamLines(this.account.m3uUrl, (line) => parser.push(line), {
        signal: opts.signal,
        onProgress: (bytes) => {
          const mb = bytes / (1024 * 1024);
          if (mb - lastEmit >= 1) {
            lastEmit = mb;
            bus.emit(EVENT.PLAYLIST_PROGRESS, { bytes, mb: Math.round(mb) });
          }
        }
      });
      if (!parser.valid) {
        const err = new Error("invalid_playlist");
        bus.emit(EVENT.PLAYLIST_ERROR, err);
        throw err;
      }
      const { sections } = parser.finalize();
      this._m3u = sections;
      await this._cacheM3U(sections);
      const summary = { sections: {} };
      for (const s of ALL_SECTIONS) summary.sections[s] = sections[s].categories.length;
      bus.emit(EVENT.PLAYLIST_READY, summary);
      return summary;
    }
    /** Persist parsed M3U buckets into IndexedDB. */
    async _cacheM3U(sections) {
      try {
        for (const s of ALL_SECTIONS) {
          await store.put(DB.STORES.CATEGORIES, {
            key: this._catKey(s),
            items: sections[s].categories,
            cachedAt: Date.now()
          });
          const bulk = [];
          for (const [catId, items] of Object.entries(sections[s].streamsByCategory)) {
            bulk.push({ key: this._streamKey(s, catId), items, cachedAt: Date.now() });
          }
          if (bulk.length) await store.bulkPut(DB.STORES.STREAMS, bulk);
        }
        await store.put(DB.STORES.META, { key: `${this.account.id}:m3u`, cachedAt: Date.now() });
      } catch (e) {
        log9.warn("M3U cache write failed (continuing without cache)", e && e.name);
      }
    }
    /** Read cached M3U catalog back into memory if present. */
    async _readCachedM3UMeta() {
      if (!store.available) return null;
      try {
        const meta = await store.get(DB.STORES.META, `${this.account.id}:m3u`);
        if (!meta) return null;
        const sections = {};
        const summary = { sections: {} };
        for (const s of ALL_SECTIONS) {
          const catRec = await store.get(DB.STORES.CATEGORIES, this._catKey(s));
          const categories = catRec ? catRec.items : [];
          sections[s] = { categories, streamsByCategory: {} };
          summary.sections[s] = categories.length;
        }
        this._m3u = sections;
        return summary;
      } catch {
        return null;
      }
    }
    /**
     * Categories for a section (memory -> IDB cache -> network).
     * @returns {Promise<{id:string,name:string}[]>}
     */
    async getCategories(section, opts = {}) {
      if (this._catMem.has(section)) return this._catMem.get(section);
      if (!opts.force && store.available) {
        const rec = await store.get(DB.STORES.CATEGORIES, this._catKey(section));
        if (rec && rec.items) {
          this._catMem.set(section, rec.items);
          return rec.items;
        }
      }
      let cats = [];
      if (this.xtream) {
        cats = await this.xtream.categories(section, opts);
        try {
          await store.put(DB.STORES.CATEGORIES, { key: this._catKey(section), items: cats, cachedAt: Date.now() });
        } catch {
        }
      } else if (this._m3u) {
        cats = this._m3u[section].categories;
      }
      this._catMem.set(section, cats);
      return cats;
    }
    /**
     * Streams for a category (memory -> IDB cache -> network).
     * @returns {Promise<object[]>}
     */
    async getStreams(section, categoryId, opts = {}) {
      const memKey = `${section}:${categoryId}`;
      if (this._streamMem.has(memKey)) return this._streamMem.get(memKey);
      if (!opts.force && store.available) {
        const rec = await store.get(DB.STORES.STREAMS, this._streamKey(section, categoryId));
        if (rec && rec.items) {
          this._streamMem.set(memKey, rec.items);
          return rec.items;
        }
      }
      let items = [];
      if (this.xtream) {
        items = await this.xtream.streams(section, categoryId, opts);
        try {
          await store.put(DB.STORES.STREAMS, { key: this._streamKey(section, categoryId), items, cachedAt: Date.now() });
        } catch {
        }
      } else if (this._m3u) {
        items = (this._m3u[section].streamsByCategory || {})[categoryId] || [];
      }
      this._streamMem.set(memKey, items);
      return items;
    }
    /** Series info: seasons + episodes + metadata (Xtream only). */
    async getSeriesEpisodes(seriesId, opts = {}) {
      if (!this.xtream) return { seasons: [], info: {} };
      return this.xtream.seriesInfo(seriesId, opts);
    }
    /** Movie (VOD) info: plot/genre/rating + play URL (Xtream only). */
    async getMovieInfo(streamId, opts = {}) {
      if (!this.xtream) return null;
      return this.xtream.movieInfo(streamId, opts);
    }
    /**
     * Search across sections. For Xtream this lazily loads all streams for
     * each requested section once (cached) then filters in memory.
     * @param {string} query
     * @param {{sections?: string[], limit?: number}} [opts]
     * @returns {Promise<object[]>}
     */
    async search(query, opts = {}) {
      const q = normalize(query);
      if (q.length < 2) return [];
      const sections = opts.sections || ALL_SECTIONS;
      const limit = opts.limit || 300;
      const out = [];
      for (const section of sections) {
        const cats = await this.getCategories(section);
        for (const cat of cats) {
          const items = await this.getStreams(section, cat.id);
          for (const it of items) {
            if (normalize(it.name).includes(q)) {
              out.push(it);
              if (out.length >= limit) return out;
            }
          }
        }
      }
      return out;
    }
    /** Drop all cached catalog data for every account. */
    async clearCache() {
      this._catMem.clear();
      this._streamMem.clear();
      this._m3u = null;
      if (store.available) await store.clearAll();
    }
  };
  var playlist = new PlaylistService();

  // js/ui/components/Loading.js
  var overlay = null;
  var label = null;
  function showLoading(message = "Loading\u2026") {
    if (!overlay) {
      label = el("div", { class: "loading-text" }, message);
      overlay = el("div", { class: "loading-overlay" }, [
        el("div", { class: "spinner" }),
        label
      ]);
      document.body.appendChild(overlay);
    }
    label.textContent = message;
    overlay.classList.add("is-visible");
  }
  function updateLoading(message) {
    if (label) label.textContent = message;
  }
  function hideLoading() {
    if (overlay) overlay.classList.remove("is-visible");
  }

  // js/ui/flows/connect.js
  var log10 = logger.child("Connect");
  async function connectAccount(router, account, opts = {}) {
    showLoading("Connecting\u2026");
    const off = bus.on(EVENT.PLAYLIST_PROGRESS, (p) => {
      if (p && p.mb != null) updateLoading(`Downloading playlist\u2026 ${p.mb} MB`);
    });
    try {
      const res = await validate(account);
      if (!res.ok) {
        hideLoading();
        if (!opts.silent) toast(res.message, res.status === AUTH.EXPIRED ? "warn" : "error", 4500);
        return false;
      }
      updateLoading(account.method === LOGIN_METHOD.M3U ? "Loading playlist\u2026" : "Loading categories\u2026");
      await playlist.load(account, { force: false });
      accounts.setActive(account.id);
      hideLoading();
      router.replaceAll(VIEW.HOME);
      return true;
    } catch (err) {
      log10.warn("connect failed", err && err.message);
      hideLoading();
      if (!opts.silent) toast("Could not load the playlist. Please try again.", "error", 4500);
      return false;
    } finally {
      off();
    }
  }

  // js/i18n/en.js
  var en_default = {
    "common.open": "Open",
    "common.back": "Back",
    "common.cancel": "Cancel",
    "common.connect": "Connect",
    "search.title": "Search",
    "search.placeholder": "Type to search\u2026",
    "search.hint": "Search live TV, movies and series.",
    "search.searching": "Searching\u2026",
    "search.none": "No results found.",
    "search.error": "Search failed. Try again.",
    "settings.title": "Settings",
    "settings.language": "Language",
    "settings.languageChanged": "Language updated",
    "settings.theme": "Theme",
    "settings.autoUpdate": "Automatic updates",
    "settings.reload": "Reload playlist",
    "settings.reloading": "Reloading playlist\u2026",
    "settings.reloaded": "Playlist reloaded",
    "settings.reloadFailed": "Reload failed",
    "settings.clearCache": "Clear cache",
    "settings.cacheCleared": "Cache cleared",
    "settings.reconnect": "Reconnect",
    "settings.account": "Account",
    "settings.version": "App version"
  };

  // js/i18n/es.js
  var es_default = {
    "common.open": "Abrir",
    "common.back": "Atr\xE1s",
    "common.cancel": "Cancelar",
    "common.connect": "Conectar",
    "search.title": "Buscar",
    "search.placeholder": "Escribe para buscar\u2026",
    "search.hint": "Busca TV en vivo, pel\xEDculas y series.",
    "search.searching": "Buscando\u2026",
    "search.none": "No se encontraron resultados.",
    "search.error": "La b\xFAsqueda fall\xF3. Int\xE9ntalo de nuevo.",
    "settings.title": "Ajustes",
    "settings.language": "Idioma",
    "settings.languageChanged": "Idioma actualizado",
    "settings.theme": "Tema",
    "settings.autoUpdate": "Actualizaciones autom\xE1ticas",
    "settings.reload": "Recargar lista",
    "settings.reloading": "Recargando lista\u2026",
    "settings.reloaded": "Lista recargada",
    "settings.reloadFailed": "Error al recargar",
    "settings.clearCache": "Borrar cach\xE9",
    "settings.cacheCleared": "Cach\xE9 borrada",
    "settings.reconnect": "Reconectar",
    "settings.account": "Cuenta",
    "settings.version": "Versi\xF3n de la app"
  };

  // js/i18n/i18n.js
  var LANG_KEY = "iptv.lang";
  var DICTS = { en: en_default, es: es_default };
  var LANGUAGES = [
    { code: "en", label: "English" },
    { code: "es", label: "Espa\xF1ol" }
  ];
  var I18n = class {
    constructor() {
      this.code = "en";
    }
    /** Load the persisted language (default English). */
    init() {
      const saved = prefs.get(LANG_KEY, null);
      this.code = DICTS[saved] ? saved : "en";
      document.documentElement.lang = this.code;
    }
    /** @returns {{code,label}[]} */
    get languages() {
      return LANGUAGES;
    }
    get current() {
      return this.code;
    }
    get currentLabel() {
      return (LANGUAGES.find((l) => l.code === this.code) || LANGUAGES[0]).label;
    }
    /**
     * Translate a key, falling back to English then the provided fallback.
     * @param {string} key @param {string} [fallback]
     */
    t(key, fallback) {
      var _a, _b, _c;
      const dict = DICTS[this.code] || en_default;
      return (_c = (_b = (_a = dict[key]) != null ? _a : en_default[key]) != null ? _b : fallback) != null ? _c : key;
    }
    setLanguage(code) {
      if (!DICTS[code]) return;
      this.code = code;
      prefs.set(LANG_KEY, code);
      document.documentElement.lang = code;
    }
    /** Advance to the next available language. */
    cycle() {
      const i = LANGUAGES.findIndex((l) => l.code === this.code);
      const next = LANGUAGES[(i + 1) % LANGUAGES.length];
      this.setLanguage(next.code);
    }
  };
  var i18n = new I18n();

  // js/utils/theme.js
  var THEME_KEY = "iptv.theme";
  var THEMES = [
    { id: "dark", label: "Dark" },
    { id: "midnight", label: "Midnight Blue" },
    { id: "light", label: "Light" }
  ];
  var Theme = class {
    constructor() {
      this.id = "dark";
    }
    /** Apply the persisted theme (default dark). */
    init() {
      const saved = prefs.get(THEME_KEY, "dark");
      this.setTheme(THEMES.some((t) => t.id === saved) ? saved : "dark");
    }
    get themes() {
      return THEMES;
    }
    get current() {
      return this.id;
    }
    get currentLabel() {
      return (THEMES.find((t) => t.id === this.id) || THEMES[0]).label;
    }
    setTheme(id) {
      this.id = id;
      document.documentElement.setAttribute("data-theme", id);
      prefs.set(THEME_KEY, id);
    }
    /** Advance to the next theme. */
    cycle() {
      const i = THEMES.findIndex((t) => t.id === this.id);
      this.setTheme(THEMES[(i + 1) % THEMES.length].id);
    }
  };
  var theme = new Theme();

  // js/ui/View.js
  var View = class {
    /**
     * @param {import('./Router.js').Router} router
     * @param {object} [params]
     */
    constructor(router, params = {}) {
      this.router = router;
      this.params = params;
      this.el = null;
    }
    /** Build and return the root element. Must be implemented by subclasses. */
    render() {
      throw new Error("render() not implemented");
    }
    /** Attach into a container. */
    mount(container) {
      this.el = this.render();
      this.el.classList.add("screen");
      container.appendChild(this.el);
      if (this.onMount) this.onMount();
    }
    /** Make visible and take focus. */
    show() {
      this.el.classList.remove("screen-hidden");
      focus.setRoot(this.el);
      if (this.onShow) this.onShow();
      else focus.focusFirst(this.el);
    }
    /** Hide without destroying (state preserved for Back). */
    hide() {
      this.el.classList.add("screen-hidden");
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
    onKey(action, payload) {
      return false;
    }
  };

  // js/ui/screens/LoginScreen.js
  var LoginScreen = class extends View {
    constructor(router, params) {
      super(router, params);
      const editing = params.accountId ? accounts.get(params.accountId) : null;
      this.editing = editing;
      this.model = editing ? { ...editing } : {
        name: "",
        method: LOGIN_METHOD.XTREAM,
        serverUrl: "",
        username: "",
        password: "",
        m3uUrl: "",
        streamFormat: "ts"
      };
      if (editing) this.model.password = "";
    }
    render() {
      this.form = el("div", { class: "login-form" });
      const wrap = el("div", { class: "login-screen" }, [
        el("div", { class: "login-header" }, [
          el("span", { class: "brand-play" }),
          el("h1", { class: "login-title" }, this.editing ? "Edit account" : "Add account")
        ]),
        this.form
      ]);
      this._buildForm();
      return wrap;
    }
    /** (Re)build fields according to the selected method. */
    _buildForm() {
      clear(this.form);
      this.form.appendChild(this._textField("name", "Playlist name", "e.g. My Playlist"));
      this.form.appendChild(this._toggle("method", "Login method", [
        { value: LOGIN_METHOD.XTREAM, label: "Server + Login" },
        { value: LOGIN_METHOD.M3U, label: "M3U URL" }
      ], () => this._buildForm()));
      if (this.model.method === LOGIN_METHOD.XTREAM) {
        this.form.appendChild(this._textField("serverUrl", "Server URL", "https://server.com:8080"));
        this.form.appendChild(this._textField("username", "Username", "username"));
        this.form.appendChild(this._textField("password", "Password", "\u2022\u2022\u2022\u2022\u2022\u2022", true));
      } else {
        this.form.appendChild(this._textField("m3uUrl", "M3U playlist URL", "https://server.com/get.php?..."));
      }
      this.form.appendChild(this._toggle("streamFormat", "Live stream format", [
        { value: "ts", label: "MPEG-TS" },
        { value: "m3u8", label: "HLS (m3u8)" }
      ]));
      const actions = el("div", { class: "login-actions" }, [
        this._button(this.editing ? "Save & Connect" : "Connect", "primary", () => this._submit()),
        this._button("Cancel", "ghost", () => this.router.back())
      ]);
      this.form.appendChild(actions);
    }
    /** A focusable text field wrapping a native input (for the TV keyboard). */
    _textField(key, label2, placeholder, isPassword = false) {
      const input = el("input", {
        class: "field-input",
        type: isPassword ? "password" : "text",
        value: this.model[key] || "",
        placeholder,
        autocomplete: "off",
        autocapitalize: "off",
        spellcheck: false
      });
      input.addEventListener("blur", () => {
        this.model[key] = input.value;
      });
      input.addEventListener("keydown", (e) => {
        const code = e.keyCode || e.which;
        if (code === 40 || code === 13) {
          e.preventDefault();
          e.stopPropagation();
          input.blur();
          focus.move("down");
        } else if (code === 38) {
          e.preventDefault();
          e.stopPropagation();
          input.blur();
          focus.move("up");
        } else if (code === 10009 || code === 27) {
          e.preventDefault();
          e.stopPropagation();
          input.blur();
        }
      });
      const field = el("div", { class: "form-field focusable", tabindex: "-1" }, [
        el("label", { class: "field-label" }, label2),
        input
      ]);
      field.onSelect = () => input.focus();
      return field;
    }
    /** A focusable segmented toggle bound to a model key. */
    _toggle(key, label2, options, onChange) {
      const seg = el("div", { class: "seg" });
      const sync = () => {
        seg.querySelectorAll(".seg-opt").forEach((b) => {
          b.classList.toggle("is-active", b.dataset.value === String(this.model[key]));
        });
      };
      options.forEach((opt) => {
        const b = el("div", { class: "seg-opt focusable", tabindex: "-1", dataset: { value: opt.value } }, opt.label);
        b.onSelect = () => {
          this.model[key] = opt.value;
          sync();
          if (onChange) onChange();
        };
        seg.appendChild(b);
      });
      sync();
      return el("div", { class: "form-field" }, [
        el("label", { class: "field-label" }, label2),
        seg
      ]);
    }
    _button(label2, variant, onSelect) {
      const b = el("button", { class: `btn btn--${variant} focusable`, tabindex: "-1" }, label2);
      b.onSelect = onSelect;
      b.addEventListener("click", onSelect);
      return b;
    }
    /** Validate + persist + connect. */
    async _submit() {
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      const result2 = this.editing ? accounts.update(this.editing.id, this.model) : accounts.add(this.model);
      if (result2.error) {
        toast(result2.error, "error");
        return;
      }
      await connectAccount(this.router, result2.account);
    }
    onShow() {
      focus.focusFirst(this.el);
    }
    onBack() {
      this.router.back();
      return true;
    }
  };

  // js/ui/screens/AccountsScreen.js
  var AccountsScreen = class extends View {
    render() {
      this.listEl = el("div", { class: "account-list" });
      const screen = el("div", { class: "accounts-screen" }, [
        el("div", { class: "accounts-header" }, [
          el("span", { class: "brand-play" }),
          el("h1", {}, "IPTV Player"),
          el("p", { class: "accounts-sub" }, "Choose an account or add a new one")
        ]),
        this.listEl,
        el("div", { class: "hintbar" }, [
          this._hint("OK", "Connect"),
          this._hint("GREEN", "Edit", "green"),
          this._hint("RED", "Delete", "red")
        ])
      ]);
      this._buildList();
      return screen;
    }
    _hint(key, text, color = "") {
      return el("span", { class: "hint" }, [
        el("span", { class: `hint-key ${color ? "hint-key--" + color : ""}` }, key),
        el("span", { class: "hint-text" }, text)
      ]);
    }
    _buildList() {
      this.listEl.innerHTML = "";
      const list = accounts.list();
      for (const acc of list) {
        const meta = acc.method === LOGIN_METHOD.XTREAM ? acc.serverUrl : "M3U playlist";
        const card = el("div", { class: "account-card focusable", tabindex: "-1", dataset: { id: acc.id } }, [
          el("div", { class: "account-icon" }, [el("span", { class: "brand-play brand-play--sm" })]),
          el("div", { class: "account-info" }, [
            el("div", { class: "account-name" }, acc.name),
            el("div", { class: "account-meta" }, meta)
          ])
        ]);
        card.onSelect = () => connectAccount(this.router, acc);
        this.listEl.appendChild(card);
      }
      const add = el("div", { class: "account-card account-card--add focusable", tabindex: "-1" }, [
        el("div", { class: "account-icon" }, "+"),
        el("div", { class: "account-info" }, [el("div", { class: "account-name" }, "Add account")])
      ]);
      add.onSelect = () => this.router.navigate(VIEW.LOGIN);
      this.listEl.appendChild(add);
    }
    /** Colour-key shortcuts operate on the focused account card. */
    onKey(action) {
      const el2 = focus.current;
      const id = el2 && el2.dataset ? el2.dataset.id : null;
      if (!id) return false;
      if (action === ACTION.GREEN) {
        this.router.navigate(VIEW.LOGIN, { accountId: id });
        return true;
      }
      if (action === ACTION.RED) {
        this._confirmDelete(id);
        return true;
      }
      return false;
    }
    _confirmDelete(id) {
      const acc = accounts.get(id);
      if (!acc) return;
      if (this._pendingDelete === id) {
        accounts.remove(id);
        this._pendingDelete = null;
        toast("Account deleted", "success");
        this._buildList();
        focus.focusFirst(this.el);
      } else {
        this._pendingDelete = id;
        toast(`Press RED again to delete "${acc.name}"`, "warn", 2500);
        setTimeout(() => {
          if (this._pendingDelete === id) this._pendingDelete = null;
        }, 2600);
      }
    }
    onShow() {
      focus.focusFirst(this.el);
    }
    onBack() {
      return true;
    }
    // root screen: ignore Back (use EXIT to quit)
  };

  // js/ui/screens/HomeScreen.js
  var TILES = [
    { key: SECTION.LIVE, label: "Live TV", view: VIEW.LIST, icon: "\u{1F4FA}" },
    { key: SECTION.MOVIE, label: "Movies", view: VIEW.LIST, icon: "\u{1F3AC}" },
    { key: SECTION.SERIES, label: "Series", view: VIEW.LIST, icon: "\u{1F4FC}" },
    { key: SECTION.FAVORITES, label: "Favorites", view: VIEW.LIST, icon: "\u2605" },
    { key: SECTION.RECENT, label: "Recently watched", view: VIEW.LIST, icon: "\u27F3" },
    { key: SECTION.SEARCH, label: "Search", view: VIEW.SEARCH, icon: "\u{1F50D}" },
    { key: "settings", label: "Settings", view: VIEW.SETTINGS, icon: "\u2699" }
  ];
  var HomeScreen = class extends View {
    render() {
      const acc = accounts.getActive();
      const grid = el("div", { class: "home-grid" });
      for (const t of TILES) {
        const tile = el("div", { class: "home-tile focusable", tabindex: "-1" }, [
          el("div", { class: "home-tile-icon" }, t.icon),
          el("div", { class: "home-tile-label" }, t.label)
        ]);
        tile.onSelect = () => {
          if (t.view === VIEW.LIST) this.router.navigate(VIEW.LIST, { section: t.key });
          else this.router.navigate(t.view);
        };
        grid.appendChild(tile);
      }
      return el("div", { class: "home-screen" }, [
        el("div", { class: "home-header" }, [
          el("div", { class: "home-brand" }, [
            el("span", { class: "brand-play" }),
            el("span", { class: "home-appname" }, "IPTV Player")
          ]),
          el("div", { class: "home-account" }, acc ? acc.name : "")
        ]),
        grid
      ]);
    }
    onShow() {
      focus.focusFirst(this.el);
    }
  };

  // js/ui/components/VirtualGrid.js
  var VirtualGrid = class {
    /**
     * @param {object} cfg
     * @param {number} cfg.columns
     * @param {number} cfg.cellHeight   px height of one cell
     * @param {number} [cfg.gap]        px gap between cells (default 24)
     * @param {(item:object, index:number)=>HTMLElement} cfg.renderCell
     * @param {(item:object, index:number)=>void} [cfg.onSelect]
     * @param {number} [cfg.buffer]      extra rows above/below viewport
     */
    constructor(cfg) {
      var _a, _b;
      this.columns = cfg.columns;
      this.gap = (_a = cfg.gap) != null ? _a : 24;
      this.cellHeight = cfg.cellHeight;
      this.rowHeight = this.cellHeight + this.gap;
      this.renderCell = cfg.renderCell;
      this.onSelect = cfg.onSelect || (() => {
      });
      this.buffer = (_b = cfg.buffer) != null ? _b : 2;
      this.items = [];
      this.focusedIndex = 0;
      this._viewportH = 720;
      this._lastStart = -1;
      this._lastEnd = -1;
      this.layer = el("div", { class: "vgrid-layer" });
      Object.assign(this.layer.style, {
        display: "grid",
        gridTemplateColumns: `repeat(${this.columns}, 1fr)`,
        gridAutoRows: `${this.cellHeight}px`,
        columnGap: `${this.gap}px`,
        rowGap: `${this.gap}px`
      });
      this.spacer = el("div", { class: "vgrid-spacer" }, [this.layer]);
      this.el = el("div", { class: "vgrid" }, [this.spacer]);
      this.el.addEventListener("scroll", () => this._render(), { passive: true });
    }
    /** Provide/refresh the item set and reset focus. */
    setItems(items, keepIndex = false) {
      this.items = items || [];
      if (!keepIndex) this.focusedIndex = 0;
      this.focusedIndex = Math.min(this.focusedIndex, Math.max(0, this.items.length - 1));
      const rows = Math.ceil(this.items.length / this.columns);
      this.spacer.style.height = `${rows * this.rowHeight}px`;
      this.el.scrollTop = 0;
      this._lastStart = -1;
      this._lastEnd = -1;
      this._render();
    }
    /** Measure viewport once the element is in the DOM. */
    measure() {
      this._viewportH = this.el.clientHeight || this._viewportH;
      this._render();
    }
    get isEmpty() {
      return this.items.length === 0;
    }
    get current() {
      return this.items[this.focusedIndex] || null;
    }
    /** Give visual focus to the grid (current cell). */
    focus() {
      this._ensureVisible();
      this._render();
    }
    /** Remove the focused visual state (when leaving the grid). */
    blur() {
      const cell = this.layer.querySelector(".is-focused");
      if (cell) cell.classList.remove("is-focused");
    }
    /**
     * Handle a navigation action. See class docstring for return values.
     * @param {string} action  'left'|'right'|'up'|'down'|'ok'
     * @returns {string}
     */
    navigate(action) {
      const len = this.items.length;
      if (len === 0) return "edge-" + (action === "right" ? "right" : action === "up" ? "top" : action === "down" ? "bottom" : "left");
      const col = this.focusedIndex % this.columns;
      let idx = this.focusedIndex;
      switch (action) {
        case "left":
          if (col === 0) return "edge-left";
          idx -= 1;
          break;
        case "right":
          if (col === this.columns - 1 || idx + 1 >= len) return "edge-right";
          idx += 1;
          break;
        case "up":
          if (idx - this.columns < 0) return "edge-top";
          idx -= this.columns;
          break;
        case "down":
          if (idx + this.columns >= len) {
            const lastRowStart = (Math.ceil(len / this.columns) - 1) * this.columns;
            if (idx >= lastRowStart) return "edge-bottom";
            idx = Math.min(len - 1, idx + this.columns);
          } else {
            idx += this.columns;
          }
          break;
        case "ok":
          this.onSelect(this.current, this.focusedIndex);
          return "select";
        default:
          return "moved";
      }
      this.focusedIndex = idx;
      this._ensureVisible();
      this._render();
      return "moved";
    }
    /** Scroll so the focused row is fully within the viewport. */
    _ensureVisible() {
      const row = Math.floor(this.focusedIndex / this.columns);
      const top = row * this.rowHeight;
      const bottom = top + this.rowHeight;
      if (top < this.el.scrollTop) this.el.scrollTop = top;
      else if (bottom > this.el.scrollTop + this._viewportH) this.el.scrollTop = bottom - this._viewportH;
    }
    /**
     * Render only the cells within the current window. CRITICAL for TV perf:
     * if the visible window hasn't changed (i.e. focus moved but we didn't
     * scroll to new rows), we DON'T rebuild the DOM or reload images — we just
     * move the focus highlight. Rebuilding every keypress kills a weak TV GPU.
     */
    _render() {
      const len = this.items.length;
      const scrollTop = this.el.scrollTop;
      const firstRow = Math.max(0, Math.floor(scrollTop / this.rowHeight) - this.buffer);
      const visibleRows = Math.ceil(this._viewportH / this.rowHeight) + this.buffer * 2;
      const startIdx = firstRow * this.columns;
      const endIdx = Math.min(len, startIdx + visibleRows * this.columns);
      if (startIdx === this._lastStart && endIdx === this._lastEnd && this.layer.childElementCount) {
        this._updateFocus();
        return;
      }
      this._lastStart = startIdx;
      this._lastEnd = endIdx;
      clear(this.layer);
      this.layer.style.transform = `translateY(${firstRow * this.rowHeight}px)`;
      for (let i = startIdx; i < endIdx; i++) {
        const item = this.items[i];
        const cell = this.renderCell(item, i);
        cell.classList.add("vgrid-cell");
        cell.dataset.i = i;
        if (i === this.focusedIndex) cell.classList.add("is-focused");
        const imgs = cell.querySelectorAll("img.lazy-img");
        imgs.forEach((im) => im.load && im.load());
        this.layer.appendChild(cell);
      }
    }
    /** Move the focus highlight without rebuilding cells (cheap). */
    _updateFocus() {
      const prev = this.layer.querySelector(".vgrid-cell.is-focused");
      if (prev) prev.classList.remove("is-focused");
      const cur = this.layer.querySelector('.vgrid-cell[data-i="' + this.focusedIndex + '"]');
      if (cur) cur.classList.add("is-focused");
    }
  };

  // js/data/Favorites.js
  var Favorites = class {
    _all() {
      return prefs.get(LS.FAVORITES, {});
    }
    _accountId() {
      const a = accounts.getActive();
      return a ? a.id : "_";
    }
    /** @returns {object[]} favorites for the active account. */
    list() {
      return this._all()[this._accountId()] || [];
    }
    /** @param {string} id @returns {boolean} */
    has(id) {
      return this.list().some((x) => x.id === id);
    }
    /**
     * Toggle an item's favorite state.
     * @param {object} item
     * @returns {boolean} new state (true = now a favorite)
     */
    toggle(item) {
      const all = this._all();
      const key = this._accountId();
      const list = all[key] || [];
      const i = list.findIndex((x) => x.id === item.id);
      let added;
      if (i >= 0) {
        list.splice(i, 1);
        added = false;
      } else {
        list.unshift(this._slim(item));
        added = true;
      }
      all[key] = list;
      prefs.set(LS.FAVORITES, all);
      return added;
    }
    remove(id) {
      const all = this._all();
      const key = this._accountId();
      all[key] = (all[key] || []).filter((x) => x.id !== id);
      prefs.set(LS.FAVORITES, all);
    }
    /** Keep only the fields needed to render + play. */
    _slim(it) {
      return {
        id: it.id,
        name: it.name,
        logo: it.logo || "",
        section: it.section,
        url: it.url || "",
        ext: it.ext,
        seriesId: it.seriesId,
        isSeries: it.isSeries,
        categoryId: it.categoryId
      };
    }
  };
  var favorites = new Favorites();

  // js/data/History.js
  var MAX = 60;
  var History = class {
    _all() {
      return prefs.get(LS.HISTORY, {});
    }
    _accountId() {
      const a = accounts.getActive();
      return a ? a.id : "_";
    }
    /** @returns {object[]} recent items (newest first). */
    list() {
      return this._all()[this._accountId()] || [];
    }
    /** Record a played item at the top of the list. */
    add(item) {
      if (!item || !item.id) return;
      const all = this._all();
      const key = this._accountId();
      let list = (all[key] || []).filter((x) => x.id !== item.id);
      list.unshift({
        id: item.id,
        name: item.name,
        logo: item.logo || "",
        section: item.section,
        url: item.url || "",
        ext: item.ext,
        seriesId: item.seriesId,
        categoryId: item.categoryId,
        watchedAt: Date.now()
      });
      if (list.length > MAX) list = list.slice(0, MAX);
      all[key] = list;
      prefs.set(LS.HISTORY, all);
    }
    clear() {
      const all = this._all();
      all[this._accountId()] = [];
      prefs.set(LS.HISTORY, all);
    }
  };
  var history = new History();

  // js/ui/screens/ListScreen.js
  var TITLES = {
    [SECTION.LIVE]: "Live TV",
    [SECTION.MOVIE]: "Movies",
    [SECTION.SERIES]: "Series",
    [SECTION.FAVORITES]: "Favorites",
    [SECTION.RECENT]: "Recently watched"
  };
  var FAV_CAT = "__favorites__";
  function gridConfig(section) {
    if (section === SECTION.MOVIE || section === SECTION.SERIES) {
      return { columns: 4, cellHeight: 420, poster: true };
    }
    return { columns: 4, cellHeight: 230, poster: false };
  }
  var ListScreen = class extends View {
    constructor(router, params) {
      super(router, params);
      this.section = params.section;
      this.hasCats = [SECTION.LIVE, SECTION.MOVIE, SECTION.SERIES].includes(this.section);
      this.zone = this.hasCats ? "cats" : "grid";
      this.catIndex = 0;
      this.allCategories = [];
      this.categories = [];
      this.allItems = [];
      this._catDeb = null;
      this._itemDeb = null;
    }
    render() {
      const cfg = gridConfig(this.section);
      this.catsEl = el("div", { class: "cats" });
      this.grid = new VirtualGrid({
        columns: cfg.columns,
        cellHeight: cfg.cellHeight,
        gap: 24,
        renderCell: (item, i) => this._renderCell(item, i, cfg.poster),
        onSelect: (item) => this._open(item)
      });
      const catSearch = this._searchField(
        "Search categories\u2026",
        (v) => this._debounceCat(v),
        (dir) => {
          if (dir === "up") this._setZone("catSearch");
          else this._setZone(this.categories.length ? "cats" : "gridSearch");
        }
      );
      this.catSearchField = catSearch.field;
      this.catSearchInput = catSearch.input;
      this.catsPane = el("div", { class: "cats-pane" }, [this.catSearchField, this.catsEl]);
      const itemSearch = this._searchField(
        "Search in this category\u2026",
        (v) => this._debounceItem(v),
        (dir) => {
          if (dir === "up") this._setZone(this.hasCats ? "catSearch" : "gridSearch");
          else if (dir === "back") this._setZone(this.hasCats ? "cats" : this.grid.isEmpty ? "gridSearch" : "grid");
          else this._setZone(this.grid.isEmpty ? "gridSearch" : "grid");
        }
      );
      this.itemSearchField = itemSearch.field;
      this.itemSearchInput = itemSearch.input;
      this.gridEmpty = el("div", { class: "grid-empty is-hidden" }, "");
      this.gridPane = el("div", { class: "grid-pane" }, [this.itemSearchField, this.grid.el, this.gridEmpty]);
      this.titleEl = el("h1", { class: "list-title" }, TITLES[this.section] || "Browse");
      return el("div", { class: "list-screen" }, [
        el("div", { class: "list-header" }, [this.titleEl]),
        el("div", { class: "list-body" }, [this.catsPane, this.gridPane]),
        el("div", { class: "hintbar" }, [
          this._hint("\u2315", "Search"),
          this._hint("OK", "Open"),
          this._hint("YELLOW", "Favorite", "yellow"),
          this._hint("BACK", "Back")
        ])
      ]);
    }
    _hint(key, text, color = "") {
      return el("span", { class: "hint" }, [
        el("span", { class: `hint-key ${color ? "hint-key--" + color : ""}` }, key),
        el("span", { class: "hint-text" }, text)
      ]);
    }
    /**
     * A focusable search box wrapping a native input (opens the TV keyboard).
     * While editing, Down/Enter leaves the field to the results, Up moves up,
     * Back/Return closes it — so you're never "trapped" typing.
     * @param {string} placeholder
     * @param {(v:string)=>void} onInput
     * @param {(dir:'down'|'up'|'back')=>void} onExit
     */
    _searchField(placeholder, onInput, onExit) {
      const input = el("input", {
        class: "field-input search-input",
        type: "text",
        placeholder,
        autocomplete: "off",
        autocapitalize: "off",
        spellcheck: false
      });
      input.addEventListener("input", () => onInput(input.value));
      input.addEventListener("keydown", (e) => {
        const code = e.keyCode || e.which;
        if (code === 40 || code === 13) {
          e.preventDefault();
          e.stopPropagation();
          input.blur();
          onExit("down");
        } else if (code === 38) {
          e.preventDefault();
          e.stopPropagation();
          input.blur();
          onExit("up");
        } else if (code === 10009 || code === 27) {
          e.preventDefault();
          e.stopPropagation();
          input.blur();
          onExit("back");
        }
      });
      const field = el("div", { class: "pane-search focusable", tabindex: "-1" }, [
        el("span", { class: "pane-search-icon" }, "\u2315"),
        input
      ]);
      field.onSelect = () => input.focus();
      return { field, input };
    }
    async onMount() {
      if (!this.hasCats) {
        this.catsPane.classList.add("is-hidden");
        this.allItems = this.section === SECTION.FAVORITES ? favorites.list() : history.list();
        this.grid.setItems(this.allItems);
        this._updateEmpty();
        this.zone = this.allItems.length ? "grid" : "gridSearch";
        return;
      }
      await this._loadCategories();
    }
    onShow() {
      this.grid.measure();
      const cat = this.categories[this.catIndex];
      if (this.hasCats && cat && cat.id === FAV_CAT) this._selectCat(this.catIndex);
      this._setZone(this.zone);
    }
    onUnmount() {
      if (this._catDeb) clearTimeout(this._catDeb);
      if (this._itemDeb) clearTimeout(this._itemDeb);
    }
    // ---------------- Categories ----------------
    async _loadCategories() {
      try {
        this.allCategories = await playlist.getCategories(this.section);
      } catch {
        toast("Could not load categories.", "error");
        this.allCategories = [];
      }
      this.allCategories = [{ id: FAV_CAT, name: "\u2605 Favorites" }, ...this.allCategories];
      this.categories = this.allCategories.slice();
      this._renderCats();
      if (this.categories.length) {
        this.catIndex = 0;
        await this._selectCat(0);
      }
      this._setZone("cats");
    }
    _renderCats() {
      clear(this.catsEl);
      if (!this.categories.length) {
        this.catsEl.appendChild(el("div", { class: "cats-empty" }, "No matching categories"));
        return;
      }
      this.categories.forEach((cat, i) => {
        const b = el("div", { class: "cat", dataset: { i } }, cat.name);
        if (i === this.catIndex && this.zone === "cats") b.classList.add("is-focused");
        if (i === this.catIndex) b.classList.add("is-active");
        this.catsEl.appendChild(b);
      });
    }
    /** Filter the category list by name (level-1 search). */
    _debounceCat(value) {
      if (this._catDeb) clearTimeout(this._catDeb);
      this._catDeb = setTimeout(() => this._filterCats(value), 180);
    }
    _filterCats(value) {
      const q = normalize(value);
      this.categories = q ? this.allCategories.filter((c) => normalize(c.name).includes(q)) : this.allCategories.slice();
      this.catIndex = 0;
      this._renderCats();
      if (this.categories.length) this._selectCat(0);
      else {
        this.allItems = [];
        this.grid.setItems([]);
        this._updateEmpty();
      }
    }
    async _selectCat(i) {
      this.catIndex = Math.max(0, Math.min(i, this.categories.length - 1));
      this._syncCatClasses();
      this._ensureCatVisible();
      if (this.itemSearchInput) this.itemSearchInput.value = "";
      const cat = this.categories[this.catIndex];
      if (!cat) return;
      this.allItems = [];
      this.grid.setItems([]);
      if (cat.id === FAV_CAT) {
        const items = favorites.list().filter((it) => it.section === this.section);
        this.allItems = items;
        this.grid.setItems(items);
        this._updateEmpty();
        return;
      }
      try {
        const items = await playlist.getStreams(this.section, cat.id);
        if (this.categories[this.catIndex] === cat) {
          this.allItems = items;
          this.grid.setItems(items);
          this._updateEmpty();
        }
      } catch {
        toast("Could not load this category.", "error");
      }
    }
    /** Show a contextual message when the grid has no items. */
    _updateEmpty() {
      const empty = this.grid.isEmpty;
      this.gridEmpty.classList.toggle("is-hidden", !empty);
      if (!empty) return;
      const cat = this.hasCats ? this.categories[this.catIndex] : null;
      const searching = this.itemSearchInput && this.itemSearchInput.value.trim();
      if (searching) this.gridEmpty.textContent = "No matches.";
      else if (cat && cat.id === FAV_CAT || this.section === SECTION.FAVORITES)
        this.gridEmpty.textContent = "No favorites yet \u2014 press the YELLOW key on a title to add it.";
      else if (this.section === SECTION.RECENT)
        this.gridEmpty.textContent = "Nothing watched yet.";
      else this.gridEmpty.textContent = "Nothing here.";
    }
    _syncCatClasses() {
      this.catsEl.querySelectorAll(".cat").forEach((b) => {
        const i = Number(b.dataset.i);
        b.classList.toggle("is-active", i === this.catIndex);
        b.classList.toggle("is-focused", i === this.catIndex && this.zone === "cats");
      });
    }
    _ensureCatVisible() {
      const node = this.catsEl.querySelector(`.cat[data-i="${this.catIndex}"]`);
      if (node && node.scrollIntoView) node.scrollIntoView({ block: "nearest" });
    }
    // ---------------- In-category item search (level-2) ----------------
    _debounceItem(value) {
      if (this._itemDeb) clearTimeout(this._itemDeb);
      this._itemDeb = setTimeout(() => this._filterItems(value), 180);
    }
    _filterItems(value) {
      const q = normalize(value);
      const items = q ? this.allItems.filter((it) => normalize(it.name).includes(q)) : this.allItems;
      this.grid.setItems(items);
      this._updateEmpty();
    }
    // ---------------- Grid cell + open ----------------
    _renderCell(item, index, poster) {
      const img = lazyImage(item.logo, { alt: item.name });
      const fav = favorites.has(item.id) ? el("span", { class: "cell-fav" }, "\u2605") : null;
      return el("div", { class: `cell ${poster ? "cell--poster" : "cell--logo"}` }, [
        el("div", { class: "cell-thumb" }, [img, fav].filter(Boolean)),
        el("div", { class: "cell-name" }, item.name)
      ]);
    }
    _open(item) {
      if (!item) return;
      if (item.section === SECTION.MOVIE) {
        this.router.navigate(VIEW.DETAIL, { item, section: SECTION.MOVIE });
        return;
      }
      if (item.section === SECTION.SERIES && item.isSeries) {
        this.router.navigate(VIEW.DETAIL, { item, section: SECTION.SERIES });
        return;
      }
      if (item.url) {
        history.add(item);
        this.router.navigate(VIEW.PLAYER, {
          item,
          context: { items: this.grid.items, index: this.grid.focusedIndex, section: this.section }
        });
      }
    }
    // ---------------- Zones / input ----------------
    _setZone(zone) {
      this.zone = zone;
      if (this.catSearchField) this.catSearchField.classList.toggle("is-focused", zone === "catSearch");
      if (this.itemSearchField) this.itemSearchField.classList.toggle("is-focused", zone === "gridSearch");
      this._syncCatClasses();
      if (zone === "grid") this.grid.focus();
      else this.grid.blur();
    }
    onKey(action) {
      if (action === ACTION.YELLOW && this.zone === "grid") {
        const it = this.grid.current;
        if (it) {
          const added = favorites.toggle(it);
          toast(added ? "Added to favorites" : "Removed from favorites", "success", 1500);
          this.grid.focus();
        }
        return true;
      }
      switch (this.zone) {
        case "catSearch":
          return this._catSearchKey(action);
        case "cats":
          return this._catKey(action);
        case "gridSearch":
          return this._gridSearchKey(action);
        case "grid":
          return this._gridKey(action);
        default:
          return false;
      }
    }
    _catSearchKey(action) {
      switch (action) {
        case ACTION.OK:
          this.catSearchInput.focus();
          return true;
        case ACTION.DOWN:
          this._setZone(this.categories.length ? "cats" : "gridSearch");
          return true;
        case ACTION.RIGHT:
          this._setZone("gridSearch");
          return true;
        case ACTION.LEFT:
        case ACTION.UP:
          return true;
        default:
          return false;
      }
    }
    _catKey(action) {
      switch (action) {
        case ACTION.UP:
          if (this.catIndex > 0) this._selectCat(this.catIndex - 1);
          else this._setZone("catSearch");
          return true;
        case ACTION.DOWN:
          if (this.catIndex < this.categories.length - 1) this._selectCat(this.catIndex + 1);
          return true;
        case ACTION.RIGHT:
        case ACTION.OK:
          if (!this.grid.isEmpty) this._setZone("grid");
          else this._setZone("gridSearch");
          return true;
        case ACTION.LEFT:
          return true;
        default:
          return false;
      }
    }
    _gridSearchKey(action) {
      switch (action) {
        case ACTION.OK:
          this.itemSearchInput.focus();
          return true;
        case ACTION.DOWN:
          if (!this.grid.isEmpty) this._setZone("grid");
          return true;
        case ACTION.LEFT:
          if (this.hasCats) this._setZone("cats");
          return true;
        case ACTION.UP:
          if (this.hasCats) this._setZone("catSearch");
          return true;
        case ACTION.RIGHT:
          return true;
        default:
          return false;
      }
    }
    _gridKey(action) {
      if (action === ACTION.OK) {
        this.grid.navigate("ok");
        return true;
      }
      if ([ACTION.LEFT, ACTION.RIGHT, ACTION.UP, ACTION.DOWN].includes(action)) {
        const result2 = this.grid.navigate(action);
        if (result2 === "edge-left") this._setZone(this.hasCats ? "cats" : "gridSearch");
        else if (result2 === "edge-top") this._setZone("gridSearch");
        return true;
      }
      return false;
    }
    onBack() {
      if ((this.zone === "grid" || this.zone === "gridSearch") && this.hasCats) {
        this._setZone("cats");
        return true;
      }
      if (this.zone === "catSearch") {
        this._setZone("cats");
        return true;
      }
      return false;
    }
  };

  // js/ui/screens/DetailScreen.js
  var DetailScreen = class extends View {
    constructor(router, params) {
      super(router, params);
      this.item = params.item;
      this.section = params.section;
      this.seasons = [];
      this.seasonIndex = 0;
      this.movieInfo = null;
    }
    render() {
      this.posterImg = lazyImage(this.item.logo, { alt: this.item.name });
      this.metaEl = el("div", { class: "detail-meta" }, "");
      this.plotEl = el("p", { class: "detail-plot" }, "");
      const actions = [];
      if (this.section === SECTION.MOVIE) actions.push(this._playButton());
      actions.push(this._buildFavButton());
      this.actionsEl = el("div", { class: "detail-actions" }, actions);
      const hero = el("div", { class: "detail-hero" }, [
        el("div", { class: "detail-poster" }, [this.posterImg]),
        el("div", { class: "detail-info" }, [
          el("h1", { class: "detail-title" }, this.item.name || ""),
          this.metaEl,
          this.actionsEl,
          this.plotEl
        ])
      ]);
      const children = [hero];
      if (this.section === SECTION.SERIES) {
        this.seasonsEl = el("div", { class: "detail-seasons" });
        this.episodesEl = el("div", { class: "detail-episodes" });
        children.push(
          el("div", { class: "detail-section-title" }, "Seasons"),
          this.seasonsEl,
          el("div", { class: "detail-section-title" }, "Episodes"),
          this.episodesEl
        );
      }
      this.scroll = el("div", { class: "detail-scroll" }, children);
      return el("div", { class: "detail-screen" }, [
        this.scroll,
        el("div", { class: "hintbar" }, [
          this._hint("OK", this.section === SECTION.SERIES ? "Play episode" : "Play"),
          this._hint("BACK", "Back")
        ])
      ]);
    }
    _hint(key, text) {
      return el("span", { class: "hint" }, [
        el("span", { class: "hint-key" }, key),
        el("span", { class: "hint-text" }, text)
      ]);
    }
    _playButton() {
      const b = el("button", { class: "btn btn--primary detail-btn focusable", tabindex: "-1" }, [
        el("span", { class: "btn-icon" }, "\u25BA"),
        el("span", {}, "Play")
      ]);
      b.onSelect = () => this._playMovie();
      b.addEventListener("click", () => this._playMovie());
      return b;
    }
    _buildFavButton() {
      this.favBtn = el("button", { class: "btn detail-btn focusable", tabindex: "-1" });
      this.favBtn.onSelect = () => this._toggleFav();
      this.favBtn.addEventListener("click", () => this._toggleFav());
      this._renderFav();
      return this.favBtn;
    }
    _renderFav() {
      const on = favorites.has(this.item.id);
      clear(this.favBtn);
      this.favBtn.appendChild(el("span", { class: "btn-icon heart" }, on ? "\u2665" : "\u2661"));
      this.favBtn.appendChild(el("span", {}, on ? "Favorited" : "Add to favorites"));
      this.favBtn.classList.toggle("is-fav", on);
    }
    _toggleFav() {
      const added = favorites.toggle(this.item);
      this._renderFav();
      toast(added ? "Added to favorites" : "Removed from favorites", "success", 1500);
    }
    async onMount() {
      this.posterImg.load();
      if (this.section === SECTION.MOVIE) await this._loadMovie();
      else await this._loadSeries();
    }
    onShow() {
      focus.setRoot(this.el);
      focus.focusFirst(this.el);
    }
    // ---------------- Movie ----------------
    async _loadMovie() {
      try {
        const info = await playlist.getMovieInfo(this.item.id);
        this.movieInfo = info;
        if (info) {
          this.plotEl.textContent = info.plot || "";
          this.metaEl.textContent = [
            info.releaseDate,
            info.genre,
            info.rating ? `\u2605 ${info.rating}` : "",
            info.duration
          ].filter(Boolean).join("   \xB7   ");
          if ((!this.item.logo || !this.posterImg._pendingSrc) && info.cover) {
            this.posterImg._pendingSrc = info.cover;
            this.posterImg.load();
          }
        }
      } catch {
      }
    }
    _playMovie() {
      const url = this.movieInfo && this.movieInfo.url || this.item.url;
      if (!url) {
        toast("Stream not available.", "error");
        return;
      }
      const it = { ...this.item, url };
      history.add(it);
      this.router.navigate(VIEW.PLAYER, {
        item: it,
        context: { items: [it], index: 0, section: SECTION.MOVIE }
      });
    }
    // ---------------- Series ----------------
    async _loadSeries() {
      try {
        const data = await playlist.getSeriesEpisodes(this.item.seriesId || this.item.id);
        this.seasons = data.seasons || [];
        this.plotEl.textContent = data.info && data.info.plot || this.item.plot || "";
        if (data.info) {
          this.metaEl.textContent = [
            data.info.genre,
            data.info.rating ? `\u2605 ${data.info.rating}` : ""
          ].filter(Boolean).join("   \xB7   ");
        }
      } catch {
        this.seasons = [];
      }
      this._renderSeasons();
      this._selectSeason(0);
      if (!focus.current || !this.el.contains(focus.current)) focus.focusFirst(this.el);
    }
    _renderSeasons() {
      clear(this.seasonsEl);
      if (!this.seasons.length) {
        this.seasonsEl.appendChild(el("div", { class: "detail-empty" }, "No seasons found"));
        return;
      }
      this.seasons.forEach((s, i) => {
        const chip = el(
          "div",
          { class: "season-chip focusable", tabindex: "-1", dataset: { i } },
          `Season ${s.season}`
        );
        if (i === this.seasonIndex) chip.classList.add("is-active");
        chip.onSelect = () => this._selectSeason(i);
        this.seasonsEl.appendChild(chip);
      });
    }
    _selectSeason(i) {
      this.seasonIndex = Math.max(0, Math.min(i, this.seasons.length - 1));
      this.seasonsEl.querySelectorAll(".season-chip").forEach((c) => c.classList.toggle("is-active", Number(c.dataset.i) === this.seasonIndex));
      this._renderEpisodes();
    }
    _renderEpisodes() {
      clear(this.episodesEl);
      const season = this.seasons[this.seasonIndex];
      const eps = season ? season.episodes : [];
      if (!eps.length) {
        this.episodesEl.appendChild(el("div", { class: "detail-empty" }, "No episodes"));
        return;
      }
      eps.forEach((ep, idx) => {
        const row = el("div", { class: "episode-row focusable", tabindex: "-1" }, [
          el("span", { class: "episode-num" }, `E${ep.episodeNum || idx + 1}`),
          el("span", { class: "episode-name" }, ep.name || `Episode ${idx + 1}`)
        ]);
        row.onSelect = () => this._playEpisode(ep, idx, eps);
        this.episodesEl.appendChild(row);
      });
    }
    _playEpisode(ep, idx, eps) {
      if (!ep || !ep.url) {
        toast("Episode not available.", "error");
        return;
      }
      history.add(ep);
      this.router.navigate(VIEW.PLAYER, {
        item: ep,
        context: { items: eps, index: idx, section: SECTION.SERIES }
      });
    }
  };

  // js/player/AVPlayer.js
  var log11 = logger.child("AVPlayer");
  var PEVENT = Object.freeze({
    BUFFERING: "buffering",
    READY: "ready",
    PLAYING: "playing",
    PAUSED: "paused",
    COMPLETED: "completed",
    ERROR: "error"
  });
  var AVPlayer = class {
    /** @param {HTMLElement} container element that hosts the media surface */
    constructor(container) {
      this.container = container;
      this.onEvent = () => {
      };
      this._muted = false;
      this._url = "";
      this._useAvplay = typeof webapis !== "undefined" && !!webapis.avplay;
      this._media = null;
      this._buildSurface();
    }
    get isAvplay() {
      return this._useAvplay;
    }
    /** Create the appropriate media surface. */
    _buildSurface() {
      if (this._useAvplay) {
        const obj = document.createElement("object");
        obj.type = "application/avplayer";
        obj.className = "av-surface";
        this.container.appendChild(obj);
        this._media = obj;
      } else {
        const video = document.createElement("video");
        video.className = "av-surface";
        video.setAttribute("playsinline", "");
        this.container.appendChild(video);
        this._media = video;
        this._bindHtml5(video);
      }
    }
    /** Register the single normalized event callback. */
    setEventHandler(fn) {
      this.onEvent = fn || (() => {
      });
    }
    _emit(name, data) {
      try {
        this.onEvent(name, data);
      } catch (e) {
        log11.error("event handler threw", e);
      }
    }
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
        this.close();
        av.open(url);
        av.setListener({
          onbufferingstart: () => this._emit(PEVENT.BUFFERING),
          onbufferingprogress: (pct) => this._emit(PEVENT.BUFFERING, { percent: pct }),
          onbufferingcomplete: () => this._emit(PEVENT.PLAYING),
          onstreamcompleted: () => this._emit(PEVENT.COMPLETED),
          oncurrentplaytime: (ms) => this._emit("time", { current: ms / 1e3 }),
          onerror: (err) => {
            log11.warn("avplay error", err);
            this._emit(PEVENT.ERROR, { code: err });
          }
        });
        av.setDisplayRect(0, 0, 1920, 1080);
        try {
          av.setDisplayMethod("PLAYER_DISPLAY_MODE_LETTER_BOX");
        } catch (e) {
        }
        return new Promise((resolve) => {
          av.prepareAsync(
            () => {
              this._emit(PEVENT.READY);
              av.play();
              this._screenSaver(false);
              this._emit(PEVENT.PLAYING);
              resolve(true);
            },
            (e) => {
              log11.warn("prepareAsync failed", e);
              this._emit(PEVENT.ERROR, { code: e });
              resolve(false);
            }
          );
        });
      } catch (e) {
        log11.error("avplay open failed", e && e.name);
        this._emit(PEVENT.ERROR, { code: e && e.name });
        return false;
      }
    }
    // ---------------- HTML5 path (desktop dev) ----------------
    _bindHtml5(v) {
      v.addEventListener("waiting", () => this._emit(PEVENT.BUFFERING));
      v.addEventListener("playing", () => this._emit(PEVENT.PLAYING));
      v.addEventListener("canplay", () => this._emit(PEVENT.READY));
      v.addEventListener("pause", () => this._emit(PEVENT.PAUSED));
      v.addEventListener("ended", () => this._emit(PEVENT.COMPLETED));
      v.addEventListener("timeupdate", () => this._emit("time", { current: v.currentTime }));
      v.addEventListener("error", () => this._emit(PEVENT.ERROR, { code: v.error && v.error.code }));
    }
    async _openHtml5(url) {
      const v = this._media;
      v.src = url;
      try {
        await v.play();
        this._emit(PEVENT.PLAYING);
        return true;
      } catch (e) {
        log11.warn("html5 play rejected (autoplay?)", e && e.name);
        return false;
      }
    }
    // ---------------- Common controls ----------------
    play() {
      if (this._useAvplay) {
        try {
          webapis.avplay.play();
          this._screenSaver(false);
          this._emit(PEVENT.PLAYING);
        } catch (e) {
        }
      } else {
        this._media.play();
      }
    }
    pause() {
      if (this._useAvplay) {
        try {
          webapis.avplay.pause();
          this._screenSaver(true);
          this._emit(PEVENT.PAUSED);
        } catch (e) {
        }
      } else {
        this._media.pause();
      }
    }
    /**
     * Enable/disable the TV screen saver. Disabled during playback so a long
     * live stream isn't interrupted; re-enabled when paused/stopped. Safe
     * no-op if the appcommon API isn't present.
     * @param {boolean} enabled
     */
    _screenSaver(enabled) {
      try {
        if (typeof webapis !== "undefined" && webapis.appcommon && webapis.appcommon.AppCommonScreenSaverState) {
          const S = webapis.appcommon.AppCommonScreenSaverState;
          webapis.appcommon.setScreenSaver(enabled ? S.SCREEN_SAVER_ON : S.SCREEN_SAVER_OFF, () => {
          }, () => {
          });
        }
      } catch (e) {
      }
    }
    /** @returns {boolean} true if now paused */
    togglePlay() {
      if (this.isPaused()) {
        this.play();
        return false;
      }
      this.pause();
      return true;
    }
    isPaused() {
      if (this._useAvplay) {
        try {
          return webapis.avplay.getState() === "PAUSED";
        } catch (e) {
          return false;
        }
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
          if (deltaSeconds >= 0) webapis.avplay.jumpForward(deltaSeconds * 1e3);
          else webapis.avplay.jumpBackward(-deltaSeconds * 1e3);
        } catch (e) {
        }
      } else {
        try {
          this._media.currentTime = Math.max(0, this._media.currentTime + deltaSeconds);
        } catch (e) {
        }
      }
    }
    /** Absolute seek to a position in seconds (VOD only). */
    seekTo(seconds) {
      const s = Math.max(0, seconds);
      if (this._useAvplay) {
        try {
          webapis.avplay.seekTo(Math.round(s * 1e3));
        } catch (e) {
        }
      } else {
        try {
          this._media.currentTime = s;
        } catch (e) {
        }
      }
    }
    /** Total duration in seconds (0 if unknown / live). */
    getDuration() {
      if (this._useAvplay) {
        try {
          const d2 = webapis.avplay.getDuration();
          return d2 > 0 ? d2 / 1e3 : 0;
        } catch (e) {
          return 0;
        }
      }
      const d = this._media.duration;
      return Number.isFinite(d) ? d : 0;
    }
    /** Current playback position in seconds. */
    getCurrentTime() {
      if (this._useAvplay) {
        try {
          return webapis.avplay.getCurrentTime() / 1e3;
        } catch (e) {
          return 0;
        }
      }
      return this._media.currentTime || 0;
    }
    /** Toggle mute via the TV audio control (or the <video> element). */
    toggleMute() {
      this._muted = !this._muted;
      try {
        if (typeof tizen !== "undefined" && tizen.tvaudiocontrol) {
          tizen.tvaudiocontrol.setMute(this._muted);
        } else if (!this._useAvplay) {
          this._media.muted = this._muted;
        }
      } catch (e) {
        log11.warn("mute failed", e);
      }
      return this._muted;
    }
    /** Stop playback (keeps the surface for a subsequent open). */
    stop() {
      if (this._useAvplay) {
        try {
          webapis.avplay.stop();
          this._screenSaver(true);
        } catch (e) {
        }
      } else {
        try {
          this._media.pause();
          this._media.removeAttribute("src");
          this._media.load();
        } catch (e) {
        }
      }
    }
    /** Fully close/release the player. */
    close() {
      if (this._useAvplay) {
        try {
          webapis.avplay.stop();
        } catch (e) {
        }
        try {
          webapis.avplay.close();
        } catch (e) {
        }
        this._screenSaver(true);
      } else if (this._media) {
        try {
          this._media.pause();
          this._media.removeAttribute("src");
          this._media.load();
        } catch (e) {
        }
      }
    }
    /** Remove the surface entirely (on screen teardown). */
    destroy() {
      this.close();
      if (this._media && this._media.parentNode) this._media.parentNode.removeChild(this._media);
      this._media = null;
    }
  };

  // js/ui/screens/PlayerScreen.js
  var log12 = logger.child("Player");
  var CONTROLS_TIMEOUT = 4500;
  var MAX_AUTO_RETRY = 2;
  var SEEK_STEP = 10;
  var PlayerScreen = class extends View {
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
      this.surface = el("div", { class: "player-surface" });
      this.spinner = el("div", { class: "player-buffering" }, [el("div", { class: "spinner" })]);
      this.centerIcon = el("div", { class: "player-center-icon" });
      this.pcTitle = el("div", { class: "pc-title" }, this.item.name || "");
      this.pcMeta = el("div", { class: "pc-meta" }, "");
      const infoRow = el("div", { class: "pc-info" }, [this.pcTitle, this.pcMeta]);
      let mainRow;
      if (this.isLive) {
        mainRow = el("div", { class: "pc-live" }, [el("span", { class: "pc-live-dot" }), "LIVE"]);
      } else {
        this.pcCur = el("div", { class: "pc-time" }, "0:00");
        this.pcDur = el("div", { class: "pc-time" }, "--:--");
        this.pcFill = el("div", { class: "pc-fill" });
        this.pcHandle = el("div", { class: "pc-handle" });
        this.pcBar = el("div", { class: "pc-bar" }, [this.pcFill, this.pcHandle]);
        mainRow = el("div", { class: "pc-progress" }, [this.pcCur, this.pcBar, this.pcDur]);
      }
      const hints = el("div", { class: "pc-hints" }, this.isLive ? [this._hint("\u25B2\u25BC", "Channel"), this._hint("OK", "Pause"), this._hint("m", "Mute")] : [this._hint("\u25C0 \u25B6", "Seek 10s"), this._hint("OK", "Play/Pause"), this._hint("\u25B2\u25BC", "Episode")]);
      this.controls = el("div", { class: "player-controls" }, [infoRow, mainRow, hints]);
      this.errorPanel = el("div", { class: "player-error is-hidden" }, [
        el("div", { class: "player-error-title" }, "Playback error"),
        el("div", { class: "player-error-msg" }, ""),
        el("div", { class: "player-error-hint" }, "Press OK to retry \xB7 BACK to exit")
      ]);
      return el("div", { class: "player-screen" }, [
        this.surface,
        this.spinner,
        this.centerIcon,
        this.controls,
        this.errorPanel
      ]);
    }
    _hint(key, text) {
      return el("span", { class: "pc-hint" }, [
        el("span", { class: "pc-hint-key" }, key),
        el("span", {}, text)
      ]);
    }
    onMount() {
      document.body.classList.add("av-playing");
      this.player = new AVPlayer(this.surface);
      this.player.setEventHandler((name, data) => this._onEvent(name, data));
      this._onVisibility = () => {
        if (document.hidden) this._suspend();
        else this._resume();
      };
      document.addEventListener("visibilitychange", this._onVisibility);
      this._playCurrent();
    }
    onShow() {
      this._showControls();
    }
    onUnmount() {
      this._destroyed = true;
      if (this._hideTimer) clearTimeout(this._hideTimer);
      if (this._retryTimer) clearTimeout(this._retryTimer);
      if (this._onVisibility) document.removeEventListener("visibilitychange", this._onVisibility);
      if (this.player) this.player.destroy();
      document.body.classList.remove("av-playing");
    }
    _suspend() {
      if (this._destroyed || this._suspended) return;
      this._suspended = true;
      if (this._retryTimer) {
        clearTimeout(this._retryTimer);
        this._retryTimer = null;
      }
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
        if (wrap) i = (i % n + n) % n;
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
      if (this._retryTimer) {
        clearTimeout(this._retryTimer);
        this._retryTimer = null;
      }
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
      this._flashCenter(delta > 0 ? "\u23ED" : "\u23EE");
      this._playCurrent();
    }
    /** Relative seek (VOD only) with optimistic UI update. */
    _seek(delta) {
      if (this.isLive || !this.player) return;
      if (!this._duration) this._duration = this.player.getDuration() || 0;
      const max = this._duration || this._current + Math.abs(delta);
      this._current = Math.max(0, Math.min(max, this._current + delta));
      this.player.seek(delta);
      this._updateProgress();
      this._flashCenter(delta > 0 ? "\u23E9" : "\u23EA");
      this._showControls();
    }
    _onEvent(name, data) {
      switch (name) {
        case PEVENT.BUFFERING:
          this._showSpinner(true);
          break;
        case PEVENT.READY:
        case PEVENT.PLAYING:
          this._retry = 0;
          if (!this._duration) this._duration = this.player.getDuration() || 0;
          this._updateProgress();
          this._showSpinner(false);
          this._hideError();
          break;
        case PEVENT.PAUSED:
          break;
        case "time":
          if (data && typeof data.current === "number") {
            this._current = data.current;
            if (!this._duration) this._duration = this.player.getDuration() || 0;
            this._updateProgress();
          }
          break;
        case PEVENT.COMPLETED:
          this._onCompleted();
          break;
        case PEVENT.ERROR:
          this._handleError(data);
          break;
        default:
          break;
      }
    }
    /** VOD finished -> auto-play next episode, or exit if none. */
    _onCompleted() {
      if (this.isLive) return;
      const next = this._nextPlayableIndex(this.index, 1, false);
      if (next >= 0) {
        this.index = next;
        const item = this._playableAt(next);
        toast(`Up next: ${truncate(item.name || "Next", 40)}`, "info", 2200);
        this._flashCenter("\u23ED");
        this._playCurrent();
      } else {
        toast("Finished", "info", 1500);
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
        log12.warn(`playback error, auto-retry ${this._retry}/${MAX_AUTO_RETRY} in ${delay}ms`);
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
      this._showError("This stream could not be played. It may be offline.");
    }
    // ---------------- UI ----------------
    _updateInfo(item) {
      this.pcTitle.textContent = item.name || "";
      const total = this.context.items.length;
      const pos = `${this.index + 1} / ${total}`;
      if (this.isLive) this.pcMeta.textContent = `Channel ${pos}`;
      else this.pcMeta.textContent = total > 1 ? `Episode ${pos}` : "";
    }
    _updateProgress() {
      if (this.isLive || !this.pcBar) return;
      const dur = this._duration || 0;
      const cur = dur > 0 ? Math.min(this._current, dur) : this._current;
      const pct = dur > 0 ? Math.min(100, cur / dur * 100) : 0;
      this.pcFill.style.width = `${pct}%`;
      this.pcHandle.style.left = `${pct}%`;
      this.pcCur.textContent = formatTime(cur);
      this.pcDur.textContent = dur > 0 ? formatTime(dur) : "--:--";
    }
    _showSpinner(on) {
      this.spinner.classList.toggle("is-visible", !!on);
    }
    _showError(msg) {
      this.errorPanel.querySelector(".player-error-msg").textContent = msg;
      this.errorPanel.classList.remove("is-hidden");
    }
    _hideError() {
      this.errorPanel.classList.add("is-hidden");
    }
    _flashCenter(symbol) {
      this.centerIcon.textContent = symbol;
      this.centerIcon.classList.add("is-visible");
      clearTimeout(this._centerTimer);
      this._centerTimer = setTimeout(() => this.centerIcon.classList.remove("is-visible"), 650);
    }
    /** Show controls; keep them visible while paused, auto-hide while playing. */
    _showControls() {
      this.controls.classList.add("is-visible");
      if (this._hideTimer) clearTimeout(this._hideTimer);
      const paused = this.player && this.player.isPaused();
      if (!paused) {
        this._hideTimer = setTimeout(() => this.controls.classList.remove("is-visible"), CONTROLS_TIMEOUT);
      }
    }
    // ---------------- Input ----------------
    onKey(action) {
      if (!this.errorPanel.classList.contains("is-hidden")) {
        if (action === ACTION.OK) {
          this._retry = 0;
          this._playCurrent();
          return true;
        }
        if (action === ACTION.BACK) return false;
      }
      switch (action) {
        case ACTION.OK:
        case ACTION.PLAY_PAUSE: {
          const paused = this.player.togglePlay();
          this._flashCenter(paused ? "\u275A\u275A" : "\u25BA");
          this._showControls();
          return true;
        }
        case ACTION.PLAY:
          this.player.play();
          this._flashCenter("\u25BA");
          this._showControls();
          return true;
        case ACTION.PAUSE:
          this.player.pause();
          this._flashCenter("\u275A\u275A");
          this._showControls();
          return true;
        case ACTION.RIGHT:
        case ACTION.FF:
          this._seek(+SEEK_STEP);
          return true;
        case ACTION.LEFT:
        case ACTION.REW:
          this._seek(-SEEK_STEP);
          return true;
        case ACTION.UP:
        case ACTION.CH_UP:
          this._switch(1);
          this._showControls();
          return true;
        case ACTION.DOWN:
        case ACTION.CH_DOWN:
          this._switch(-1);
          this._showControls();
          return true;
        case ACTION.MUTE: {
          const m = this.player.toggleMute();
          toast(m ? "Muted" : "Unmuted", "info", 1200);
          return true;
        }
        case ACTION.INFO:
          this._showControls();
          return true;
        case ACTION.STOP:
          this.router.back();
          return true;
        default:
          return false;
      }
    }
    onBack() {
      this.router.back();
      return true;
    }
  };

  // js/ui/screens/SearchScreen.js
  var SearchScreen = class extends View {
    constructor(router, params) {
      super(router, params);
      this.zone = "input";
      this._debounce = null;
    }
    render() {
      this.input = el("input", {
        class: "field-input search-input",
        type: "text",
        placeholder: i18n.t("search.placeholder", "Type to search\u2026"),
        autocomplete: "off",
        autocapitalize: "off",
        spellcheck: false
      });
      this.input.addEventListener("input", () => this._onQuery());
      this.input.addEventListener("keydown", (e) => {
        const code = e.keyCode || e.which;
        if (code === 40 || code === 13) {
          e.preventDefault();
          e.stopPropagation();
          this.input.blur();
          if (!this.grid.isEmpty) {
            this.zone = "results";
            this.field.classList.remove("is-focused");
            this.grid.focus();
          }
        } else if (code === 10009 || code === 27) {
          e.preventDefault();
          e.stopPropagation();
          this.input.blur();
        }
      });
      this.field = el("div", { class: "form-field focusable", tabindex: "-1" }, [this.input]);
      this.field.onSelect = () => this.input.focus();
      this.grid = new VirtualGrid({
        columns: 5,
        cellHeight: 350,
        gap: 24,
        renderCell: (item) => this._renderCell(item),
        onSelect: (item) => this._open(item)
      });
      this.empty = el("div", { class: "search-empty" }, i18n.t("search.hint", "Search live TV, movies and series."));
      this.resultsWrap = el("div", { class: "search-results" }, [this.empty]);
      return el("div", { class: "search-screen screen" }, [
        el("div", { class: "list-header" }, [el("h1", { class: "list-title" }, i18n.t("search.title", "Search"))]),
        el("div", { class: "search-bar" }, [this.field]),
        this.resultsWrap,
        el("div", { class: "hintbar" }, [
          this._hint("OK", i18n.t("common.open", "Open")),
          this._hint("BACK", i18n.t("common.back", "Back"))
        ])
      ]);
    }
    _hint(key, text) {
      return el("span", { class: "hint" }, [el("span", { class: "hint-key" }, key), el("span", { class: "hint-text" }, text)]);
    }
    _renderCell(item) {
      const img = lazyImage(item.logo, { alt: item.name });
      return el("div", { class: "cell cell--poster" }, [
        el("div", { class: "cell-thumb" }, [img]),
        el("div", { class: "cell-name" }, item.name)
      ]);
    }
    onShow() {
      this.zone = "input";
      focus.setFocus(this.field);
    }
    _onQuery() {
      if (this._debounce) clearTimeout(this._debounce);
      this._debounce = setTimeout(() => this._runSearch(this.input.value), 400);
    }
    async _runSearch(q) {
      const query = (q || "").trim();
      if (query.length < 2) {
        this._showEmpty(i18n.t("search.hint", "Search live TV, movies and series."));
        return;
      }
      this._showEmpty(i18n.t("search.searching", "Searching\u2026"));
      try {
        const results = await playlist.search(query, { limit: 300 });
        if (!results.length) {
          this._showEmpty(i18n.t("search.none", "No results found."));
          return;
        }
        this.empty.classList.add("is-hidden");
        if (!this.grid.el.parentNode) this.resultsWrap.appendChild(this.grid.el);
        this.grid.setItems(results);
        this.grid.measure();
      } catch {
        this._showEmpty(i18n.t("search.error", "Search failed. Try again."));
      }
    }
    _showEmpty(text) {
      this.empty.textContent = text;
      this.empty.classList.remove("is-hidden");
      if (this.grid.el.parentNode) this.grid.el.remove();
    }
    _open(item) {
      if (!item || !item.url) return;
      history.add(item);
      this.router.navigate(VIEW.PLAYER, { item, context: { items: this.grid.items, index: this.grid.focusedIndex, section: item.section } });
    }
    onKey(action) {
      if (this.zone === "input") {
        if (action === ACTION.DOWN && !this.grid.isEmpty) {
          this.zone = "results";
          this.field.classList.remove("is-focused");
          this.grid.focus();
          return true;
        }
        return false;
      }
      if (action === ACTION.OK) {
        this.grid.navigate("ok");
        return true;
      }
      if ([ACTION.LEFT, ACTION.RIGHT, ACTION.UP, ACTION.DOWN].includes(action)) {
        const res = this.grid.navigate(action);
        if (res === "edge-top") {
          this.zone = "input";
          this.grid.blur();
          this.field.classList.add("is-focused");
        }
        return true;
      }
      return false;
    }
    onBack() {
      if (this.zone === "results") {
        this.zone = "input";
        this.grid.blur();
        this.field.classList.add("is-focused");
        return true;
      }
      return false;
    }
  };

  // js/ui/screens/SettingsScreen.js
  var SettingsScreen = class extends View {
    constructor(router, params) {
      super(router, params);
      this.settings = prefs.get(LS.SETTINGS, { autoUpdate: true });
    }
    render() {
      this.listEl = el("div", { class: "settings-list" });
      const screen = el("div", { class: "settings-screen screen" }, [
        el("div", { class: "list-header" }, [el("h1", { class: "list-title" }, i18n.t("settings.title", "Settings"))]),
        this.listEl
      ]);
      this._build();
      return screen;
    }
    _build() {
      this.listEl.innerHTML = "";
      const acc = accounts.getActive();
      this._row("settings.language", "Language", i18n.currentLabel, () => {
        i18n.cycle();
        toast(i18n.t("settings.languageChanged", "Language updated"), "success", 1500);
        this.rebuild();
      });
      this._row("settings.theme", "Theme", theme.currentLabel, () => {
        theme.cycle();
        this.rebuild();
      });
      this._row("settings.autoUpdate", "Automatic updates", this.settings.autoUpdate ? "On" : "Off", () => {
        this.settings.autoUpdate = !this.settings.autoUpdate;
        prefs.set(LS.SETTINGS, this.settings);
        this.rebuild();
      });
      this._row("settings.reload", "Reload playlist", "", async () => {
        if (!acc) return;
        showLoading(i18n.t("settings.reloading", "Reloading playlist\u2026"));
        try {
          await playlist.load(acc, { force: true });
          toast(i18n.t("settings.reloaded", "Playlist reloaded"), "success");
        } catch {
          toast(i18n.t("settings.reloadFailed", "Reload failed"), "error");
        } finally {
          hideLoading();
        }
      });
      this._row("settings.clearCache", "Clear cache", "", async () => {
        await playlist.clearCache();
        toast(i18n.t("settings.cacheCleared", "Cache cleared"), "success");
      });
      this._row("settings.reconnect", "Reconnect", "", () => {
        if (acc) connectAccount(this.router, acc);
      });
      if (acc) {
        const meta = acc.method === LOGIN_METHOD.XTREAM ? acc.serverUrl : "M3U playlist";
        this._info("settings.account", "Account", `${acc.name} \xB7 ${meta}`);
      }
      this._info("settings.version", "App version", APP_VERSION);
    }
    _row(key, fallback, value, onSelect) {
      const valEl = el("div", { class: "setting-value" }, value || "");
      const row = el("div", { class: "setting-row focusable", tabindex: "-1" }, [
        el("div", { class: "setting-label" }, i18n.t(key, fallback)),
        valEl
      ]);
      row.onSelect = onSelect;
      this.listEl.appendChild(row);
      return row;
    }
    _info(key, fallback, value) {
      this.listEl.appendChild(el("div", { class: "setting-row" }, [
        el("div", { class: "setting-label" }, i18n.t(key, fallback)),
        el("div", { class: "setting-value" }, value)
      ]));
    }
    /** Rebuild the list, preserving focus position where possible. */
    rebuild() {
      const idx = Array.from(this.listEl.children).indexOf(focus.current);
      this._build();
      const rows = this.listEl.querySelectorAll(".focusable");
      const target = rows[Math.max(0, Math.min(idx, rows.length - 1))];
      if (target) focus.setFocus(target);
    }
    onShow() {
      focus.focusFirst(this.el);
    }
  };

  // js/main.js
  var log13 = logger.child("Main");
  function hideBootScreen() {
    const boot = document.getElementById("boot-screen");
    if (!boot) return;
    boot.classList.add("is-hidden");
    setTimeout(() => boot.remove(), 400);
  }
  function bootStatus(text) {
    const s = document.getElementById("boot-status");
    if (s) s.textContent = text;
  }
  async function bootstrap() {
    log13.info("bootstrapping", { version: APP_VERSION });
    if (typeof tizen !== "undefined") document.documentElement.classList.add("is-tv");
    window.addEventListener("unhandledrejection", (e) => {
      const reason = e && e.reason;
      log13.warn("unhandled rejection", reason && reason.message || reason);
      e.preventDefault();
    });
    window.addEventListener("error", (e) => {
      log13.warn("window error", e && e.message);
    });
    theme.init();
    i18n.init();
    initToasts();
    remote.start();
    const container = document.getElementById("app");
    const router = new Router(container);
    router.register(VIEW.LOGIN, (r, p) => new LoginScreen(r, p)).register(VIEW.ACCOUNTS, (r, p) => new AccountsScreen(r, p)).register(VIEW.HOME, (r, p) => new HomeScreen(r, p)).register(VIEW.LIST, (r, p) => new ListScreen(r, p)).register(VIEW.DETAIL, (r, p) => new DetailScreen(r, p)).register(VIEW.PLAYER, (r, p) => new PlayerScreen(r, p)).register(VIEW.SEARCH, (r, p) => new SearchScreen(r, p)).register(VIEW.SETTINGS, (r, p) => new SettingsScreen(r, p));
    const active = accounts.getActive();
    if (active) {
      bootStatus("Reconnecting\u2026");
      hideBootScreen();
      const ok = await connectAccount(router, active, { silent: true });
      if (!ok) {
        router.replaceAll(accounts.count ? VIEW.ACCOUNTS : VIEW.LOGIN);
      }
    } else {
      hideBootScreen();
      router.navigate(accounts.count ? VIEW.ACCOUNTS : VIEW.LOGIN);
    }
    window.__iptv = {
      version: APP_VERSION,
      go: (view) => router.navigate(view)
    };
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
