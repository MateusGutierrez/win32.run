<script>
    // Profile window styled after XP.css (https://botoxparty.github.io/XP.css):
    // tabs, tab panel, group boxes, tree view, progress bar and buttons use its exact values.
    import Window from '../../../lib/components/xp/Window.svelte';
    import { runningPrograms, queueProgram } from '../../../lib/store';
    import { onMount } from 'svelte';
    import axios from 'axios';
    import { build_skill_groups, build_core_stack } from '../../../lib/skills';

    export let id;
    export let window;
    export let self;
    export let parentNode;
    export let exec_path;

    const GITHUB_USER = 'MateusGutierrez';

    let profile = null;
    let profileLoaded = false;

    let repos = [];
    let reposLoading = true;
    let reposError = false;

    let photoFailed = false;
    let activeTab = 'General';

    $: skillGroups = build_skill_groups(profile?.skills || {});
    $: coreStack = build_core_stack(profile?.core_stack || []);

    // Live data from /api/steam and /api/spotify (null = not configured / unavailable)
    let steam = null;
    let spotify = null;

    $: interests = profile?.interests || {};
    $: hasSpotifyLive = !!(spotify?.top_tracks?.length || spotify?.recent?.length || spotify?.playlist);
    $: hasInterests = !!(
        steam || hasSpotifyLive ||
        interests.spotify?.embed || interests.spotify?.profile ||
        interests.steam?.games?.length || interests.steam?.profile ||
        interests.psn?.games?.length || interests.psn?.profile
    );
    $: tabs = ['General', 'Experience', 'Projects', 'Skills', ...(hasInterests ? ['Interests'] : [])];

    // Curated projects grouped by category, in the order they first appear
    $: projectGroups = (profile?.projects || []).reduce((groups, p) => {
        const category = p.category || 'Projects';
        let group = groups.find(g => g.category === category);
        if (!group) groups.push(group = { category, items: [] });
        group.items.push(p);
        return groups;
    }, []);

    $: initials = (profile?.name || 'M').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();

    async function load_steam() {
        try {
            const res = await axios.get('/api/steam');
            steam = res.data?.configured && !res.data.error ? res.data : null;
        } catch (e) {
            steam = null;
        }
    }

    async function load_spotify() {
        try {
            const res = await axios.get('/api/spotify');
            spotify = res.data?.configured && !res.data.error ? res.data : null;
        } catch (e) {
            spotify = null;
        }
    }

    async function load_profile() {
        try {
            const res = await axios.get('/json/portfolio.json');
            const data = res.data;
            // Only offer the resume buttons when the PDF is actually there
            if (data?.resume_pdf) {
                try {
                    const head = await axios.head(data.resume_pdf);
                    if (!String(head.headers['content-type'] || '').includes('pdf')) data.resume_pdf = '';
                } catch (e) {
                    data.resume_pdf = '';
                }
            }
            profile = data;
        } catch (e) {
            console.error('Failed to load portfolio.json', e);
        }
        profileLoaded = true;

        try {
            const res = await axios.get(`https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=100`);
            // Only the two most recently updated repos that have a live site
            repos = res.data.filter(r => !r.fork && r.homepage).slice(0, 2);
        } catch (e) {
            console.error('Failed to fetch GitHub repos', e);
            reposError = true;
        }
        reposLoading = false;
    }

    onMount(() => {
        load_profile();
        load_steam();
        load_spotify();
    });

    export function destroy() {
        runningPrograms.update(programs => programs.filter(p => p != self));
        self.$destroy();
    }

    // Opens the resume in Internet Explorer, which shows it with the browser's PDF viewer
    function open_resume() {
        if (!profile?.resume_pdf) return;
        queueProgram.set({ path: './programs/internet_explorer.svelte', fs_item: { url: profile.resume_pdf } });
    }

    function download_resume() {
        if (!profile?.resume_pdf) return;
        const a = document.createElement('a');
        a.href = profile.resume_pdf;
        a.download = profile.resume_pdf.split('/').pop() || 'Resume.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    function spotify_embed_url(url) {
        if (!url) return null;
        if (url.includes('/embed/')) return url;
        // https://open.spotify.com/playlist/ID?si=... -> https://open.spotify.com/embed/playlist/ID
        const match = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album|artist|track|show|episode)\/([A-Za-z0-9]+)/);
        return match ? `https://open.spotify.com/embed/${match[1]}/${match[2]}?theme=0` : null;
    }

    function game_cover(game) {
        if (game.cover) return game.cover;
        if (game.appid) return `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.appid}/header.jpg`;
        return null;
    }

    const STEAM_STATUS = {
        'in-game': 'In-game',
        online: 'Online',
        away: 'Away',
        snooze: 'Snooze',
        busy: 'Busy',
        offline: 'Offline'
    };

    let ws_size = {
        width: document.querySelector('#work-space')?.offsetWidth || 900,
        height: document.querySelector('#work-space')?.offsetHeight || 600
    };

    export let options = {
        title: 'My Resume',
        min_width: 340,
        min_height: 380,
        width: Math.min(ws_size.width - 20, 560),
        height: Math.min(ws_size.height - 20, 620),
        icon: '/images/xp/icons/Briefcase.png',
        id: id,
        // Own key for the saved window rect, so the old, bigger layout isn't restored
        exec_path: exec_path ? `${exec_path}#profile-viewer` : exec_path
    };
