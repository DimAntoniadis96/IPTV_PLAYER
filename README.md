# IPTV Player — Samsung (Tizen) & LG (webOS) Smart TVs

A clean, modular, production-quality IPTV player for **Samsung (Tizen 6.0+)** and **LG (webOS)**
Smart TVs, written in **HTML5 + CSS3 + Vanilla JavaScript (ES6 modules)**. It uses the native
**Samsung AVPlay** engine on Tizen and **hls.js / mpegts.js** on webOS and browsers.

No frameworks (no React/Vue/Angular/Electron). No bundled channels or content — the app
connects only to a server **you** configure at runtime.

## ⚠️ Compatibility — will it run on my TV?

**This is a native app for Samsung and LG TVs. It is NOT an Android TV / Fire TV / Roku app.**

What matters is the TV's **operating system**, not the brand:

| TV operating system | Brands that use it | Supported? |
|---|---|---|
| **Tizen** | Samsung | ✅ **Yes** — install the `.wgt` |
| **webOS** | LG, some Tesla and other models | ✅ **Yes** — install the `.ipk` |
| **Android TV / Google TV** | Sony, Philips, TCL, Xiaomi, Nvidia Shield, **most Tesla**, most budget TVs | ❌ No |
| **Fire OS** | Amazon Fire TV | ❌ No |
| **Roku OS** | Roku (and some TCL / Hisense) | ❌ No |
| **VIDAA** | Hisense, some Tesla / Toshiba | ❌ No |

> **Check your TV's OS before trying.** Settings → About, or look up your exact model number.
> Many brands sell the same screen size with different systems — for example a **Tesla** TV can be
> **webOS (works)** or **Android TV (does not)**. The brand alone does not tell you.

### Browser / web mode (limited)

The app also runs in any modern **web browser** (from a hosted URL). This is handy as a quick demo
and for **live channels**, but be aware:

- Browsers only decode a limited set of formats (mainly **MP4 / H.264**).
- **Movies & series in `.mkv` or H.265/HEVC will NOT play in a browser** — they play only on the
  native Samsung/LG apps, which use the TV's hardware decoders.
- Cross-origin (CORS) rules may block some Xtream servers in a browser.

**For the full experience — live, movies and series in any format — use the native Samsung/LG app.**

## 📥 Installation

There is **no one‑click / USB install** — you need a **computer on the same Wi‑Fi as the TV** and
the TV's **Developer Mode**. Full step‑by‑step for both platforms is here:

### 👉 **[docs/INSTALL.md](docs/INSTALL.md)** — start here

Quick summary:

- **Samsung (Tizen):** a `.wgt` is tied to your specific TV (its DUID), so **you build and sign it
  for your own TV** with Tizen Studio. Follow [docs/BUILD.md](docs/BUILD.md).
- **LG (webOS):** download the `.ipk` from **[Releases](../../releases)** (or build it) and install
  it with `ares-install` while the TV is in Developer Mode. Works on any webOS TV in dev mode.

After installing, open the app and connect **your own** Xtream login or M3U URL — the app ships
with no channels.

## Features

- **Two login methods** — Xtream (server + username + password) or a pasted M3U URL.
- **Multiple saved accounts** — add / edit / delete, with automatic reconnect on startup.
- **Xtream Codes API first** — lazy, per-category loading for Live / Movies / Series; a
  streaming M3U parser is used for pasted-URL accounts. Handles **20,000+ channels**.
- **Full remote control support** with perfect spatial focus management — no mouse needed.
- **AVPlay video player** — fullscreen playback, buffering indicator, error handling &
  retry, channel up/down, play/pause, mute.
- **Categories**: Live TV, Movies, Series, Favorites, Search, Recently watched.
- **Performance**: virtual scrolling, lazy image loading, IndexedDB caching, async everywhere.
- **Settings**: language, theme, clear cache, reconnect, reload playlist, app version.
- **Security**: credentials never logged, HTTPS supported, every server response validated,
  no hardcoded server.

## Project structure

```
IPTV PROJECT/
├── config.xml            # Samsung Tizen manifest (privileges, CSP, metadata)
├── appinfo.json          # LG webOS manifest
├── icon.png              # 512×512 app icon
├── icon-80.png           # webOS icon (80×80)
├── icon-130.png          # webOS large icon (130×130)
├── index.html            # Single entry point / app shell
├── css/                  # Design tokens, base, components, screens, player, tv (flat/fast)
├── js/                   # ES6 modules (main.js is the entry point)
├── dist/                 # Built bundle: app.js (~77 KB) + hls.min.js + mpegts.js (on demand)
├── assets/               # UI + app icons
└── docs/                 # Build, package and install instructions
```

## Build from source (for developers)

> Just want to install the app? See **[Installation](#-installation)** above instead.

1. Build the bundle: `npm install` then `npm run build` (produces `dist/app.js` + the media libs).
2. **Samsung (Tizen):** package with Tizen Studio into a `.wgt` and install in Developer Mode.
   See **[docs/BUILD.md](docs/BUILD.md)** for full steps.
3. **LG (webOS):** package with `ares-package .` into an `.ipk` and install with
   `ares-install <file>.ipk` (webOS Developer Mode / `ares-cli`).

## Status — module-by-module build

| # | Module | Status |
|---|--------|--------|
| 1 | Project scaffold + config.xml + build docs | ✅ done |
| 2 | Core utilities (HTTP, IndexedDB, event bus, logger, URL builder) | ✅ done |
| 3 | Account & auth manager | ✅ done |
| 4 | Playlist engine (Xtream API + M3U parser) | ✅ done |
| 5 | Remote keys + spatial focus | ✅ done |
| 6 | UI framework + screens | ✅ done |
| 7 | AVPlay video player | ✅ done |
| 8 | Favorites, recents, search, settings | ✅ done |
| 9 | Theming, i18n, packaging | ✅ done |

## Security notes

- **Credentials are never logged.** The logger redacts both query-string
  (`?username=…&password=…`) and path-embedded (`/live/<user>/<pass>/…`)
  credentials, and object keys like `password`/`token`.
- **Stored locally in plaintext.** Accounts (including passwords) are kept in
  `localStorage` because automatic reconnect requires them. Anything with access
  to the TV's app storage can read them — this is an inherent tradeoff for the
  reconnect feature, not a leak.
- **HTTP vs HTTPS.** Xtream sends credentials in the URL, so prefer an `https://`
  server. If you enter a bare host, the app assumes `http://` (most IPTV panels
  are http on custom ports); type the scheme explicitly to force HTTPS.
- **No hardcoded server**, HTTPS supported, and every server response is
  validated before use.

## Disclaimer

This software ships **no** playlists, channels, streams or copyrighted content. It is a
generic client for personal use with a server the operator is authorised to access.
