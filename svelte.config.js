import preprocess from "svelte-preprocess";
import adapterNode from '@sveltejs/adapter-node';
import adapterVercel from '@sveltejs/adapter-vercel';

// Vercel sets VERCEL=1 during its builds. There the app is deployed as Vercel
// functions (the /api routes need a server); everywhere else it builds the
// Node server in /build (PM2 + NGINX).
const adapter = process.env.VERCEL
  ? adapterVercel()
  : adapterNode({ out: 'build' });

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter
  },

  preprocess: [
    preprocess({
      postcss: true,
    }),
  ],
};

export default config;
