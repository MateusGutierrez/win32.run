<script>
    // Windows XP (Luna) Explorer task pane: collapsible panels on a blue gradient.
    // sections: [{ title, items?: [{ name, icon, action, disabled }], details?: { image, image_class, title, lines: [] } }]
    export let sections = [];
    export let width = 200;

    let collapsed = {};
</script>

<div class="task-pane shrink-0 overflow-y-auto overflow-x-hidden" style:width="{width}px">
    {#each sections as section}
        <div class="panel">
            <button class="panel-header" on:click={() => collapsed[section.title] = !collapsed[section.title]}
                title={collapsed[section.title] ? 'Expand' : 'Collapse'}>
                <span>{section.title}</span>
                <span class="chevron {collapsed[section.title] ? 'down' : ''}">
                    <svg viewBox="0 0 10 10" width="9" height="9">
                        <path d="M1 5 L5 1 L9 5 M1 9 L5 5 L9 9" fill="none" stroke="currentColor" stroke-width="1.6"/>
                    </svg>
                </span>
            </button>

            {#if !collapsed[section.title]}
                <div class="panel-body">
                    {#if section.details}
                        {#if section.details.image}
                            <img src={section.details.image} alt="" class="details-image {section.details.image_class || ''}">
                        {/if}
                        {#if section.details.title}<b class="details-title">{section.details.title}</b>{/if}
                        {#each (section.details.lines || []) as line}
                            <span class="details-line">{line}</span>
                        {/each}
                    {/if}
                    {#each (section.items || []) as item}
                        <button class="task" disabled={item.disabled} on:click={() => !item.disabled && item.action?.()}>
                            {#if item.icon}<img src="/images/xp/icons/{item.icon}" alt="" class="w-[16px] h-[16px] shrink-0">{/if}
                            <span>{item.name}</span>
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    {/each}
</div>

<style>
    .task-pane {
        background: linear-gradient(180deg, #7ba2e7 0%, #6375d6 100%);
        padding: 12px 12px 12px 12px;
        font-family: 'MSSS', Tahoma, Arial, sans-serif;
        font-size: 11px;
    }

    .panel + .panel {
        margin-top: 12px;
    }

    .panel-header {
        width: 100%;
        height: 25px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 4px 0 12px;
        border: 0;
        border-radius: 3px 3px 0 0;
        background: linear-gradient(90deg, #fff 0%, #c6d3f7 100%);
        color: #215dc6;
        font-weight: bold;
        text-align: left;
        cursor: pointer;
    }

    .panel-header:hover {
        color: #428eff;
    }

    .chevron {
        width: 17px;
        height: 17px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(circle at 40% 35%, #fff 0%, #fff 45%, #d6dff7 100%);
        border: 1px solid #b3c4ee;
        box-shadow: 0 1px 1px rgba(0, 0, 60, 0.25);
    }

    .chevron.down svg {
        transform: rotate(180deg);
    }

    .panel-body {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 10px 12px;
        background: #d6dff7;
        border: 1px solid #fff;
        border-top: 0;
        color: #000;
    }

    .task {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        border: 0;
        background: transparent;
        padding: 0;
        text-align: left;
        color: #215dc6;
        cursor: pointer;
        line-height: 16px;
    }

    .task:hover:not(:disabled) span {
        color: #428eff;
        text-decoration: underline;
    }

    .task:disabled {
        color: #8299d6;
        cursor: default;
    }

    .details-image {
        width: 100%;
        max-width: 160px;
        border: 1px solid #fff;
        box-shadow: 0 0 0 1px #7f9db9;
        object-fit: cover;
        margin-bottom: 4px;
    }

    .details-image.avatar {
        width: 64px;
        height: 64px;
    }

    .details-title {
        font-weight: bold;
        word-break: break-word;
    }

    .details-line {
        word-break: break-word;
    }
</style>
