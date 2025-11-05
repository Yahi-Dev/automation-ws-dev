import { Redis } from "@upstash/redis";

export const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export default redis;

export async function getOrSetCache<T>(
        key: string,
        fetcher: () => Promise<T>,
        ttlSeconds = 300
    ): Promise<T> {
        try {
            const cached = await redis.get(key);
            if (cached) return cached as T;
        } catch (err) {
            console.warn("Redis read error", err);
        }

        const data = await fetcher();

        try {
            await redis.set(key, data, { ex: ttlSeconds });
        } catch (err) {
            console.warn("Redis write error", err);
        }

    return data;
}
