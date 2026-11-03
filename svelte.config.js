import fs from 'fs';
import preprocess from "svelte-preprocess";
import adapterNode from '@sveltejs/adapter-node';
import adapterVercel from '@sveltejs/adapter-vercel';

// adapter-vercel adds "clean URL" redirects for every path: /html/jspaint/index.html
// becomes /html/jspaint (no trailing slash). The apps in static/html (Paint, Word,
// Notepad, Photon) load their files with relative paths, so after that redirect they
// all 404, the apps never start, and their windows can't even be closed.
// Drop those redirects; SvelteKit already handles trailing slashes on its own routes.
function vercel() {
  const base = adapterVercel();
  return {
    ...base,
    async adapt(builder) {
      await base.adapt(builder);
      const file = '.vercel/output/config.json';
      const config = JSON.parse(fs.readFileSync(file, 'utf8'));
      config.routes = config.routes.filter(route => !(route.status == 308 && route.src?.startsWith('^/')));
      fs.writeFileSync(file, JSON.stringify(config, null, '\t'));
    }
  };
}

// Vercel sets VERCEL=1 during its builds. There the app is deployed as Vercel
// functions (the /api routes need a server); everywhere else it builds the
// Node server in /build (PM2 + NGINX).
const adapter = process.env.VERCEL
  ? vercel()
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
