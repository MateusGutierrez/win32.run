import { env } from '$env/dynamic/private';
import { cached } from '$lib/server/cache';

// Needs SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET and SPOTIFY_REFRESH_TOKEN.
// Get the refresh token once with: node scripts/spotify-auth.mjs

const API = 'https://api.spotify.com/v1';
// Nothing here needs to be real time: recent history every 10 min, tops and playlist every hour
const RECENT_TTL = 10 * 60 * 1000;
const TOP_TTL = 60 * 60 * 1000;

let token = { value: null, expires: 0 };
// Spotify may hand back a new refresh token; keep using the newest one while the server runs
let refresh_token = null;

async function access_token() {
    if (token.value && token.expires > Date.now()) return token.value;

    const basic = Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh_token || env.SPOTIFY_REFRESH_TOKEN })
    });
    if (!res.ok) {
        const text = await res.text();
        // Refresh tokens last 6 months from the original authorization
        const hint = text.includes('invalid_grant') ? ' (refresh token expired or revoked: run `node scripts/spotify-auth.mjs` again)' : '';
        throw new Error(`Spotify token refresh returned ${res.status}: ${text}${hint}`);
    }

    const data = await res.json();
    if (data.refresh_token) refresh_token = data.refresh_token;
    token = { value: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
    return token.value;
}

async function spotify_get(path) {
    const res = await fetch(`${API}${path}`, {
        headers: { Authorization: `Bearer ${await access_token()}` }
    });
    if (res.status === 204) return null;
    if (res.status === 401) token = { value: null, expires: 0 };
    if (!res.ok) throw new Error(`Spotify ${path} returned ${res.status}`);
    return res.json();
}

function pick_image(images, preferred = 300) {
    if (!images?.length) return null;
    const sorted = [...images].sort((a, b) => (a.width || 0) - (b.width || 0));
    return (sorted.find(i => (i.width || 0) >= preferred) || sorted[sorted.length - 1]).url;
}

function simplify_track(track) {
    if (!track) return null;
    return {
        id: track.id,
        name: track.name,
        artists: (track.artists || []).map(a => a.name).join(', '),
        album: track.album?.name,
        image: pick_image(track.album?.images, 64),
        url: track.external_urls?.spotify,
        duration_ms: track.duration_ms
    };
}

// Accepts a playlist ID or a full open.spotify.com playlist URL
function playlist_id() {
    const raw = (env.SPOTIFY_PLAYLIST_ID || '').trim();
    const match = raw.match(/playlist[/:]([A-Za-z0-9]+)/);
    return match ? match[1] : (/^[A-Za-z0-9]+$/.test(raw) ? raw : null);
}

function clean_text(html) {
    return (html || '')
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'")
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .trim();
}

async function load_recent() {
    const recent = await spotify_get('/me/player/recently-played?limit=10');
    const recent_list = (recent?.items || [])
        .filter(i => i.track)
        .map(i => ({ played_at: i.played_at, track: simplify_track(i.track) }));
    return { recent: recent_list };
}

async function load_top() {
    const [tracks, artists] = await Promise.all([
        spotify_get('/me/top/tracks?time_range=short_term&limit=10'),
        spotify_get('/me/top/artists?time_range=short_term&limit=6')
    ]);
    return {
        top_tracks: (tracks?.items || []).map(simplify_track),
        top_artists: (artists?.items || []).map(a => ({
            name: a.name,
            image: pick_image(a.images, 64),
            url: a.external_urls?.spotify
        }))
    };
}

// Playlist contents are only returned for playlists the account owns or collaborates on
async function load_playlist() {
    const id = playlist_id();
    if (!id) return { playlist: null };

    const data = await spotify_get(`/playlists/${id}`);
    if (!data) return { playlist: null };

    // Since Feb 2026 the field is `items` (each entry has `item`); older responses use `tracks` / `track`
    const page = data.items || data.tracks;
    const entries = (page?.items || [])
        .map(e => ({ added_at: e.added_at || null, track: simplify_track(e.item || e.track) }))
        .filter(e => e.track && e.track.name);

    return {
        playlist: {
            name: data.name,
            description: clean_text(data.description),
            image: pick_image(data.images, 300),
            url: data.external_urls?.spotify,
            owner: data.owner?.display_name || null,
            total: page?.total ?? entries.length,
            tracks: entries
        }
    };
}

export async function GET() {
    if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET || !env.SPOTIFY_REFRESH_TOKEN) {
        return { status: 200, body: { configured: false } };
    }

    // Load each part independently, so one failing doesn't hide the others
    const [recent, top, playlist] = await Promise.allSettled([
        cached('spotify:recent', RECENT_TTL, load_recent),
        cached('spotify:top', TOP_TTL, load_top),
        cached('spotify:playlist', TOP_TTL, load_playlist)
    ]);

    if (recent.status === 'rejected' && top.status === 'rejected' && playlist.status === 'rejected') {
        console.error('[api/spotify]', recent.reason?.message, top.reason?.message, playlist.reason?.message);
        return { status: 502, body: { configured: true, error: 'Spotify is unavailable right now' } };
    }
    if (recent.status === 'rejected') console.error('[api/spotify] recently played:', recent.reason?.message);
    if (top.status === 'rejected') console.error('[api/spotify] top items:', top.reason?.message);
    if (playlist.status === 'rejected') console.error('[api/spotify] playlist:', playlist.reason?.message);

    return {
        status: 200,
        headers: { 'cache-control': 'public, max-age=300' },
        body: {
            configured: true,
            ...(recent.status === 'fulfilled' ? recent.value : { recent: [] }),
            ...(top.status === 'fulfilled' ? top.value : { top_tracks: [], top_artists: [] }),
            ...(playlist.status === 'fulfilled' ? playlist.value : { playlist: null }),
            updated_at: Date.now()
        }
    };
}