</script>

<Window options={options} bind:this={window} on_click_close={destroy}>
    <div slot="content" class="window-body absolute inset-1 top-0 flex flex-col overflow-hidden select-text">

        <!-- Header: picture, name, resume buttons -->
        <div class="header shrink-0 flex flex-wrap items-start gap-[10px]">
            <div class="picture shrink-0">
                {#if profile?.photo && !photoFailed}
                    <img src={profile.photo} alt={profile?.name} class="w-full h-full object-cover"
                        on:error={() => photoFailed = true}>
                {:else}
                    <span class="font-bold">{initials}</span>
                {/if}
            </div>

            <div class="flex-1 min-w-[150px] flex flex-col gap-[3px] pt-[2px]">
                <b>{profile?.name || 'Mateus'}</b>
                <span>{profile?.title || 'Software Developer'}</span>
                {#if profile?.location}<span>{profile.location}</span>{/if}
            </div>

            {#if profile?.resume_pdf}
                <div class="flex flex-col gap-[6px] shrink-0">
                    <button class="xp-button" on:click={open_resume}>View Resume...</button>
                    <button class="xp-button" on:click={download_resume}>Download</button>
                </div>
            {/if}
        </div>

        <!-- Tabs -->
        <menu role="tablist" class="shrink-0">
            {#each tabs as tab}
                <button role="tab" aria-selected={activeTab === tab} on:click={() => activeTab = tab}>{tab}</button>
            {/each}
        </menu>

        <article role="tabpanel" class="grow min-h-0 overflow-y-auto overflow-x-hidden">

            {#if !profileLoaded}
                <div class="flex flex-col items-center gap-[8px] py-10">
                    <span>Loading profile...</span>
                    <progress class="w-[160px]"></progress>
                </div>

            {:else if activeTab === 'General'}
                <fieldset>
                    <legend>Summary</legend>
                    <p>{profile?.bio || ''}</p>
                </fieldset>

                {#if profile?.education?.length}
                    <fieldset>
                        <legend>Education</legend>
                        <div class="flex flex-col gap-[8px]">
                            {#each profile.education as edu}
                                <div class="flex gap-[8px]">
                                    <img src="/images/xp/icons/Wizard.png" alt="" class="w-[32px] h-[32px] shrink-0">
                                    <div class="flex flex-col gap-[2px]">
                                        <b>{edu.institution}</b>
                                        <span>{edu.degree}</span>
                                        <span>{edu.period}</span>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </fieldset>
                {/if}

                {#if profile?.links}
                    <fieldset>
                        <legend>Contact</legend>
                        <div class="field-grid">
                            {#if profile.links.email}
                                <span>E-mail:</span>
                                <a href="mailto:{profile.links.email}">{profile.links.email}</a>
                            {/if}
                            {#if profile.links.github}
                                <span>GitHub:</span>
                                <a href={profile.links.github} target="_blank" rel="noopener">{profile.links.github.replace(/^https?:\/\/(www\.)?/, '')}</a>
                            {/if}
                            {#if profile.links.linkedin}
                                <span>LinkedIn:</span>
                                <a href={profile.links.linkedin} target="_blank" rel="noopener">{profile.links.linkedin.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a>
                            {/if}
                        </div>
                    </fieldset>
                {/if}

            {:else if activeTab === 'Experience'}
                {#each (profile?.experience || []) as job}
                    <fieldset>
                        <legend>{job.company}</legend>
                        <div class="flex flex-col gap-[2px] mb-[6px]">
                            <b>{job.role}</b>
                            <span>{job.period}</span>
                        </div>
                        {#if job.points?.length}
                            <ul class="bullets">
                                {#each job.points as point}
                                    <li>{point}</li>
                                {/each}
                            </ul>
                        {:else if job.description}
                            <p>{job.description}</p>
                        {/if}
                    </fieldset>
                {/each}

            {:else if activeTab === 'Projects'}
                {#each projectGroups as group}
                    <fieldset>
                        <legend>{group.category}</legend>
                        <div class="flex flex-col gap-[10px]">
                            {#each group.items as project}
                                <div class="flex flex-col gap-[3px]">
                                    <b>{project.title}</b>
                                    {#if project.description}<p>{project.description}</p>{/if}
                                    {#if project.tech}
                                        <span>Built with: {Array.isArray(project.tech) ? project.tech.join(', ') : project.tech}</span>
                                    {/if}
                                    {#if project.link || project.repo}
                                        <div class="flex gap-[12px]">
                                            {#if project.link}<a href={project.link} target="_blank" rel="noopener">Visit site</a>{/if}
                                            {#if project.repo}<a href={project.repo} target="_blank" rel="noopener">View source</a>{/if}
                                        </div>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </fieldset>
                {/each}

                <fieldset>
                    <legend>From GitHub</legend>
                    {#if reposLoading}
                        <div class="flex items-center gap-[8px]">
                            <progress class="w-[120px]"></progress>
                            <span>Loading repositories...</span>
                        </div>
                    {:else if reposError || repos.length === 0}
                        <p>
                            Could not load repositories.
                            <a href="https://github.com/{GITHUB_USER}" target="_blank" rel="noopener">Open GitHub</a>
                        </p>
                    {:else}
                        <div class="flex flex-col gap-[10px]">
                            {#each repos as repo}
                                <div class="flex flex-col gap-[3px]">
                                    <b>{repo.name}</b>
                                    {#if repo.description}<p>{repo.description}</p>{/if}
                                    {#if repo.language}<span>Language: {repo.language}</span>{/if}
                                    <div class="flex gap-[12px]">
                                        <a href={repo.homepage} target="_blank" rel="noopener">Visit site</a>
                                        <a href={repo.html_url} target="_blank" rel="noopener">View source</a>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </fieldset>

                <p>
                    <a href="https://github.com/{GITHUB_USER}" target="_blank" rel="noopener">See all repositories on GitHub</a>
                </p>

            {:else if activeTab === 'Skills'}
                {#if coreStack.length}
                    <fieldset>
                        <legend>Core Stack</legend>
                        <p class="mb-[8px]">The technologies I use the most at work.</p>
                        <div class="core-stack">
                            {#each coreStack as skill}
                                <div class="core-item" title={skill.name}>
                                    <span class="skill-logo big"><img src={skill.icon} alt=""></span>
                                    <span>{skill.name}</span>
                                </div>
                            {/each}
                        </div>
                    </fieldset>
                {/if}

                <!-- Categories in Tiles view -->
                {#each skillGroups as group}
                    <fieldset>
                        <legend>{group.category} ({group.items.length})</legend>
                        <div class="skill-tiles">
                            {#each group.items as skill}
                                <div class="skill-tile" title={skill.name}>
                                    <span class="skill-logo"><img src={skill.icon} alt="" loading="lazy"></span>
                                    <span class="skill-name">{skill.name}</span>
                                </div>
                            {/each}
                        </div>
                    </fieldset>
                {/each}

                {#if profile?.certifications?.length}
                    <fieldset>
                        <legend>Certifications</legend>
                        <div class="flex flex-col gap-[8px]">
                            {#each profile.certifications as cert}
                                <div class="flex gap-[8px] items-start">
                                    <img src="/images/xp/icons/Certificate.png" alt="" class="w-[32px] h-[32px] shrink-0">
                                    <div class="flex flex-col gap-[2px] min-w-0">
                                        <b>{cert.title}</b>
                                        {#if cert.description}<span>{cert.description}</span>{/if}
                                        {#if cert.link}<a href={cert.link} target="_blank" rel="noopener">View certificate</a>{/if}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </fieldset>
                {/if}

            {:else if activeTab === 'Interests'}
                <p class="mb-[10px]">Things I enjoy when I'm not writing code. Open a folder to see more.</p>

                <!-- Music -->
                {#if hasSpotifyLive || interests.spotify?.embed || interests.spotify?.profile}
                    <fieldset>
                        <legend>Music</legend>
                        <div class="flex gap-[10px]">
                            <img src="/images/xp/icons/Spotify.svg" alt="" class="w-[32px] h-[32px] shrink-0">
                            <div class="grow min-w-0 flex flex-col gap-[8px]">
                                {#if spotify?.top_tracks?.length}
                                    {#each [spotify.top_tracks[0]] as track}
                                        <div class="flex gap-[8px] items-center">
                                            {#if track.image}
                                                <img src={track.image} alt={track.album} class="thumb w-[56px] h-[56px] shrink-0">
                                            {/if}
                                            <div class="min-w-0 grow flex flex-col gap-[3px]">
                                                <span>My most played song this month:</span>
                                                <a href={track.url} target="_blank" rel="noopener" class="truncate"><b>{track.name}</b></a>
                                                <span class="truncate">{track.artists}</span>
                                            </div>
                                        </div>
                                    {/each}
                                    {#if spotify.top_tracks.length > 1}
                                        <div class="flex flex-col gap-[4px]">
                                            <span>Also on repeat:</span>
                                            <div class="flex gap-[4px] flex-wrap">
                                                {#each spotify.top_tracks.slice(1, 7) as track}
                                                    <a href={track.url} target="_blank" rel="noopener" title="{track.name} - {track.artists}">
                                                        <img src={track.image} alt={track.name} class="thumb w-[40px] h-[40px]" loading="lazy">
                                                    </a>
                                                {/each}
                                            </div>
                                        </div>
                                    {/if}
                                {:else if spotify?.playlist}
                                    <span>My playlist: <b>{spotify.playlist.name}</b></span>
                                {:else}
                                    <span>Some of the music I'm into lately.</span>
                                {/if}

                                {#if !hasSpotifyLive && spotify_embed_url(interests.spotify?.embed)}
                                    <iframe title="Spotify playlist" src={spotify_embed_url(interests.spotify.embed)}
                                        class="w-full h-[80px] border-0" loading="lazy"
                                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>
                                {/if}

                                <div class="flex gap-[6px] flex-wrap">
                                    <button class="xp-button" on:click={() => queueProgram.set({ path: './programs/my_spotify.svelte' })}>Open My Spotify...</button>
                                    {#if interests.spotify?.profile}
                                        <button class="xp-button" on:click={() => globalThis.open(interests.spotify.profile, '_blank', 'noopener')}>Spotify Profile</button>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    </fieldset>
                {/if}

                <!-- Games -->
                {#if steam || interests.steam?.games?.length || interests.steam?.profile || interests.psn?.games?.length || interests.psn?.profile}
                    <fieldset>
                        <legend>Games</legend>
                        <div class="flex gap-[10px]">
                            <img src="/images/xp/icons/Steam.svg" alt="" class="w-[32px] h-[32px] shrink-0">
                            <div class="grow min-w-0 flex flex-col gap-[8px]">
                                {#if steam}
                                    <div class="flex items-center gap-[8px]">
                                        {#if steam.profile.avatar}
                                            <img src={steam.profile.avatar} alt="" class="thumb w-[32px] h-[32px] shrink-0">
                                        {/if}
                                        <div class="flex flex-col gap-[2px] min-w-0">
                                            <span>Steam: <b>{steam.profile.name}</b></span>
                                            <span>
                                                {STEAM_STATUS[steam.profile.state] || 'Offline'}{#if steam.profile.playing}, playing {steam.profile.playing.name}{/if}{#if steam.game_count} &middot; {steam.game_count} games{/if}
                                            </span>
                                        </div>
                                    </div>
                                {/if}

                                {#if (steam?.recent?.length ? steam.recent : interests.steam?.games || []).length}
                                    <div class="flex flex-col gap-[4px]">
                                        <span>{steam?.recent?.length ? 'Recently played:' : 'On Steam:'}</span>
                                        <div class="flex gap-[6px] flex-wrap">
                                            {#each (steam?.recent?.length ? steam.recent : interests.steam.games).slice(0, 3) as game}
                                                {#if game_cover(game)}
                                                    <img src={game_cover(game)} alt={game.name} title={game.name} class="thumb w-[92px] h-[43px]" loading="lazy">
                                                {/if}
                                            {/each}
                                        </div>
                                    </div>
                                {/if}

                                {#if interests.psn?.games?.length}
                                    <span>
                                        PlayStation: {interests.psn.games.slice(0, 3).map(g => g.name).join(', ')}{interests.psn.games.length > 3 ? '...' : ''}
                                    </span>
                                {/if}

                                <div class="flex gap-[6px] flex-wrap">
                                    <button class="xp-button" on:click={() => queueProgram.set({ path: './programs/my_games.svelte' })}>Open My Games...</button>
                                    {#if steam?.profile?.url || interests.steam?.profile}
                                        <button class="xp-button" on:click={() => globalThis.open(steam?.profile?.url || interests.steam.profile, '_blank', 'noopener')}>Steam Profile</button>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    </fieldset>
                {/if}
            {/if}

        </article>

        <!-- Dialog buttons -->
        <!-- (a div, not a section: a global stylesheet sizes every section to the viewport) -->
        <div class="field-row shrink-0 justify-end">
            <button class="xp-button" on:click={destroy}>OK</button>
            <button class="xp-button" on:click={destroy}>Cancel</button>
        </div>
    </div>
</Window>

<style>
    /* ---------- Window body (XP.css .window-body) ---------- */
    .window-body {
        font-family: 'MSSS', Arial, sans-serif;
        font-size: 11px;
        color: #222;
        background: #ece9d8;
        padding: 8px;
        -webkit-font-smoothing: antialiased;
    }

    .window-body b {
        font-weight: bold;
    }

    .header {
        margin-bottom: 10px;
    }

    .picture {
        width: 52px;
        height: 52px;
        padding: 1px;
        background: #fff;
        border: 1px solid #7f9db9;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
    }

    .thumb {
        object-fit: cover;
        border: 1px solid #7f9db9;
    }

    /* ---------- Links (XP.css a) ---------- */
    a {
        color: #0000ff;
        text-decoration: underline;
    }

    a:focus {
        outline: 1px dotted #0000ff;
    }

    /* ---------- Buttons (XP.css button) ---------- */
    .xp-button,
    menu[role='tablist'] button {
        font-family: 'MSSS', Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
        font-size: 11px;
        color: #222;
        box-sizing: border-box;
        border: 1px solid #003c74;
        background: linear-gradient(180deg, #fff 0%, #ecebe5 86%, #d8d0c4 100%);
        box-shadow: none;
        border-radius: 3px;
        min-height: 23px;
    }

    .xp-button {
        min-width: 75px;
        padding: 0 12px;
    }

    .xp-button:not(:disabled):hover {
        box-shadow: inset -1px 1px #fff0cf, inset 1px 2px #fdd889, inset -2px 2px #fbc761, inset 2px -2px #e5a01a;
    }

    .xp-button:focus {
        outline: 1px dotted #000;
        outline-offset: -4px;
        box-shadow: inset -1px 1px #cee7ff, inset 1px 2px #98b8ea, inset -2px 2px #bcd4f6, inset 1px -1px #89ade4, inset 2px -2px #89ade4;
    }

    .xp-button:not(:disabled):active {
        box-shadow: none;
        background: linear-gradient(180deg, #cdcac3 0%, #e3e3db 8%, #e5e5de 94%, #f2f2f1 100%);
    }

    .field-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding-top: 9px;
    }

    /* ---------- Tabs (XP.css menu[role=tablist]) ---------- */
    menu[role='tablist'] {
        position: relative;
        margin: 0 0 -2px 0;
        list-style-type: none;
        display: flex;
        padding-left: 3px;
    }

    menu[role='tablist'] button {
        display: block;
        position: relative;
        z-index: 1;
        min-width: unset;
        background: linear-gradient(180deg, #fff 0%, #fafaf9 26%, #f0f0ea 95%, #ecebe5 100%);
        margin-left: -1px;
        margin-right: 2px;
        border-radius: 0;
        border-color: #91a7b4;
        border-top-left-radius: 3px;
        border-top-right-radius: 3px;
        padding: 0 12px 3px;
    }

    menu[role='tablist'] button:hover {
        border-top: 1px solid #e68b2c;
        box-shadow: inset 0 2px #ffc73c;
    }

    menu[role='tablist'] button:focus {
        outline: 1px dotted #222;
        outline-offset: -4px;
    }

    menu[role='tablist'] button[aria-selected='true'] {
        z-index: 8;
        padding-bottom: 2px;
        margin-top: -2px;
        margin-left: -3px;
        margin-right: -1px;
        margin-bottom: 1px;
        background: #fcfcfe;
        border-color: #919b9c;
        border-bottom: 1px solid transparent;
        border-top: 1px solid #e68b2c;
        box-shadow: inset 0 2px #ffc73c;
    }

    menu[role='tablist'] button[aria-selected='true']:first-of-type {
        margin-left: -1px;
    }

    /* ---------- Tab panel (XP.css [role=tabpanel]) ---------- */
    article[role='tabpanel'] {
        position: relative;
        z-index: 2;
        padding: 14px;
        background: linear-gradient(180deg, #fcfcfe 0%, #f4f3ee 100%);
        border: 1px solid #919b9c;
        box-shadow: inset 1px 1px #fcfcfe, inset -1px -1px #fcfcfe, 1px 2px 2px 0 rgba(208, 206, 191, 0.75);
    }

    /* ---------- GroupBox (XP.css fieldset) ---------- */
    fieldset {
        background: #fff;
        border: 1px solid #d0d0bf;
        border-radius: 4px;
        padding: 10px;
        margin: 0 0 9px 0;
    }

    legend {
        background: transparent;
        color: #0046d5;
        padding: 0 2px;
    }

    p {
        line-height: 1.35;
    }

    .field-grid {
        display: grid;
        grid-template-columns: max-content 1fr;
        column-gap: 12px;
        row-gap: 6px;
        word-break: break-all;
    }

    .bullets {
        list-style: disc;
        padding-left: 16px;
        display: flex;
        flex-direction: column;
        gap: 3px;
        line-height: 1.35;
    }


    /* ---------- Skills (XP Explorer "Tiles" view) ---------- */
    .skill-logo {
        width: 36px;
        height: 36px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
    }

    .skill-logo img {
        width: 32px;
        height: 32px;
        object-fit: contain;
    }

    .skill-logo.big {
        width: 52px;
        height: 52px;
        background: #fff;
        border: 1px solid #d0d0bf;
        border-radius: 4px;
        box-shadow: inset 0 -8px 12px -8px #e3e9f6;
    }

    .skill-logo.big img {
        width: 36px;
        height: 36px;
    }

    .core-stack {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
        gap: 6px;
    }

    .core-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        padding: 6px 2px;
        font-size: 11px;
        color: #222;
        text-align: center;
    }

    .skill-tiles {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 4px 10px;
    }

    .skill-tile {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 3px;
        font-size: 11px;
        color: #222;
        min-width: 0;
    }

    .skill-name {
        padding: 0 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    /* ---------- ProgressBar (XP.css progress) ---------- */
    progress {
        --indeterminate-track: repeating-linear-gradient(to right, transparent 0px, transparent 8px, #fff 8px, #fff 10px, transparent 10px, transparent 18px, #fff 18px, #fff 20px, transparent 20px, transparent 28px, #fff 28px, #fff 100%),
            linear-gradient(to bottom, #acedad 0%, #7be47d 14%, #4cda50 28%, #2ed330 42%, #42d845 57%, #76e275 71%, #8fe791 85%, #fff 100%);
        --track-shadow: inset 0 0 1px 0 #686868;
        box-sizing: border-box;
        appearance: none;
        -webkit-appearance: none;
        height: 14px;
        border: 1px solid #686868;
        border-radius: 4px;
        padding: 1px 2px 1px 0;
        overflow: hidden;
        background-color: #fff;
        box-shadow: var(--track-shadow);
    }




    progress:not([value]) {
        position: relative;
    }

    progress:not([value])::-webkit-progress-bar {
        width: 100%;
        background: var(--indeterminate-track);
    }

    progress:not([value])::before {
        box-sizing: border-box;
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: #fff;
        box-shadow: var(--track-shadow);
    }

    progress:not([value])::after {
        box-sizing: border-box;
        content: '';
        position: absolute;
        top: 1px;
        left: 2px;
        width: 100%;
        height: calc(100% - 2px);
        padding: 1px 2px;
        border-radius: 2px;
        background: var(--indeterminate-track);
        animation: sliding 2s linear 0s infinite;
    }

    progress:not([value])::-moz-progress-bar {
        width: 100%;
        background: var(--indeterminate-track);
        animation: sliding 2s linear 0s infinite;
    }

    @keyframes sliding {
        0% { transform: translateX(-30px); }
        100% { transform: translateX(100%); }
    }
</style>

<svelte:options accessors={true}></svelte:options>
