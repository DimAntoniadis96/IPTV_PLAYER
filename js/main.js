/// <reference path="../../index.d.ts" />

/* =====================================================================
 * main.js — Application entry point
 * ---------------------------------------------------------------------
 * The single module referenced by index.html. It wires the core services,
 * registers every screen with the Router, starts remote input, then either
 * auto-reconnects to the last account or shows the accounts/login screen.
 *
 * TV vs browser is handled by feature detection inside each subsystem
 * (every `tizen`/`webapis` call is guarded), so no separate shim is needed.
 * ===================================================================== */

import { Router } from './ui/Router.js';
import { remote } from './input/RemoteControl.js';
import { initToasts } from './ui/components/Toast.js';
import { accounts } from './data/AccountManager.js';
import { connectAccount } from './ui/flows/connect.js';
import { VIEW, APP_VERSION } from './core/constants.js';
import { logger } from './core/Logger.js';
import { i18n } from './i18n/i18n.js';
import { theme } from './utils/theme.js';

// Screens
import { LoginScreen } from './ui/screens/LoginScreen.js';
import { AccountsScreen } from './ui/screens/AccountsScreen.js';
import { HomeScreen } from './ui/screens/HomeScreen.js';
import { ListScreen } from './ui/screens/ListScreen.js';
import { PlayerScreen } from './ui/screens/PlayerScreen.js';
import { SearchScreen } from './ui/screens/SearchScreen.js';
import { SettingsScreen } from './ui/screens/SettingsScreen.js';

const log = logger.child('Main');

/** Fade out and remove the boot splash. */
function hideBootScreen() {
    const boot = document.getElementById('boot-screen');
    if (!boot) return;
    boot.classList.add('is-hidden');
    setTimeout(() => boot.remove(), 400);
}

/** Update the boot status text (visible until the first screen shows). */
function bootStatus(text) {
    const s = document.getElementById('boot-status');
    if (s) s.textContent = text;
}

async function bootstrap() {
    log.info('bootstrapping', { version: APP_VERSION });

    // Mark real-TV runs so the CSS hides the mouse cursor (kept visible in
    // a desktop browser, where there's no remote to drive focus).
    if (typeof tizen !== 'undefined') document.documentElement.classList.add('is-tv');

    // Global safety net: keep stray promise rejections / errors from bubbling
    // to an "Uncaught" on the TV. Messages go through the redacting logger.
    window.addEventListener('unhandledrejection', (e) => {
        const reason = e && e.reason;
        log.warn('unhandled rejection', (reason && reason.message) || reason);
        e.preventDefault();
    });
    window.addEventListener('error', (e) => {
        log.warn('window error', e && e.message);
    });

    // 1) Preferences-driven services.
    theme.init();
    i18n.init();
    initToasts();

    // 2) Input.
    remote.start();

    // 3) Router + screen registry.
    const container = document.getElementById('app');
    const router = new Router(container);
    router
        .register(VIEW.LOGIN,    (r, p) => new LoginScreen(r, p))
        .register(VIEW.ACCOUNTS, (r, p) => new AccountsScreen(r, p))
        .register(VIEW.HOME,     (r, p) => new HomeScreen(r, p))
        .register(VIEW.LIST,     (r, p) => new ListScreen(r, p))
        .register(VIEW.PLAYER,   (r, p) => new PlayerScreen(r, p))
        .register(VIEW.SEARCH,   (r, p) => new SearchScreen(r, p))
        .register(VIEW.SETTINGS, (r, p) => new SettingsScreen(r, p));

    // 4) Decide the first screen.
    const active = accounts.getActive();
    if (active) {
        bootStatus('Reconnecting…');
        hideBootScreen();
        const ok = await connectAccount(router, active, { silent: true });
        if (!ok) {
            // Auto-reconnect failed: fall back to the accounts list / login.
            router.replaceAll(accounts.count ? VIEW.ACCOUNTS : VIEW.LOGIN);
        }
    } else {
        hideBootScreen();
        router.navigate(accounts.count ? VIEW.ACCOUNTS : VIEW.LOGIN);
    }

    // Minimal debug handle. Deliberately does NOT expose `router` or account
    // objects, since screen state holds credentialed stream URLs.
    window.__iptv = {
        version: APP_VERSION,
        go: (view) => router.navigate(view)
    };
}

// Kick off once the DOM is ready.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
    bootstrap();
}
