import { env } from '$env/dynamic/private';
import { cached } from '$lib/server/cache';

// Needs STEAM_API_KEY (https://steamcommunity.com/dev/apikey) and STEAM_ID
// (SteamID64 or the custom name from steamcommunity.com/id/<name>).
// The Steam profile and "Game details" must be public.

const API = 'https://api.steampowered.com';
const TTL = 5 * 60 * 1000;

const PERSONA_STATES = ['offline', 'online', 'busy', 'away', 'snooze', 'online', 'online'];

async function steam_get(path, params) {
    const query = new URLSearchParams({ key: env.STEAM_API_KEY, format: 'json', ...params });
    const res = await fetch(`${API}/${path}?${query}`);
    if (!res.ok) throw new Error(`Steam ${path} returned ${res.status}`);
    return res.json();
}

async function resolve_steam_id(id) {
    if (/^\d{17}$/.test(id)) return id;
    const data = await steam_get('ISteamUser/ResolveVanityURL/v1/', { vanityurl: id });
    if (data?.response?.success !== 1) throw new Error(`Could not resolve Steam name "${id}"`);
    return data.response.steamid;
}

const hours = minutes => Math.round(((minutes || 0) / 60) * 10) / 10;

async function load_steam() {
    const steamid = await resolve_steam_id(env.STEAM_ID.trim());

    const [summary, recent, owned] = await Promise.all([
        steam_get('ISteamUser/GetPlayerSummaries/v2/', { steamids: steamid }),
        steam_get('IPlayerService/GetRecentlyPlayedGames/v1/', { steamid, count: 5 }),
        steam_get('IPlayerService/GetOwnedGames/v1/', { steamid, include_appinfo: 1, include_played_free_games: 1 })
    ]);

    const player = summary?.response?.players?.[0];
    if (!player) throw new Error('Steam profile not found');

    const playing = player.gameextrainfo
        ? { name: player.gameextrainfo, appid: Number(player.gameid) || null }
        : null;

    const owned_games = owned?.response?.games || [];

    return {
        configured: true,
        profile: {
            name: player.personaname,
            url: player.profileurl,
            avatar: player.avatarfull,
            state: playing ? 'in-game' : (PERSONA_STATES[player.personastate] || 'offline'),
            playing
        },
        recent: (recent?.response?.games || []).map(g => ({
            appid: g.appid,
            name: g.name,
            hours_2weeks: hours(g.playtime_2weeks),
            hours_total: hours(g.playtime_forever)
        })),
        top: [...owned_games]
            .sort((a, b) => b.playtime_forever - a.playtime_forever)
            .slice(0, 5)
            .map(g => ({ appid: g.appid, name: g.name, hours_total: hours(g.playtime_forever) })),
        game_count: owned?.response?.game_count ?? owned_games.length,
        updated_at: Date.now()
    };
}

export async function GET() {
    if (!env.STEAM_API_KEY || !env.STEAM_ID) {
        return { status: 200, body: { configured: false } };
    }
    try {
        const data = await cached('steam', TTL, load_steam);
        return {
            status: 200,
            headers: { 'cache-control': 'public, max-age=60' },
            body: data
        };
    } catch (error) {
        console.error('[api/steam]', error.message);
        return { status: 502, body: { configured: true, error: 'Steam is unavailable right now' } };
    }
}
