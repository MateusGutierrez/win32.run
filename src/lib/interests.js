// Shared loaders for the portfolio, "My Music" and "My Games" windows.
// Short in-memory caching keeps several open windows from repeating the same requests.
import axios from 'axios';

const cache = new Map();

async function cached_get(url, ttl_ms) {
    const hit = cache.get(url);
    if (hit && hit.expires > Date.now()) return hit.promise;

    const promise = axios.get(url).then(res => res.data).catch(() => null);
    cache.set(url, { promise, expires: Date.now() + ttl_ms });
    return promise;
}

export async function fetch_profile() {
    return cached_get('/json/portfolio.json', 5 * 60 * 1000);
}

// null when Spotify isn't configured or is unavailable
export async function fetch_spotify() {
    const data = await cached_get('/api/spotify', 5 * 60 * 1000);
    return data?.configured && !data.error ? data : null;
}

// null when Steam isn't configured or is unavailable
export async function fetch_steam() {
    const data = await cached_get('/api/steam', 60 * 1000);
    return data?.configured && !data.error ? data : null;
}

export function steam_cover(game) {
    if (game?.cover) return game.cover;
    if (game?.appid) return `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.appid}/header.jpg`;
    return null;
}

// https://open.spotify.com/playlist/ID?si=... -> https://open.spotify.com/embed/playlist/ID
export function spotify_embed_url(url, compact = false) {
    if (!url) return null;
    if (url.includes('/embed/')) return url;
    const match = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album|artist|track|show|episode)\/([A-Za-z0-9]+)/);
    return match ? `https://open.spotify.com/embed/${match[1]}/${match[2]}?theme=0${compact ? '&size=compact' : ''}` : null;
}

export function format_ms(ms) {
    const total = Math.floor((ms || 0) / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function format_date(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function time_ago(iso) {
    const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function format_hours(hours) {
    return Number(hours || 0).toLocaleString('en-US');
}
