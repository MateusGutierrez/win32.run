<script>
    import Window from '../../../lib/components/xp/Window.svelte';
    import DumbProgress from '../../../lib/components/xp/DumbProgress.svelte';
    import { runningPrograms } from '../../../lib/store';
    import { onMount } from 'svelte';
    import axios from 'axios';

    export let id;
    export let window;
    export let self;
    export let parentNode;
    export let exec_path;

    let activeSection = 'home';

    // Portfolio data from JSON
    let profile = null;
    let profileLoaded = false;

    // GitHub repos
    let repos = [];
    let reposLoading = true;
    let reposError = false;

    const GITHUB_USER = 'MateusGutierrez';

    const sections = [
        { id: 'home', label: 'Home', icon: '/images/xp/icons/IEHome.png' },
        { id: 'about', label: 'About Me', icon: '/images/xp/icons/Information.png' },
        { id: 'experience', label: 'Experience', icon: '/images/xp/icons/Briefcase.png' },
        { id: 'projects', label: 'Projects', icon: '/images/xp/icons/FolderClosed.png' },
        { id: 'skills', label: 'Skills', icon: '/images/xp/icons/Properties.png' },
        { id: 'contact', label: 'Contact', icon: '/images/xp/icons/AddressBook.png' },
    ];

    const langColors = {
        JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572a5',
        Go: '#00add8', HTML: '#e34c26', CSS: '#563d7c', Java: '#b07219',
        'C#': '#178600', Ruby: '#701516', Rust: '#dea584', Shell: '#89e051',
        Svelte: '#ff3e00', Vue: '#41b883', Dart: '#00b4ab', Kotlin: '#A97BFF',
    };

    onMount(async () => {
        // Load portfolio JSON
        try {
            const res = await axios.get('/json/portfolio.json');
            profile = res.data;
            profileLoaded = true;
        } catch (e) {
            console.error('Failed to load portfolio.json', e);
            profileLoaded = true;
        }

        // Load GitHub repos
        try {
            const res = await axios.get(`https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=12`);
            repos = res.data.filter(r => !r.fork);
            reposLoading = false;
        } catch (e) {
            console.error('Failed to fetch GitHub repos', e);
            reposError = true;
            reposLoading = false;
        }
    });

    export function destroy() {
        runningPrograms.update(programs => programs.filter(p => p != self));
        self.$destroy();
    }

    let ws_size = {
        width: document.querySelector('#work-space')?.offsetWidth || 900,
        height: document.querySelector('#work-space')?.offsetHeight || 600
    };

    export let options = {
        title: "Mateus's Portfolio",
        min_width: 600,
        min_height: 400,
        width: Math.min(ws_size.width - 40, 860),
        height: Math.min(ws_size.height - 40, 580),
        icon: '/images/xp/icons/Briefcase.png',
        id: id,
        exec_path
    };
</script>

