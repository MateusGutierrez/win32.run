<script>
    // "My Music": an XP Explorer window listing my Spotify music (playlist, top tracks,
    // recently played) with a Windows Media Player style bar at the bottom.
    import Window from '../../../lib/components/xp/Window.svelte';
    import Menu from '../../../lib/components/xp/Menu.svelte';
    import RButton from '../../../lib/components/xp/RButton.svelte';
    import TaskPane from '../../../lib/components/xp/TaskPane.svelte';
    import { runningPrograms, queueProgram } from '../../../lib/store';
    import { fetch_profile, fetch_spotify, spotify_embed_url, format_ms, format_date, time_ago } from '../../../lib/interests';
    import { onMount } from 'svelte';

    export let id;
    export let window;
    export let self;
    export let parentNode;
    export let exec_path;

    let profile = null;
    let spotify = null;
    let loaded = false;
    let width = 800;

    // Navigation between views, with Back / Forward like Explorer
    let history = ['playlist'];
    let page_index = 0;
    $: view = history[page_index];

    let selected = null;      // index of the selected row
    let previewing = null;    // track loaded in the Spotify preview player
    let searching = false;
    let query = '';

    $: playlist = spotify?.playlist || null;
    $: embed_url = profile?.interests?.spotify?.embed || '';
    $: profile_url = profile?.interests?.spotify?.profile || '';

    $: views = {
        playlist: {
            label: playlist?.name || 'Portfolio Playlist',
            title: playlist?.name || 'Portfolio Playlist',
            description: playlist?.description || 'A playlist I put together for this portfolio, with some of my favorite tracks.',
            meta: playlist ? [playlist.owner, `${playlist.total} songs`].filter(Boolean).join(' • ') : '',
            image: playlist?.image || null,
            url: playlist?.url || embed_url || null,
            date_column: 'Date Added',
            rows: (playlist?.tracks || []).map(e => ({ track: e.track, date: format_date(e.added_at) }))
        },
        top: {
            label: 'Top Tracks This Month',
            title: 'Top Tracks This Month',
            description: 'The songs I played the most on Spotify over the last four weeks.',
            meta: spotify?.top_tracks?.length ? `${spotify.top_tracks.length} songs` : '',
            image: spotify?.top_tracks?.[0]?.image || null,
            url: profile_url || null,
            date_column: '',
            rows: (spotify?.top_tracks || []).map(track => ({ track, date: '' }))
        },
        recent: {
            label: 'Recently Played',
            title: 'Recently Played',
            description: 'The last songs I listened to on Spotify.',
            meta: spotify?.recent?.length ? `${spotify.recent.length} songs` : '',
            image: spotify?.recent?.[0]?.track?.image || null,
            url: profile_url || null,
            date_column: 'Played',
            rows: (spotify?.recent || []).map(e => ({ track: e.track, date: time_ago(e.played_at) }))
        }
    };

    $: current = views[view];
    $: rows = (current?.rows || []).filter(r => {
        if (!query.trim()) return true;
        const q = query.trim().toLowerCase();
        return [r.track.name, r.track.artists, r.track.album].some(v => (v || '').toLowerCase().includes(q));
    });

    $: narrow = width < 620;
    $: show_pane = width >= 600;

    // What the player bar shows: the preview, else the selection, else the first song of the list
    $: player_track = previewing || (selected != null ? rows[selected]?.track : null) || rows[0]?.track || null;

    async function load() {
        [profile, spotify] = await Promise.all([fetch_profile(), fetch_spotify()]);
        loaded = true;
    }

    onMount(load);

    export function destroy() {
        runningPrograms.update(programs => programs.filter(p => p != self));
        self.$destroy();
    }

    function go(next_view) {
        if (next_view === view) return;
        history = [...history.slice(0, page_index + 1), next_view];
        page_index = history.length - 1;
        selected = null;
    }

    function back() {
        page_index = Math.max(0, page_index - 1);
        selected = null;
    }

    function forward() {
        page_index = Math.min(history.length - 1, page_index + 1);
        selected = null;
    }

    function open_url(url) {
        if (url) globalThis.open(url, '_blank', 'noopener');
    }

    function play(track) {
        if (track?.id) previewing = track;
    }

    function play_pressed() {
        if (previewing) {
            previewing = null;
            return;
        }
        if (selected == null && rows.length) selected = 0;
        play(selected != null ? rows[selected]?.track : player_track);
    }

    function step(delta) {
        if (!rows.length) return;
        selected = selected == null ? 0 : (selected + delta + rows.length) % rows.length;
        if (previewing) play(rows[selected].track);
    }

    function open_program(path) {
        queueProgram.set({ path });
    }

    $: menu = [
        {
            name: 'File',
            items: [
                [
                    { name: 'Play', action: play_pressed, disabled: !rows.length },
                    { name: 'Open in Spotify', action: () => open_url(player_track?.url || current?.url), disabled: !(player_track?.url || current?.url) }
                ],
                [{ name: 'Close', action: destroy }]
            ]
        },
        {
            name: 'Edit',
            items: [[{ name: 'Copy', disabled: true }, { name: 'Select All', disabled: true }]]
        },
        {
            name: 'View',
            items: [
                [
                    { name: views.playlist.label, action: () => go('playlist') },
                    { name: 'Top Tracks This Month', action: () => go('top') },
                    { name: 'Recently Played', action: () => go('recent') }
                ],
                [{ name: 'Refresh', action: load }]
            ]
        },
        {
            name: 'Tools',
            items: [[{ name: 'Folder Options...', disabled: true }]]
        },
        {
            name: 'Help',
            items: [[{ name: 'About My Music', disabled: true }]]
        }
    ];

    $: sections = [
        {
            title: 'Music Tasks',
            items: [
                { name: previewing ? 'Stop playing' : 'Play selection', icon: 'Play.png', action: play_pressed, disabled: !rows.length },
                { name: 'Open in Spotify', icon: 'InternetShortcut.png', action: () => open_url(current?.url), disabled: !current?.url },
                ...(profile_url ? [{ name: 'View my Spotify profile', icon: 'UserAccounts.png', action: () => open_url(profile_url) }] : [])
            ]
        },
        {
            title: 'Library',
            items: [
                { name: views.playlist.label, icon: 'WMPPlaylist.png', action: () => go('playlist') },
                { name: 'Top Tracks This Month', icon: 'WMPAutoPlaylist.png', action: () => go('top') },
                { name: 'Recently Played', icon: 'WMPLibrary.png', action: () => go('recent') }
            ]
        },
        {
            title: 'Other Places',
            items: [
                { name: 'My Games', icon: 'Steam.svg', action: () => open_program('./programs/my_games.svelte') },
                { name: 'My Resume', icon: 'Briefcase.png', action: () => open_program('./programs/portfolio.svelte') }
            ]
        },
        {
            title: 'Details',
            details: playlist
                ? {
                    image: playlist.image,
                    title: playlist.name,
                    lines: [`Playlist, ${playlist.total} songs`, ...(playlist.owner ? [`By ${playlist.owner}`] : [])]
                }
                : spotify?.top_tracks?.[0]
                    ? {
                        image: spotify.top_tracks[0].image,
                        title: spotify.top_tracks[0].name,
                        lines: [spotify.top_tracks[0].artists, 'My most played song this month']
                    }
                    : { title: 'My Music', lines: [spotify ? 'Music from my Spotify account.' : 'Spotify is not connected.'] }
        }
    ];

    let ws_size = {
        width: document.querySelector('#work-space')?.offsetWidth || 900,
        height: document.querySelector('#work-space')?.offsetHeight || 600
    };

    export let options = {
        title: 'My Spotify',
        min_width: 360,
        min_height: 380,
        width: Math.min(ws_size.width - 20, 800),
        height: Math.min(ws_size.height - 20, 580),
        icon: '/images/xp/icons/Spotify.svg',
        id: id,
        exec_path
    };
