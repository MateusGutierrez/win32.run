<script>
    // "My Games": an XP Explorer window with my Steam (live) and PlayStation (manual) games,
    // in Tiles view grouped by section, or Details view.
    import Window from '../../../lib/components/xp/Window.svelte';
    import Menu from '../../../lib/components/xp/Menu.svelte';
    import RButton from '../../../lib/components/xp/RButton.svelte';
    import TaskPane from '../../../lib/components/xp/TaskPane.svelte';
    import { runningPrograms, queueProgram } from '../../../lib/store';
    import { fetch_profile, fetch_steam, steam_cover, format_hours } from '../../../lib/interests';
    import { onMount } from 'svelte';

    export let id;
    export let window;
    export let self;
    export let parentNode;
    export let exec_path;

    let profile = null;
    let steam = null;
    let loaded = false;
    let width = 760;
    let mode = 'tiles'; // tiles | details
    let selected = null; // key of the selected game

    const STATUS = {
        'in-game': 'In-game',
        online: 'Online',
        away: 'Away',
        snooze: 'Snooze',
        busy: 'Busy',
        offline: 'Offline'
    };

    $: interests = profile?.interests || {};
    $: steam_profile_url = steam?.profile?.url || interests.steam?.profile || '';
    $: psn_profile_url = interests.psn?.profile || '';

    const store_url = appid => appid ? `https://store.steampowered.com/app/${appid}` : null;

    // Every game becomes { key, name, cover, platform, lines[], hours_2weeks, hours_total, url }
    $: groups = [
        ...(steam?.profile?.playing ? [{
            title: 'Playing Now',
            games: [{
                key: 'now-' + steam.profile.playing.appid,
                name: steam.profile.playing.name,
                cover: steam_cover({ appid: steam.profile.playing.appid }),
                platform: 'Steam',
                lines: ['In-game right now'],
                url: store_url(steam.profile.playing.appid)
            }]
        }] : []),
        ...(steam?.recent?.length ? [{
            title: 'Recently Played on Steam',
            games: steam.recent.map(g => ({
                key: 'recent-' + g.appid,
                name: g.name,
                cover: steam_cover(g),
                platform: 'Steam',
                hours_2weeks: g.hours_2weeks,
                hours_total: g.hours_total,
                lines: [`${format_hours(g.hours_2weeks)} hrs last two weeks`, `${format_hours(g.hours_total)} hrs on record`],
                url: store_url(g.appid)
            }))
        }] : []),
        ...(steam?.top?.length ? [{
            title: 'Most Played on Steam',
            games: steam.top.map(g => ({
                key: 'top-' + g.appid,
                name: g.name,
                cover: steam_cover(g),
                platform: 'Steam',
                hours_total: g.hours_total,
                lines: [`${format_hours(g.hours_total)} hrs on record`],
                url: store_url(g.appid)
            }))
        }] : []),
        // Manual Steam list only when there is no live data
        ...(!steam && interests.steam?.games?.length ? [{
            title: 'Steam',
            games: interests.steam.games.map((g, i) => manual_game(g, i, 'Steam'))
        }] : []),
        ...(interests.psn?.games?.length ? [{
            title: 'PlayStation',
            games: interests.psn.games.map((g, i) => manual_game(g, i, 'PlayStation'))
        }] : [])
    ];

    function manual_game(g, i, platform) {
        return {
            key: `${platform}-${i}`,
            name: g.name,
            cover: steam_cover(g),
            platform,
            hours_total: g.hours,
            lines: [
                g.status,
                g.hours ? `${format_hours(g.hours)} hrs on record` : null,
                g.trophy ? `Trophy: ${g.trophy}` : null,
                g.note
            ].filter(Boolean),
            url: g.link || (g.appid ? store_url(g.appid) : null)
        };
    }

    $: all_games = groups.flatMap(g => g.games);

    // Details view lists each game once, merging what the different groups know about it
    $: detail_games = Object.values(all_games.reduce((acc, g) => {
        const k = `${g.platform}|${g.name}`;
        const prev = acc[k];
        acc[k] = prev
            ? {
                ...prev,
                cover: prev.cover || g.cover,
                url: prev.url || g.url,
                hours_2weeks: prev.hours_2weeks ?? g.hours_2weeks,
                hours_total: prev.hours_total ?? g.hours_total
            }
            : g;
        return acc;
    }, {}));
    $: selected_game = all_games.find(g => g.key === selected) || null;
    $: show_pane = width >= 600;

    onMount(async () => {
        [profile, steam] = await Promise.all([fetch_profile(), fetch_steam()]);
        loaded = true;
    });

    export function destroy() {
        runningPrograms.update(programs => programs.filter(p => p != self));
        self.$destroy();
    }

    function open_url(url) {
        if (url) globalThis.open(url, '_blank', 'noopener');
    }

    function open_program(path) {
        queueProgram.set({ path });
    }

    async function refresh() {
        loaded = false;
        [profile, steam] = await Promise.all([fetch_profile(), fetch_steam()]);
        loaded = true;
    }

    $: menu = [
        {
            name: 'File',
            items: [
                [{ name: 'Open', action: () => open_url(selected_game?.url), disabled: !selected_game?.url }],
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
                    { name: 'Tiles', action: () => mode = 'tiles' },
                    { name: 'Details', action: () => mode = 'details' }
                ],
                [{ name: 'Refresh', action: refresh }]
            ]
        },
        {
            name: 'Tools',
            items: [[{ name: 'Folder Options...', disabled: true }]]
        },
        {
            name: 'Help',
            items: [[{ name: 'About My Games', disabled: true }]]
        }
    ];

    $: sections = [
        {
            title: 'Game Tasks',
            items: [
                { name: 'Open store page', icon: 'InternetShortcut.png', action: () => open_url(selected_game?.url), disabled: !selected_game?.url },
                ...(steam_profile_url ? [{ name: 'View my Steam profile', icon: 'UserAccounts.png', action: () => open_url(steam_profile_url) }] : []),
                ...(psn_profile_url ? [{ name: 'View my PSN profile', icon: 'UserAccounts.png', action: () => open_url(psn_profile_url) }] : [])
            ]
        },
        {
            title: 'Other Places',
            items: [
                { name: 'My Music', icon: 'MyMusic.png', action: () => open_program('./programs/my_music.svelte') },
                { name: 'My Portfolio', icon: 'Briefcase.png', action: () => open_program('./programs/portfolio.svelte') }
            ]
        },
        {
            title: 'Details',
            details: selected_game
                ? { image: selected_game.cover, title: selected_game.name, lines: [selected_game.platform, ...selected_game.lines] }
                : steam
                    ? {
                        image: steam.profile.avatar,
                        image_class: 'avatar',
                        title: steam.profile.name,
                        lines: [
                            `Steam: ${STATUS[steam.profile.state] || 'Offline'}`,
                            ...(steam.profile.playing ? [`Playing ${steam.profile.playing.name}`] : []),
                            ...(steam.game_count ? [`${steam.game_count} games in library`] : [])
                        ]
                    }
                    : { title: 'My Games', lines: [`${all_games.length} games`] }
        }
    ];

    let ws_size = {
        width: document.querySelector('#work-space')?.offsetWidth || 900,
        height: document.querySelector('#work-space')?.offsetHeight || 600
    };

    export let options = {
        title: 'My Games',
        min_width: 360,
        min_height: 360,
        width: Math.min(ws_size.width - 20, 780),
        height: Math.min(ws_size.height - 20, 560),
        icon: '/images/xp/icons/GameController.png',
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
            <RButton icon="/images/xp/icons/Back.png" title={width < 520 ? '' : 'Back'} expandable={true} disabled={true}></RButton>
            <RButton icon="/images/xp/icons/Forward.png" expandable={true} disabled={true}></RButton>
            <RButton icon="/images/xp/icons/Up.png" disabled={true}></RButton>
            <div class="w-[1px] self-stretch py-1"><div class="w-full h-full border-l border-[#d6d2c2]"></div></div>
            <RButton icon="/images/xp/icons/FolderView-Classic.png" title={mode === 'tiles' ? 'Details' : 'Tiles'}
                tooltip_message="Change the view" on_click={() => mode = mode === 'tiles' ? 'details' : 'tiles'}></RButton>
        </div>

        <!-- Address bar -->
        <div class="shrink-0 flex flex-row items-center gap-[4px] border-b border-[#d6d2c2] px-[4px] py-[2px]">
            <span class="text-[#7f7f7f] px-[4px]">Address</span>
            <div class="address grow">
                <img src="/images/xp/icons/GameController.png" alt="" class="w-[16px] h-[16px]">
                <span class="truncate">My Games</span>
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

            <div class="content grow min-w-0 overflow-y-auto overflow-x-hidden" on:click|self={() => selected = null}>
                {#if !loaded}
                    <div class="p-6">Loading...</div>
                {:else if !groups.length}
                    <p class="p-[16px] text-[#555]">There are no games to show yet.</p>
                {:else if mode === 'tiles'}
                    {#each groups as group}
                        <div class="group">
                            <div class="group-title">{group.title}</div>
                            <div class="tiles">
                                {#each group.games as game}
                                    <button class="tile {selected === game.key ? 'selected' : ''}"
                                        on:click={() => selected = game.key} on:dblclick={() => open_url(game.url)}>
                                        <span class="tile-cover">
                                            {#if game.cover}
                                                <img src={game.cover} alt="" loading="lazy">
                                            {:else}
                                                <img src="/images/xp/icons/GameController.png" alt="" class="icon-fallback">
                                            {/if}
                                        </span>
                                        <span class="tile-text">
                                            <span class="tile-name">{game.name}</span>
                                            {#each game.lines.slice(0, 2) as line}
                                                <span class="tile-line">{line}</span>
                                            {/each}
                                        </span>
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/each}
                {:else}
                    <div class="list {width < 520 ? 'narrow' : ''}" role="grid">
                        <div class="list-header" role="row">
                            <span>Name</span>
                            <span>Platform</span>
                            {#if width >= 520}<span>Last 2 Weeks</span>{/if}
                            <span>Total</span>
                        </div>
                        {#each detail_games as game}
                            <div class="list-row {selected === game.key ? 'selected' : ''}" role="row"
                                on:click={() => selected = game.key} on:dblclick={() => open_url(game.url)}>
                                <span class="flex items-center gap-[6px] min-w-0">
                                    {#if game.cover}
                                        <img src={game.cover} alt="" class="w-[37px] h-[17px] object-cover shrink-0">
                                    {:else}
                                        <img src="/images/xp/icons/GameController.png" alt="" class="w-[16px] h-[16px] shrink-0">
                                    {/if}
                                    <span class="truncate">{game.name}</span>
                                </span>
                                <span>{game.platform}</span>
                                {#if width >= 520}<span>{game.hours_2weeks != null ? `${format_hours(game.hours_2weeks)} hrs` : ''}</span>{/if}
                                <span>{game.hours_total != null ? `${format_hours(game.hours_total)} hrs` : ''}</span>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>

        <!-- Status bar (XP.css status-bar) -->
        <div class="status-bar shrink-0">
            <span class="status-bar-field">{selected_game ? `${selected_game.name}` : `${all_games.length} object${all_games.length === 1 ? '' : 's'}`}</span>
            <span class="status-bar-field">{steam ? `Steam: ${STATUS[steam.profile.state] || 'Offline'}` : 'Steam: not connected'}</span>
        </div>
    </div>
</Window>

<style>
    .explorer {
        font-family: 'MSSS', Tahoma, Arial, sans-serif;
        font-size: 11px;
        color: #000;
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

    .content {
        background: #fff;
        padding-bottom: 12px;
    }

    /* "Show in Groups" header */
    .group {
        padding: 12px 16px 0;
    }

    .group-title {
        font-weight: bold;
        color: #0e3e9c;
        padding-bottom: 3px;
        margin-bottom: 8px;
        background: linear-gradient(90deg, #7ba2e7, rgba(123, 162, 231, 0)) no-repeat left bottom / 100% 1px;
    }

    /* Tiles view */
    .tiles {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        gap: 6px 12px;
    }

    .tile {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 3px;
        border: 0;
        background: transparent;
        text-align: left;
        cursor: default;
        min-width: 0;
    }

    .tile-cover {
        position: relative;
        width: 120px;
        height: 56px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f1f4fb;
        border: 1px solid #d6dff7;
    }

    .tile-cover img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .tile-cover .icon-fallback {
        width: 32px;
        height: 32px;
        object-fit: contain;
    }

    .tile.selected .tile-cover::after {
        content: '';
        position: absolute;
        inset: 0;
        background: rgba(49, 106, 197, 0.45);
    }

    .tile-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }

    .tile-name {
        padding: 0 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .tile.selected .tile-name {
        background: #316ac5;
        color: #fff;
    }

    .tile-line {
        padding: 0 2px;
        color: #808080;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    /* Details view */
    .list-header,
    .list-row {
        display: grid;
        grid-template-columns: minmax(0, 2.5fr) 90px 90px 80px;
        align-items: center;
    }

    .list.narrow .list-header,
    .list.narrow .list-row {
        grid-template-columns: minmax(0, 1fr) 80px 70px;
    }

    .list-header {
        position: sticky;
        top: 0;
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
        height: 22px;
        cursor: default;
    }

    .list-row > span {
        padding: 0 6px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
    }

    .list-row.selected {
        background: #316ac5;
        color: #fff;
    }

    /* Status bar (XP.css) */
    .status-bar {
        display: flex;
        gap: 0;
        margin: 0 3px 2px;
        padding: 2px 1px;
        box-shadow: inset 0 1px 2px #808080;
    }

    .status-bar-field {
        flex-grow: 1;
        padding: 1px 4px;
        border-right: 1px solid rgba(208, 206, 191, 0.75);
        border-left: 1px solid rgba(255, 255, 255, 0.75);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .status-bar-field:first-of-type {
        border-left: none;
    }

    .status-bar-field:last-of-type {
        border-right: none;
    }
</style>

<svelte:options accessors={true}></svelte:options>
