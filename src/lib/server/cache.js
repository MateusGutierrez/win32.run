// Tiny in-memory cache for API routes (single PM2 process, so memory is enough).
// - Dedupes concurrent requests for the same key.
// - If a refresh fails, serves the last good value instead of an error.
// - Failures with no good value are remembered for 30s.

const store = new Map();

export async function cached(key, ttl_ms, fn) {
    const entry = store.get(key);
    const now = Date.now();

    if (entry?.value !== undefined && entry.expires > now) return entry.value;
    if (entry?.error && entry.expires > now) throw entry.error;
    if (entry?.pending) return entry.pending;

    const pending = (async () => {
        try {
            const value = await fn();
            store.set(key, { value, expires: Date.now() + ttl_ms });
            return value;
        } catch (error) {
            if (entry?.value !== undefined) {
                // Keep the stale value for a short while before trying again
                store.set(key, { value: entry.value, expires: Date.now() + Math.min(ttl_ms, 60_000) });
                return entry.value;
            }
            // Remember the failure briefly so every visitor doesn't retry the upstream API
            store.set(key, { error, expires: Date.now() + 30_000 });
            throw error;
        }
    })();

    store.set(key, { ...entry, pending });
    return pending;
}
