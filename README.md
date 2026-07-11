# IPTV Player — Samsung Tizen Smart TV

A clean, modular, production-quality IPTV player for **Samsung Smart TVs (2021+, Tizen 6.0+)**,
written in **HTML5 + CSS3 + Vanilla JavaScript (ES6 modules)** using the **Samsung AVPlay API**.

No frameworks (no React/Vue/Angular/Electron). No bundled channels or content — the app
connects only to a server **you** configure at runtime.

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
├── config.xml            # Tizen web app manifest (privileges, CSP, metadata)
├── index.html            # Single entry point / app shell
├── icon.png              # 512×512 app icon
├── css/
│   ├── variables.css     # Design tokens (theme)
│   ├── base.css          # Reset + boot screen + globals
│   ├── components.css     (Module 6)
│   ├── screens.css        (Module 6)
│   └── player.css         (Module 7)
├── js/                   # ES6 modules (added from Module 2; main.js is the entry point)
├── assets/
│   └── icons/            # UI + app icons
└── docs/
    └── BUILD.md          # Build, package (.wgt) and install instructions
```

## Build & install

See **[docs/BUILD.md](docs/BUILD.md)** for full Tizen Studio build, `.wgt` packaging, and
Developer-Mode install instructions.

## Status — module-by-module build

| # | Module | Status |
|---|--------|--------|
| 1 | Project scaffold + config.xml + build docs | ✅ done |
| 2 | Core utilities (HTTP, IndexedDB, event bus, logger, URL builder) | ⏳ |
| 3 | Account & auth manager | ⏳ |
| 4 | Playlist engine (Xtream API + M3U parser) | ⏳ |
| 5 | Remote keys + spatial focus | ⏳ |
| 6 | UI framework + screens | ⏳ |
| 7 | AVPlay video player | ⏳ |
| 8 | Favorites, recents, search, settings | ⏳ |
| 9 | Theming, i18n, packaging | ⏳ |

## Disclaimer

This software ships **no** playlists, channels, streams or copyrighted content. It is a
generic client for personal use with a server the operator is authorised to access.
