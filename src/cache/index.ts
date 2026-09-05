import { LRUCache } from "lru-cache";
import { Redis } from "ioredis";
import { config } from "../config/index.js";

class CacheService {
  private memoryCache: LRUCache<string, string>;
  private redisClient: Redis | null = null;
  private isRedisAvailable = false;

  constructor() {
    // High-performance LRU memory cache
    this.memoryCache = new LRUCache<string, string>({
      max: config.CACHE_MAX_ITEMS,
      ttl: config.CACHE_TTL_SECONDS * 1000,
    });

    if (config.REDIS_URL) {
      try {
        this.redisClient = new Redis(config.REDIS_URL, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          retryStrategy(times: number) {
            if (times > 3) return null; // stop reconnecting after 3 retries
            return Math.min(times * 100, 2000);
          },
        });

        this.redisClient.on("connect", () => {
          this.isRedisAvailable = true;
          console.log("⚡ Redis cache connected successfully.");
        });

        this.redisClient.on("error", (_err: unknown) => {
          this.isRedisAvailable = false;
          // Silent fallback to in-memory LRU
        });

        this.redisClient.connect().catch(() => {
          this.isRedisAvailable = false;
        });
      } catch {
        this.isRedisAvailable = false;
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    // 1. Check L1 Memory Cache (sub-millisecond)
    const memVal = this.memoryCache.get(key);
    if (memVal) {
      try {
        return JSON.parse(memVal) as T;
      } catch {
        return null;
      }
    }

    // 2. Check L2 Redis Cache if enabled & healthy
    if (this.isRedisAvailable && this.redisClient) {
      try {
        const redisVal = await this.redisClient.get(key);
        if (redisVal) {
          // Populate L1 cache for subsequent lookups
          this.memoryCache.set(key, redisVal);
          return JSON.parse(redisVal) as T;
        }
      } catch {
        // Fallback silently if Redis query fails
      }
    }

    return null;
  }

  async set(key: string, value: unknown, ttlSeconds = config.CACHE_TTL_SECONDS): Promise<void> {
    const serialized = JSON.stringify(value);

    // Save to L1 Memory Cache
    this.memoryCache.set(key, serialized, { ttl: ttlSeconds * 1000 });

    // Save to L2 Redis Cache if available
    if (this.isRedisAvailable && this.redisClient) {
      try {
        await this.redisClient.set(key, serialized, "EX", ttlSeconds);
      } catch {
        // Ignore redis set failure, memory cache holds it
      }
    }
  }

  async del(key: string): Promise<void> {
    this.memoryCache.delete(key);
    if (this.isRedisAvailable && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch {
        // Ignore
      }
    }
  }

  getStats() {
    return {
      type: this.isRedisAvailable ? "Tiered (LRU + Redis)" : "In-Memory LRU",
      memoryItems: this.memoryCache.size,
      maxItems: this.memoryCache.max,
      ttlSeconds: config.CACHE_TTL_SECONDS,
      redisConnected: this.isRedisAvailable,
    };
  }

  async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

export const cacheService = new CacheService();
