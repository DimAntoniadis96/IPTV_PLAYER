/* =====================================================================
 * DetailScreen.js — Movie / Series detail (poster + description + fav)
 * ---------------------------------------------------------------------
 * Movies: poster, metadata, description, [Play] and [♥ Favorite].
 * Series: poster, description, [♥ Favorite], plus a SEASON selector and
 *         the episodes of the selected season — so a 30-season show isn't
 *         one endless scroll.
 * If no description is available, the plot area is simply left empty.
 *
 * All elements are real focusable DOM nodes, so the shared spatial
 * FocusManager drives navigation (arrows + OK). Back pops the screen.
 * ===================================================================== */

import { View } from '../View.js';
import { el, clear, lazyImage } from '../../utils/dom.js';
import { playlist } from '../../data/PlaylistService.js';
import { favorites } from '../../data/Favorites.js';
import { history } from '../../data/History.js';
import { focus } from '../../input/FocusManager.js';
import { SECTION, VIEW } from '../../core/constants.js';
import { toast } from '../components/Toast.js';

export class DetailScreen extends View {
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
        this.metaEl = el('div', { class: 'detail-meta' }, '');
        this.plotEl = el('p', { class: 'detail-plot' }, '');

        const actions = [];
        if (this.section === SECTION.MOVIE) actions.push(this._playButton());
        actions.push(this._buildFavButton());
        this.actionsEl = el('div', { class: 'detail-actions' }, actions);

        const hero = el('div', { class: 'detail-hero' }, [
            el('div', { class: 'detail-poster' }, [this.posterImg]),
            el('div', { class: 'detail-info' }, [
                el('h1', { class: 'detail-title' }, this.item.name || ''),
                this.metaEl,
                this.actionsEl,
                this.plotEl
            ])
        ]);

        const children = [hero];
        if (this.section === SECTION.SERIES) {
            this.seasonsEl = el('div', { class: 'detail-seasons' });
            this.episodesEl = el('div', { class: 'detail-episodes' });
            children.push(
                el('div', { class: 'detail-section-title' }, 'Seasons'),
                this.seasonsEl,
                el('div', { class: 'detail-section-title' }, 'Episodes'),
                this.episodesEl
            );
        }

        this.scroll = el('div', { class: 'detail-scroll' }, children);
        return el('div', { class: 'detail-screen' }, [
            this.scroll,
            el('div', { class: 'hintbar' }, [
                this._hint('OK', this.section === SECTION.SERIES ? 'Play episode' : 'Play'),
                this._hint('BACK', 'Back')
            ])
        ]);
    }

    _hint(key, text) {
        return el('span', { class: 'hint' }, [
            el('span', { class: 'hint-key' }, key), el('span', { class: 'hint-text' }, text)
        ]);
    }

    _playButton() {
        const b = el('button', { class: 'btn btn--primary detail-btn focusable', tabindex: '-1' }, [
            el('span', { class: 'btn-icon' }, '►'), el('span', {}, 'Play')
        ]);
        b.onSelect = () => this._playMovie();
        b.addEventListener('click', () => this._playMovie());
        return b;
    }

    _buildFavButton() {
        this.favBtn = el('button', { class: 'btn detail-btn focusable', tabindex: '-1' });
        this.favBtn.onSelect = () => this._toggleFav();
        this.favBtn.addEventListener('click', () => this._toggleFav());
        this._renderFav();
        return this.favBtn;
    }

    _renderFav() {
        const on = favorites.has(this.item.id);
        clear(this.favBtn);
        this.favBtn.appendChild(el('span', { class: 'btn-icon heart' }, on ? '♥' : '♡'));
        this.favBtn.appendChild(el('span', {}, on ? 'Favorited' : 'Add to favorites'));
        this.favBtn.classList.toggle('is-fav', on);
    }

    _toggleFav() {
        const added = favorites.toggle(this.item);
        this._renderFav();
        toast(added ? 'Added to favorites' : 'Removed from favorites', 'success', 1500);
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
                this.plotEl.textContent = info.plot || '';
                this.metaEl.textContent = [
                    info.releaseDate, info.genre, info.rating ? `★ ${info.rating}` : '', info.duration
                ].filter(Boolean).join('   ·   ');
                if ((!this.item.logo || !this.posterImg._pendingSrc) && info.cover) {
                    this.posterImg._pendingSrc = info.cover; this.posterImg.load();
                }
            }
        } catch { /* no info -> leave plot empty */ }
    }

    _playMovie() {
        const url = (this.movieInfo && this.movieInfo.url) || this.item.url;
        if (!url) { toast('Stream not available.', 'error'); return; }
        const it = { ...this.item, url };
        history.add(it);
        this.router.navigate(VIEW.PLAYER, {
            item: it, context: { items: [it], index: 0, section: SECTION.MOVIE }
        });
    }

    // ---------------- Series ----------------

    async _loadSeries() {
        try {
            const data = await playlist.getSeriesEpisodes(this.item.seriesId || this.item.id);
            this.seasons = data.seasons || [];
            this.plotEl.textContent = (data.info && data.info.plot) || this.item.plot || '';
            if (data.info) {
                this.metaEl.textContent = [
                    data.info.genre, data.info.rating ? `★ ${data.info.rating}` : ''
                ].filter(Boolean).join('   ·   ');
            }
        } catch { this.seasons = []; }
        this._renderSeasons();
        this._selectSeason(0);
        // Content arrived after onShow; make sure focus lands on something real.
        if (!focus.current || !this.el.contains(focus.current)) focus.focusFirst(this.el);
    }

    _renderSeasons() {
        clear(this.seasonsEl);
        if (!this.seasons.length) {
            this.seasonsEl.appendChild(el('div', { class: 'detail-empty' }, 'No seasons found'));
            return;
        }
        this.seasons.forEach((s, i) => {
            const chip = el('div', { class: 'season-chip focusable', tabindex: '-1', dataset: { i } },
                `Season ${s.season}`);
            if (i === this.seasonIndex) chip.classList.add('is-active');
            chip.onSelect = () => this._selectSeason(i);
            this.seasonsEl.appendChild(chip);
        });
    }

    _selectSeason(i) {
        this.seasonIndex = Math.max(0, Math.min(i, this.seasons.length - 1));
        this.seasonsEl.querySelectorAll('.season-chip').forEach((c) =>
            c.classList.toggle('is-active', Number(c.dataset.i) === this.seasonIndex));
        this._renderEpisodes();
    }

    _renderEpisodes() {
        clear(this.episodesEl);
        const season = this.seasons[this.seasonIndex];
        const eps = season ? season.episodes : [];
        if (!eps.length) {
            this.episodesEl.appendChild(el('div', { class: 'detail-empty' }, 'No episodes'));
            return;
        }
        eps.forEach((ep, idx) => {
            const row = el('div', { class: 'episode-row focusable', tabindex: '-1' }, [
                el('span', { class: 'episode-num' }, `E${ep.episodeNum || idx + 1}`),
                el('span', { class: 'episode-name' }, ep.name || `Episode ${idx + 1}`)
            ]);
            row.onSelect = () => this._playEpisode(ep, idx, eps);
            this.episodesEl.appendChild(row);
        });
    }

    _playEpisode(ep, idx, eps) {
        if (!ep || !ep.url) { toast('Episode not available.', 'error'); return; }
        history.add(ep);
        this.router.navigate(VIEW.PLAYER, {
            item: ep, context: { items: eps, index: idx, section: SECTION.SERIES }
        });
    }
}