</script>

<Window options={options} bind:this={window} on_click_close={destroy}>
    <div slot="content" class="explorer absolute inset-0.5 flex flex-col bg-xp-yellow overflow-hidden" bind:clientWidth={width}>

        <!-- Menu bar -->
        <div class="shrink-0 w-full border-b border-[#d6d2c2] flex flex-row items-center justify-between">
            <Menu menu={menu}></Menu>
            <div class="w-[40px] h-full bg-white flex items-center justify-center">
                <div class="w-[20px] h-[20px] bg-[url(/images/ms.png)] bg-contain bg-center bg-no-repeat"></div>
            </div>
        </div>

        <!-- Toolbar -->
        <div class="shrink-0 flex flex-row items-center border-b border-[#d6d2c2]">
            <RButton icon="/images/xp/icons/Back.png" title={narrow ? '' : 'Back'} on_click={back} expandable={true} disabled={page_index == 0}></RButton>
            <RButton icon="/images/xp/icons/Forward.png" on_click={forward} expandable={true} disabled={page_index == history.length - 1}></RButton>
            <RButton icon="/images/xp/icons/Up.png" disabled={true}></RButton>
            <div class="w-[1px] self-stretch py-1"><div class="w-full h-full border-l border-[#d6d2c2]"></div></div>
            <RButton icon="/images/xp/icons/Search.png" title={narrow ? '' : 'Search'} on_click={() => { searching = !searching; if (!searching) query = ''; }}></RButton>
            {#if searching}
                <input class="search-box" placeholder="Search songs, artists..." bind:value={query} on:input={() => selected = null}>
            {/if}
        </div>

        <!-- Address bar -->
        <div class="shrink-0 flex flex-row items-center gap-[4px] border-b border-[#d6d2c2] px-[4px] py-[2px]">
            <span class="text-[#7f7f7f] px-[4px]">Address</span>
            <!-- Address combo box: also the way to switch views when the task pane is hidden -->
            <div class="address grow">
                <img src="/images/xp/icons/Spotify.svg" alt="" class="w-[16px] h-[16px] shrink-0">
                <select value={view} on:change={(e) => go(e.target.value)} aria-label="Address">
                    <option value="playlist">My Spotify\{views.playlist.label}</option>
                    <option value="top">My Spotify\Top Tracks This Month</option>
                    <option value="recent">My Spotify\Recently Played</option>
                </select>
                <span class="combo-arrow" aria-hidden="true">
                    <svg viewBox="0 0 8 5" width="8" height="5"><path d="M0 0h8L4 5z" fill="#4d6185"/></svg>
                </span>
            </div>
            <div class="flex items-center gap-[3px] pr-[4px]">
                <img src="/images/xp/icons/Go.png" alt="" class="w-[20px] h-[20px]">
                <span>Go</span>
            </div>
        </div>

        <!-- Body -->
        <div class="grow min-h-0 flex flex-row">
            {#if show_pane}
                <TaskPane sections={sections} width={200} />
            {/if}

            <div class="content grow min-w-0 overflow-y-auto overflow-x-hidden">
                {#if !loaded}
                    <div class="p-6">Loading...</div>
                {:else}
                    <!-- Header -->
                    <div class="hero">
                        <div class="hero-cover shrink-0">
                            {#if current.image}
                                <img src={current.image} alt="" class="w-full h-full object-cover">
                            {:else}
                                <img src="/images/xp/icons/Spotify.svg" alt="" class="w-[56px] h-[56px]">
                            {/if}
                        </div>
                        <div class="min-w-0 flex flex-col gap-[4px]">
                            <span class="hero-kind">{view === 'playlist' ? 'Playlist' : 'Spotify'}</span>
                            <h1 class="hero-title">{current.title}</h1>
                            <p>{current.description}</p>
                            {#if current.meta}<span class="text-[#555]">{current.meta}</span>{/if}
                            {#if current.url}
                                <div class="mt-[4px]">
                                    <button class="xp-button" on:click={() => open_url(current.url)}>
                                        <svg viewBox="0 0 24 24" width="13" height="13"><circle cx="12" cy="12" r="12" fill="#1db954"/><path d="M6 9.2c4-1.2 8.6-.8 12 1.2M6.8 12.4c3.3-.9 7-.5 9.8 1.1M7.6 15.4c2.6-.6 5.3-.3 7.5.9" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>
                                        <span>Listen on Spotify</span>
                                    </button>
                                </div>
                            {/if}
                        </div>
                    </div>

                    <!-- List (Details view) -->
                    {#if rows.length}
                        <div class="list {narrow ? 'narrow' : ''}" role="grid">
                            <div class="list-header" role="row">
                                <span>#</span>
                                <span>Title</span>
                                {#if !narrow}<span>Album</span>{/if}
                                {#if !narrow && current.date_column}<span>{current.date_column}</span>{:else if !narrow}<span></span>{/if}
                                <span>Duration</span>
                                <span></span>
                            </div>
                            {#each rows as row, i}
                                <div class="list-row {selected === i ? 'selected' : ''} {previewing && previewing.id === row.track.id ? 'playing' : ''}"
                                    role="row" on:click={() => selected = i} on:dblclick={() => { selected = i; play(row.track); }}>
                                    <span class="text-center">{i + 1}</span>
                                    <span class="flex items-center gap-[8px] min-w-0">
                                        {#if row.track.image}
                                            <img src={row.track.image} alt="" class="cover" loading="lazy">
                                        {/if}
                                        <span class="flex flex-col min-w-0">
                                            <span class="track-name truncate">{row.track.name}</span>
                                            <span class="track-artist truncate">{row.track.artists}</span>
                                        </span>
                                    </span>
                                    {#if !narrow}<span class="truncate">{row.track.album || ''}</span>{/if}
                                    {#if !narrow}<span class="truncate">{row.date}</span>{/if}
                                    <span>{format_ms(row.track.duration_ms)}</span>
                                    <span class="flex justify-center">
                                        {#if row.track.url}
                                            <button class="icon-button" title="Open in Spotify" on:click|stopPropagation={() => open_url(row.track.url)}>
                                                <svg viewBox="0 0 24 24" width="13" height="13"><circle cx="12" cy="12" r="12" fill="#222"/><path d="M6 9.2c4-1.2 8.6-.8 12 1.2M6.8 12.4c3.3-.9 7-.5 9.8 1.1M7.6 15.4c2.6-.6 5.3-.3 7.5.9" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>
                                            </button>
                                        {/if}
                                    </span>
                                </div>
                            {/each}
                        </div>
                    {:else if query}
                        <p class="empty">No songs match "{query}".</p>
                    {:else if view === 'playlist' && spotify_embed_url(embed_url)}
                        <!-- No API data: fall back to the official Spotify player -->
                        <div class="px-[16px] pb-[16px]">
                            <iframe title="Spotify playlist" src={spotify_embed_url(embed_url)} class="w-full h-[352px] border-0" loading="lazy"
                                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>
                        </div>
                    {:else}
                        <p class="empty">
                            {spotify ? 'There are no songs to show here yet.' : 'Spotify is not connected yet, so there are no songs to show.'}
                        </p>
                    {/if}
                {/if}
            </div>
        </div>

        <!-- Spotify preview (the official player, so it can actually play) -->
        {#if previewing}
            <div class="preview shrink-0">
                <iframe title="Spotify player" src="https://open.spotify.com/embed/track/{previewing.id}?theme=0"
                    class="grow h-[80px] border-0 rounded-[12px]"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>
                <button class="xp-button" on:click={() => previewing = null}>Close</button>
            </div>
        {/if}

        <!-- Windows Media Player style bar -->
        <div class="player shrink-0">
            <div class="flex items-center gap-[8px] min-w-0 flex-1">
                {#if player_track?.image}
                    <img src={player_track.image} alt="" class="w-[40px] h-[40px] object-cover border border-[#7f9db9] shrink-0">
                {:else}
                    <img src="/images/xp/icons/WindowsMediaPlayer10.png" alt="" class="w-[32px] h-[32px] shrink-0">
                {/if}
                <div class="flex flex-col min-w-0">
                    <span class="truncate player-title">{player_track?.name || 'Windows Media Player'}</span>
                    <span class="truncate">{player_track?.artists || 'Select a song and press Play'}</span>
                    {#if previewing}
                        <span class="truncate player-live">Playing on Spotify</span>
                    {/if}
                </div>
            </div>

            <div class="flex items-center gap-[6px] shrink-0">
                <button class="round small" title="Previous" on:click={() => step(-1)} disabled={!rows.length}>
                    <svg viewBox="0 0 16 16" width="10" height="10"><path d="M3 3h2v10H3zM14 3v10L6 8z" fill="currentColor"/></svg>
                </button>
                <button class="round big" title={previewing ? 'Stop' : 'Play'} on:click={play_pressed} disabled={!rows.length && !player_track}>
                    {#if previewing}
                        <svg viewBox="0 0 16 16" width="13" height="13"><rect x="3" y="3" width="10" height="10" fill="currentColor"/></svg>
                    {:else}
                        <svg viewBox="0 0 16 16" width="15" height="15"><path d="M4 2v12l10-6z" fill="currentColor"/></svg>
                    {/if}
                </button>
                <button class="round small" title="Next" on:click={() => step(1)} disabled={!rows.length}>
                    <svg viewBox="0 0 16 16" width="10" height="10"><path d="M11 3h2v10h-2zM2 3v10l8-5z" fill="currentColor"/></svg>
                </button>
            </div>

            <div class="flex flex-col items-end gap-[3px] flex-1 min-w-0">
                <span>0:00 / {format_ms(player_track?.duration_ms)}</span>
                <div class="seek w-full max-w-[160px]"></div>
            </div>
        </div>
    </div>
</Window>

<style>
    .explorer {
        font-family: 'MSSS', Tahoma, Arial, sans-serif;
        font-size: 11px;
        color: #000;
    }

    .search-box {
        width: 180px;
        height: 21px;
        margin-left: 4px;
        padding: 0 4px;
        border: 1px solid #7f9db9;
        outline: none;
        font-size: 11px;
    }

    .address {
        display: flex;
        align-items: center;
        gap: 4px;
        height: 22px;
        padding: 0 4px;
        background: #fff;
        border: 1px solid #7f9db9;
        min-width: 0;
    }

    .address {
        position: relative;
        padding-right: 0;
    }

    .address select {
        flex: 1;
        min-width: 0;
        height: 100%;
        border: 0;
        outline: none;
        background: transparent;
        font-family: inherit;
        font-size: 11px;
        appearance: none;
        -webkit-appearance: none;
        padding-right: 22px;
        cursor: default;
    }

    .combo-arrow {
        position: absolute;
        right: 1px;
        top: 1px;
        bottom: 1px;
        width: 17px;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        border-radius: 2px;
        border: 1px solid #b9cdf7;
        background: linear-gradient(180deg, #e4ecfd 0%, #c6d6fb 50%, #b2c6f7 100%);
    }

    .content {
        background: #fff;
    }

    /* Header */
    .hero {
        display: flex;
        gap: 16px;
        padding: 16px;
        align-items: flex-start;
    }

    .hero-cover {
        width: 112px;
        height: 112px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #e3ecfb, #b9cdf1);
        border: 1px solid #7f9db9;
        overflow: hidden;
    }

    .hero-kind {
        color: #555;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .hero-title {
        font-family: 'Trebuchet', 'Trebuchet MS', Arial, sans-serif;
        font-size: 22px;
        font-weight: bold;
        line-height: 1.1;
        color: #0b2a6b;
    }

    p {
        line-height: 1.35;
    }

    .empty {
        padding: 8px 16px 16px;
        color: #555;
    }

    /* XP buttons (XP.css) */
    .xp-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-family: 'MSSS', Tahoma, Arial, sans-serif;
        font-size: 11px;
        color: #222;
        min-width: 75px;
        min-height: 23px;
        padding: 0 12px;
        border: 1px solid #003c74;
        border-radius: 3px;
        background: linear-gradient(180deg, #fff 0%, #ecebe5 86%, #d8d0c4 100%);
    }

    .xp-button:hover {
        box-shadow: inset -1px 1px #fff0cf, inset 1px 2px #fdd889, inset -2px 2px #fbc761, inset 2px -2px #e5a01a;
    }

    .xp-button:active {
        background: linear-gradient(180deg, #cdcac3 0%, #e3e3db 8%, #e5e5de 94%, #f2f2f1 100%);
    }

    .icon-button {
        width: 22px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #003c74;
        border-radius: 3px;
        background: linear-gradient(180deg, #fff 0%, #ecebe5 86%, #d8d0c4 100%);
    }

    .icon-button:hover {
        box-shadow: inset -1px 1px #fff0cf, inset 1px 2px #fdd889, inset -2px 2px #fbc761, inset 2px -2px #e5a01a;
    }

    /* Details list view */
    .list {
        --cols: 32px minmax(0, 2.4fr) minmax(0, 1.5fr) 96px 64px 40px;
        margin: 0 0 8px;
    }

    .list.narrow {
        --cols: 28px minmax(0, 1fr) 56px 36px;
    }

    .list-header,
    .list-row {
        display: grid;
        grid-template-columns: var(--cols);
        align-items: center;
    }

    .list-header {
        position: sticky;
        top: 0;
        z-index: 1;
        height: 20px;
        background: linear-gradient(180deg, #fff 0%, #f6f5ee 60%, #ebeadb 100%);
        border-bottom: 1px solid #d6d2c2;
        box-shadow: 0 1px 0 #e2decd;
    }

    .list-header span {
        height: 100%;
        display: flex;
        align-items: center;
        padding: 0 6px;
        border-right: 1px solid #e2decd;
        white-space: nowrap;
        overflow: hidden;
    }

    .list-header span:hover {
        box-shadow: inset 0 -3px #f9b119;
    }

    .list-row {
        min-height: 46px;
        border-bottom: 1px solid #f0f0f0;
        cursor: default;
    }

    .list-row > span {
        padding: 0 6px;
    }

    .list-row .cover {
        width: 36px;
        height: 36px;
        object-fit: cover;
        flex-shrink: 0;
    }

    .track-name {
        font-size: 12px;
    }

    .track-artist {
        color: #555;
    }

    .list-row.selected {
        background: #316ac5;
        color: #fff;
    }

    .list-row.selected .track-artist {
        color: #dfe8f7;
    }

    .list-row.playing .track-name {
        font-weight: bold;
    }

    /* Spotify preview strip */
    .preview {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        background: #f3f6fc;
        border-top: 1px solid #b3c4ee;
    }

    /* Windows Media Player 10 style bar */
    .player {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 6px 12px;
        min-height: 58px;
        background: linear-gradient(180deg, #f6f9fe 0%, #e2eaf8 45%, #cbd8f0 100%);
        border-top: 1px solid #9fb4dc;
    }

    .player-title {
        font-size: 12px;
    }

    .player-live {
        color: #2c5bb8;
    }

    .round {
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        border: 1px solid #6f8fc8;
        color: #1d3f7c;
        background: radial-gradient(circle at 50% 30%, #fff 0%, #e6eefb 45%, #a9c1ea 100%);
        box-shadow: inset 0 1px 0 #fff, 0 1px 2px rgba(20, 50, 120, 0.3);
    }

    .round:hover:not(:disabled) {
        background: radial-gradient(circle at 50% 30%, #fff 0%, #fff6dc 45%, #f5c96b 100%);
        border-color: #d39b2c;
    }

    .round:active:not(:disabled) {
        background: radial-gradient(circle at 50% 70%, #fff 0%, #d9e4f7 50%, #9db6e3 100%);
    }

    .round:disabled {
        color: #9aaed3;
    }

    .round.small {
        width: 26px;
        height: 26px;
    }

    .round.big {
        width: 38px;
        height: 38px;
    }

    .seek {
        height: 5px;
        border-radius: 3px;
        background: #b8c9e8;
        border: 1px solid #8da6d4;
        overflow: hidden;
    }

</style>

<svelte:options accessors={true}></svelte:options>