<Window options={options} bind:this={window} on_click_close={destroy}>
    <div slot="content" class="absolute inset-0.5 top-0 flex flex-row font-MSSS overflow-hidden">

        <!-- Sidebar -->
        <div class="w-[180px] shrink-0 flex flex-col overflow-y-auto" style="background: #ece9d8; border-right: 1px solid #aca899;">

            <!-- Header -->
            <div class="px-3 py-3 shrink-0" style="background: linear-gradient(180deg, #0054e3 0%, #0040b0 100%);">
                <div class="text-[14px] font-bold text-white font-Trebuchet">{profile?.name || 'Mateus'}</div>
                <div class="text-[11px] text-white" style="opacity: 0.85;">{profile?.title || 'Software Engineer'}</div>
            </div>

            <!-- Separator -->
            <div class="h-[2px] shrink-0" style="background: linear-gradient(90deg, #da884a, transparent);"></div>

            <!-- Nav -->
            <div class="flex-1 py-1">
                {#each sections as section}
                    <button
                        class="flex items-center gap-[6px] w-full px-3 py-[5px] text-left border-none outline-none"
                        style="{activeSection === section.id
                            ? 'background: #316AC5; color: white;'
                            : 'background: transparent; color: #333;'}"
                        style:cursor="pointer"
                        on:click={() => activeSection = section.id}>
                        <div class="w-[16px] h-[16px] shrink-0 bg-contain bg-no-repeat bg-center"
                            style:background-image="url({section.icon})"></div>
                        <span class="text-[11px] {activeSection === section.id ? 'font-bold' : ''}">{section.label}</span>
                    </button>
                {/each}
            </div>

            <!-- Footer links -->
            {#if profile?.links}
            <div class="shrink-0 px-3 py-2" style="border-top: 1px solid #c0c0c0;">
                <a href="{profile.links.github}" target="_blank" rel="noopener" class="flex items-center gap-1 mb-1">
                    <div class="w-[12px] h-[12px] shrink-0 bg-contain bg-no-repeat bg-center bg-[url(/images/xp/icons/InternetShortcut.png)]"></div>
                    <span class="text-[10px] text-[#2956b2] underline">GitHub</span>
                </a>
                <a href="{profile.links.linkedin}" target="_blank" rel="noopener" class="flex items-center gap-1">
                    <div class="w-[12px] h-[12px] shrink-0 bg-contain bg-no-repeat bg-center bg-[url(/images/xp/icons/InternetShortcut.png)]"></div>
                    <span class="text-[10px] text-[#2956b2] underline">LinkedIn</span>
                </a>
            </div>
            {/if}
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-auto bg-white p-4">

            {#if !profileLoaded}
                <div class="flex items-center justify-center h-full">
                    <DumbProgress style="width:150px;height:15px;"></DumbProgress>
                </div>

            {:else if activeSection === 'home'}
                <!-- HOME -->
                <div class="flex flex-col h-full justify-center items-center text-center">
                    <div class="flex items-center gap-3 mb-3">
                        <div class="w-[32px] h-[32px] shrink-0 bg-contain bg-no-repeat bg-center bg-[url(/images/xp/icons/Briefcase.png)]"></div>
                        <div class="text-[18px] font-bold text-[#003399] font-Trebuchet">{profile?.name || 'Mateus'}</div>
                    </div>
                    <div class="text-[12px] text-[#555] mb-3">{profile?.title || 'Software Engineer'}</div>
                    <div class="h-[2px] w-[200px] mb-4" style="background: linear-gradient(90deg, transparent, #3169c6, transparent);"></div>
                    <p class="text-[11px] text-[#333] max-w-[380px] leading-relaxed mb-5">
                        {profile?.bio || 'Welcome to my portfolio.'}
                    </p>
                    <div class="flex gap-2">
                        <button class="px-3 py-[3px] text-[11px] text-[#333] cursor-pointer"
                            style="background: linear-gradient(180deg, #fff 60%, #ecebe5 100%); border: 1px solid #003c74; border-radius: 3px;"
                            on:click={() => activeSection = 'projects'}>
                            View Projects
                        </button>
                        <button class="px-3 py-[3px] text-[11px] text-[#333] cursor-pointer"
                            style="background: linear-gradient(180deg, #fff 60%, #ecebe5 100%); border: 1px solid #003c74; border-radius: 3px;"
                            on:click={() => activeSection = 'about'}>
                            About Me
                        </button>
                    </div>
                </div>

            {:else if activeSection === 'about'}
                <!-- ABOUT -->
                <div class="flex items-center gap-2 mb-2">
                    <div class="w-[16px] h-[16px] shrink-0 bg-contain bg-no-repeat bg-center bg-[url(/images/xp/icons/Information.png)]"></div>
                    <h2 class="text-[13px] font-bold text-[#003399]">About Me</h2>
                </div>
                <div class="h-[2px] w-full mb-3" style="background: linear-gradient(90deg, #3169c6, transparent);"></div>

                <p class="text-[11px] text-[#333] leading-relaxed mb-4">{profile?.bio || ''}</p>

                {#if profile?.education?.length}
                <fieldset class="p-3 pt-1 mb-3" style="border: 1px solid #c0c0c0;">
                    <legend class="text-[11px] font-bold text-[#003399] px-1">Education</legend>
                    {#each profile.education as edu}
                        <div class="flex items-start gap-2 mb-2">
                            <div class="w-[16px] h-[16px] shrink-0 mt-[1px] bg-contain bg-no-repeat bg-center bg-[url(/images/xp/icons/Wizard.png)]"></div>
                            <div>
                                <div class="text-[11px] font-bold text-[#333]">{edu.degree}</div>
                                <div class="text-[11px] text-[#666]">{edu.institution} &middot; {edu.period}</div>
                            </div>
                        </div>
                    {/each}
                </fieldset>
                {/if}

            {:else if activeSection === 'experience'}
                <!-- EXPERIENCE -->
                <div class="flex items-center gap-2 mb-2">
                    <div class="w-[16px] h-[16px] shrink-0 bg-contain bg-no-repeat bg-center bg-[url(/images/xp/icons/Briefcase.png)]"></div>
                    <h2 class="text-[13px] font-bold text-[#003399]">Experience</h2>
                </div>
                <div class="h-[2px] w-full mb-3" style="background: linear-gradient(90deg, #3169c6, transparent);"></div>

                {#if profile?.links?.linkedin}
                <div class="mb-3">
                    <a href="{profile.links.linkedin}" target="_blank" rel="noopener"
                        class="inline-flex items-center gap-1 text-[10px] text-[#2956b2] underline">
                        <div class="w-[12px] h-[12px] shrink-0 bg-contain bg-no-repeat bg-center bg-[url(/images/xp/icons/InternetShortcut.png)]"></div>
                        View full profile on LinkedIn
                    </a>
                </div>
                {/if}

                {#each (profile?.experience || []) as job}
                    <div class="flex gap-3 mb-3 pb-3" style="border-bottom: 1px solid #e0ddd5;">
                        <div class="w-[32px] h-[32px] shrink-0 bg-contain bg-no-repeat bg-center bg-[url(/images/xp/icons/Briefcase.png)]"></div>
                        <div class="flex-1 min-w-0">
                            <div class="text-[12px] font-bold text-[#003399]">{job.role}</div>
                            <div class="text-[11px] text-[#666] mb-1">{job.company} &middot; {job.period}</div>
                            <p class="text-[11px] text-[#333] leading-relaxed">{job.description}</p>
                        </div>
                    </div>
                {/each}

            {:else if activeSection === 'projects'}
                <!-- PROJECTS (GitHub) -->
                <div class="flex items-center gap-2 mb-2">
                    <div class="w-[16px] h-[16px] shrink-0 bg-contain bg-no-repeat bg-center bg-[url(/images/xp/icons/FolderClosed.png)]"></div>
                    <h2 class="text-[13px] font-bold text-[#003399]">Projects</h2>
                </div>
                <div class="h-[2px] w-full mb-3" style="background: linear-gradient(90deg, #3169c6, transparent);"></div>

                {#if reposLoading}
                    <div class="flex items-center gap-2 mb-3">
                        <DumbProgress style="width:120px;height:13px;"></DumbProgress>
                        <span class="text-[11px] text-[#666]">Loading repositories...</span>
                    </div>
                {:else if reposError}
                    <div class="text-[11px] text-[#333] mb-2">
                        Could not load repositories.
                        <a href="https://github.com/{GITHUB_USER}" target="_blank" rel="noopener"
                            class="text-[#2956b2] underline">View on GitHub</a>
                    </div>
                {:else}
                    <div class="mb-2">
                        <a href="https://github.com/{GITHUB_USER}" target="_blank" rel="noopener"
                            class="inline-flex items-center gap-1 text-[10px] text-[#2956b2] underline">
                            <div class="w-[12px] h-[12px] shrink-0 bg-contain bg-no-repeat bg-center bg-[url(/images/xp/icons/InternetShortcut.png)]"></div>
                            github.com/{GITHUB_USER}
                        </a>
                    </div>

                    {#each repos as repo}
                        <div class="mb-2 p-[8px]" style="border: 1px solid #c0c0c0; background: #fafafa;">
                            <div class="flex items-center justify-between mb-[3px]">
                                <a href="{repo.html_url}" target="_blank" rel="noopener"
                                    class="text-[12px] font-bold text-[#003399] underline">{repo.name}</a>
                                {#if repo.stargazers_count > 0}
                                    <span class="text-[10px] text-[#666]">&#9733; {repo.stargazers_count}</span>
                                {/if}
                            </div>
                            {#if repo.description}
                                <p class="text-[11px] text-[#333] leading-snug mb-[4px]">{repo.description}</p>
                            {/if}
                            {#if repo.language}
                                <div class="flex items-center gap-1">
                                    <div class="w-[8px] h-[8px]"
                                        style="background: {langColors[repo.language] || '#999'}; border: 1px solid #aca899;"></div>
                                    <span class="text-[10px] text-[#555]">{repo.language}</span>
                                </div>
                            {/if}
                        </div>
                    {/each}
                {/if}

            {:else if activeSection === 'skills'}
                <!-- SKILLS -->
                <div class="flex items-center gap-2 mb-2">
                    <div class="w-[16px] h-[16px] shrink-0 bg-contain bg-no-repeat bg-center bg-[url(/images/xp/icons/Properties.png)]"></div>
                    <h2 class="text-[13px] font-bold text-[#003399]">Skills</h2>
                </div>
                <div class="h-[2px] w-full mb-3" style="background: linear-gradient(90deg, #3169c6, transparent);"></div>

                {#each Object.entries(profile?.skills || {}) as [category, items]}
                    <fieldset class="mb-3 p-3 pt-1" style="border: 1px solid #c0c0c0;">
                        <legend class="text-[11px] font-bold text-[#003399] px-1">{category}</legend>
                        <div class="flex flex-wrap gap-[6px]">
                            {#each items as skill}
                                <span class="text-[11px] text-[#333] px-[6px] py-[2px]"
                                    style="background: #ece9d8; border: 1px solid #aca899;">{skill}</span>
                            {/each}
                        </div>
                    </fieldset>
                {/each}

            {:else if activeSection === 'contact'}
                <!-- CONTACT -->
                <div class="flex items-center gap-2 mb-2">
                    <div class="w-[16px] h-[16px] shrink-0 bg-contain bg-no-repeat bg-center bg-[url(/images/xp/icons/AddressBook.png)]"></div>
                    <h2 class="text-[13px] font-bold text-[#003399]">Contact</h2>
                </div>
                <div class="h-[2px] w-full mb-3" style="background: linear-gradient(90deg, #3169c6, transparent);"></div>

                <p class="text-[11px] text-[#333] mb-4 leading-relaxed">
                    Feel free to reach out. I'm always open to discussing new projects, ideas, or opportunities.
                </p>

                <fieldset class="p-3 pt-1" style="border: 1px solid #c0c0c0;">
                    <legend class="text-[11px] font-bold text-[#003399] px-1">Contact Information</legend>

                    {#if profile?.links?.email}
                    <a href="mailto:{profile.links.email}" class="flex items-center gap-2 mb-2">
                        <div class="w-[16px] h-[16px] shrink-0 bg-contain bg-no-repeat bg-center bg-[url(/images/xp/icons/Email.png)]"></div>
                        <span class="text-[11px] text-[#2956b2] underline">{profile.links.email}</span>
                    </a>
                    {/if}

                    {#if profile?.links?.github}
                    <a href="{profile.links.github}" target="_blank" rel="noopener" class="flex items-center gap-2 mb-2">
                        <div class="w-[16px] h-[16px] shrink-0 bg-contain bg-no-repeat bg-center bg-[url(/images/xp/icons/InternetShortcut.png)]"></div>
                        <span class="text-[11px] text-[#2956b2] underline">{profile.links.github}</span>
                    </a>
                    {/if}

                    {#if profile?.links?.linkedin}
                    <a href="{profile.links.linkedin}" target="_blank" rel="noopener" class="flex items-center gap-2">
                        <div class="w-[16px] h-[16px] shrink-0 bg-contain bg-no-repeat bg-center bg-[url(/images/xp/icons/InternetShortcut.png)]"></div>
                        <span class="text-[11px] text-[#2956b2] underline">{profile.links.linkedin}</span>
                    </a>
                    {/if}
                </fieldset>
            {/if}

        </div>
    </div>
</Window>

<svelte:options accessors={true}></svelte:options>
