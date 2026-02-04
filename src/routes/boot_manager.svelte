<script> 
    import { onMount, createEventDispatcher } from 'svelte';
    import * as utils from '../lib/utils';
    let dispatcher = createEventDispatcher();

    let is_chromium = true;
    onMount(() => {
        //load jquery
        loadjs([
            'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.1/jquery.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.13.2/jquery-ui.min.js',
            'https://code.jquery.com/ui/1.13.2/themes/base/jquery-ui.css'
        ], {async: false});
        
        utils.set_theme('none');
        is_chromium = window.chrome != null;
        utils.set_installing_windows(false);
        dispatcher('load_page', {url: './xp/starting.svelte'});
    })
</script>

<div class="w-screen h-screen bg-black overflow-hidden font-MSSS">
</div>


<svelte:window />