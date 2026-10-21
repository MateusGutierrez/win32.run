// One-time helper to get a Spotify refresh token for /api/spotify.
//
// 1. Create an app at https://developer.spotify.com/dashboard
// 2. In the app settings, add this Redirect URI: http://127.0.0.1:8888/callback
// 3. Put SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env
// 4. Run: node scripts/spotify-auth.mjs
// 5. Open the printed URL, log in, and copy the refresh token into .env

import http from 'node:http';
import fs from 'node:fs';
import crypto from 'node:crypto';

const PORT = 8888;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
const SCOPES = 'user-read-recently-played user-top-read playlist-read-private playlist-read-collaborative';

function read_dotenv() {
    try {
        return Object.fromEntries(
            fs.readFileSync('.env', 'utf8')
                .split('\n')
                .map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
                .filter(Boolean)
                .map(([, k, v]) => [k, v.replace(/^["']|["']$/g, '')])
        );
    } catch {
        return {};
    }
}

const dotenv = read_dotenv();
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || dotenv.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || dotenv.SPOTIFY_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('Missing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET (set them in .env first).');
    process.exit(1);
}

const state = crypto.randomBytes(16).toString('hex');
const auth_url = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    state
});

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, REDIRECT_URI);
    if (url.pathname !== '/callback') {
        res.writeHead(404).end();
        return;
    }

    const code = url.searchParams.get('code');
    if (url.searchParams.get('state') !== state || !code) {
        res.writeHead(400).end('Authorization failed: ' + (url.searchParams.get('error') || 'invalid state'));
        return;
    }

    const token_res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI })
    });
    const data = await token_res.json();

    if (!token_res.ok || !data.refresh_token) {
        res.writeHead(500).end('Token exchange failed. See terminal.');
        console.error('Token exchange failed:', data);
    } else {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
            .end('Done! Go back to the terminal and copy the refresh token.');
        console.log('\nAdd this line to your .env (and to the production environment):\n');
        console.log(`SPOTIFY_REFRESH_TOKEN=${data.refresh_token}\n`);
    }
    server.close();
});

server.listen(PORT, '127.0.0.1', () => {
    console.log('Open this URL in your browser and log in to Spotify:\n');
    console.log(auth_url + '\n');
});
