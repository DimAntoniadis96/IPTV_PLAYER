/* =====================================================================
 * HomeScreen.js — Main menu after connecting
 * ---------------------------------------------------------------------
 * Big, remote-friendly tiles for each section: Live TV, Movies, Series,
 * Favorites, Recently watched, Search and Settings.
 * ===================================================================== */

import { View } from '../View.js';
import { el } from '../../utils/dom.js';
import { accounts } from '../../data/AccountManager.js';
import { SECTION, VIEW } from '../../core/constants.js';
import { focus } from '../../input/FocusManager.js';

const TILES = [
    { key: SECTION.LIVE,      label: 'Live TV',        view: VIEW.LIST,     icon: '📺' },
    { key: SECTION.MOVIE,     label: 'Movies',         view: VIEW.LIST,     icon: '🎬' },
    { key: SECTION.SERIES,    label: 'Series',         view: VIEW.LIST,     icon: '📼' },
    { key: SECTION.FAVORITES, label: 'Favorites',      view: VIEW.LIST,     icon: '★'  },
    { key: SECTION.RECENT,    label: 'Recently watched', view: VIEW.LIST,   icon: '⟳'  },
    { key: SECTION.SEARCH,    label: 'Search',         view: VIEW.SEARCH,   icon: '🔍' },
    { key: 'settings',        label: 'Settings',       view: VIEW.SETTINGS, icon: '⚙'  }
];

export class HomeScreen extends View {
    render() {
        const acc = accounts.getActive();
        const grid = el('div', { class: 'home-grid' });
        for (const t of TILES) {
            const tile = el('div', { class: 'home-tile focusable', tabindex: '-1' }, [
                el('div', { class: 'home-tile-icon' }, t.icon),
                el('div', { class: 'home-tile-label' }, t.label)
            ]);
            tile.onSelect = () => {
                if (t.view === VIEW.LIST) this.router.navigate(VIEW.LIST, { section: t.key });
                else this.router.navigate(t.view);
            };
            grid.appendChild(tile);
        }

        return el('div', { class: 'home-screen' }, [
            el('div', { class: 'home-header' }, [
                el('div', { class: 'home-brand' }, [
                    el('span', { class: 'brand-play' }),
                    el('span', { class: 'home-appname' }, 'IPTV Player')
                ]),
                el('div', { class: 'home-account' }, acc ? acc.name : '')
            ]),
            grid
        ]);
    }

    onShow() { focus.focusFirst(this.el); }
}
