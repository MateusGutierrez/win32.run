<script>
    import { onMount } from 'svelte';
    import axios from 'axios';
    import { queueProgram, queueCommand } from '../../lib/store';

    export let self;

    let profile = null;
    let photoFailed = false;
    let stage = 'login'; // login -> loading -> (destroyed)
    let welcome_audio;
    let destroyed = false;

    $: display_name = (() => {
        const parts = (profile?.name || 'Mateus').split(' ').filter(Boolean);
        return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];
    })();
    $: initials = display_name.split(' ').map(w => w[0]).join('').toUpperCase();

    onMount(async () => {
        welcome_audio = new Audio('/audio/xp_startup.mp3');
        welcome_audio.preload = 'auto';
        try {
            const res = await axios.get('/json/portfolio.json');
            profile = res.data;
        } catch (e) {
            console.error('Failed to load portfolio.json', e);
        }
    });

    function log_on() {
        if (stage !== 'login') return;
        stage = 'loading';
        // Like XP: "Loading your personal settings..." then the desktop + startup sound
        setTimeout(() => {
            welcome_audio?.play().catch(() => {});
            queueProgram.set({ path: './programs/portfolio.svelte' });
            self.destroy();
        }, 1500);
    }

    function turn_off() {
        queueCommand.set('shutdown');
    }

    export function destroy() {
        if (destroyed) return;
        destroyed = true;
        self.$destroy();
    }
</script>

<div class="logon absolute inset-0 z-50 overflow-hidden flex flex-col bg-[#5a7edc] text-white select-none">
    <!-- Top bar -->
    <div class="h-[70px] md:h-[90px] bg-[#00309c] shrink-0"></div>
    <div class="h-[2px] bg-[linear-gradient(45deg,#466dcd,#c7ddff,#b0c9f7,#5a7edc)] shrink-0"></div>

    <!-- Main -->
    <div class="grow relative overflow-hidden flex items-center justify-center px-4
        bg-[radial-gradient(circle_at_5%_5%,#91b1ef_0,#7698e6_6%,#5a7edc_12%)]">

        <!-- Center divider (desktop only) -->
        <div class="hidden md:block absolute left-1/2 top-[15%] h-[70%] w-[1px] bg-[linear-gradient(180deg,transparent,#c7d5f5,transparent)]"></div>

        <div class="relative w-full max-w-[900px] flex flex-col md:flex-row items-center gap-8 md:gap-0">

            <!-- Left: logo -->
            <div class="flex-1 flex flex-col items-center md:items-end text-center md:text-right md:pr-10">
                <img src="/images/xp_logo.png" alt="Windows XP" class="w-[160px] md:w-[220px] mb-[14px]">
                <span class="hint">To begin, click your user name</span>
            </div>

            <!-- Right: user list -->
            <div class="flex-1 w-full md:w-auto flex justify-center md:justify-start md:pl-10">
                <button on:click={log_on} class="user-tile flex items-center gap-[14px] text-left {stage === 'loading' ? 'selected' : ''}">
                    <div class="user-picture shrink-0">
                        {#if profile?.photo && !photoFailed}
                            <img src={profile.photo} alt={display_name} class="w-full h-full object-cover"
                                on:error={() => photoFailed = true}>
                        {:else}
                            <span class="text-[20px] font-bold text-[#555]">{initials}</span>
                        {/if}
                    </div>
                    <div class="flex flex-col gap-[2px]">
                        <span class="user-name">{display_name}</span>
                        {#if stage === 'loading'}
                            <span class="user-status">Loading your personal settings...</span>
                        {:else}
                            <span class="user-status">{profile?.title || 'Software Developer'}</span>
                        {/if}
                    </div>
                </button>
            </div>
        </div>
    </div>

    <!-- Bottom bar -->
    <div class="h-[2px] bg-[linear-gradient(45deg,#003399,#f99736,#c2814d,#00309c)] shrink-0"></div>
    <div class="min-h-[70px] md:h-[90px] w-full bg-[linear-gradient(90deg,#3833ac,#00309c)] shrink-0
        flex flex-col sm:flex-row items-center justify-between gap-2 px-4 md:px-8 py-3">
        <button on:click={turn_off} class="turn-off flex items-center gap-[8px]">
            <img src="/images/xp/icons/Power.png" alt="" class="w-[24px] h-[24px]">
            <span>Turn off computer</span>
        </button>
        <div class="footnote hidden sm:block text-right">
            <div>After you log on, you can explore my projects,</div>
            <div>skills and experience in My Resume.</div>
        </div>
    </div>
</div>

<style>
    /* Windows XP logon screen. Text uses Trebuchet MS, the title font of XP.css */
    .logon {
        font-family: 'Trebuchet', 'Trebuchet MS', Arial, sans-serif;
    }

    .hint {
        font-size: 18px;
        color: #fff;
    }

    .user-tile {
        padding: 6px 48px 6px 6px;
        border-radius: 8px 0 0 8px;
        border: 0;
        background: transparent;
    }

    .user-tile.selected {
        background: linear-gradient(90deg, #0b2f9b 0%, #1a46b8 45%, rgba(90, 126, 220, 0) 100%);
    }

    .user-picture {
        width: 52px;
        height: 52px;
        border: 2px solid #fff;
        border-radius: 4px;
        overflow: hidden;
        background: linear-gradient(135deg, #f0f0f0, #c0c0c0);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .user-tile:hover .user-picture,
    .user-tile.selected .user-picture {
        border-color: #ffc73c;
    }

    .user-name {
        font-size: 20px;
        color: #fff;
    }

    .user-status {
        font-size: 13px;
        color: #c8d6f8;
    }

    .user-tile:hover .user-status {
        color: #fff;
    }

    .turn-off {
        font-size: 15px;
        color: #fff;
        padding: 2px 4px;
        border: 0;
        background: transparent;
    }

    .turn-off:hover span {
        text-decoration: underline;
    }

    .footnote {
        font-size: 12px;
        line-height: 1.4;
        color: #fff;
    }
</style>

<svelte:options accessors={true}></svelte:options>
