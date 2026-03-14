import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private redis: Redis;

    constructor(private readonly configService: ConfigService) {}

    onModuleInit() {
        const redisUrl = this.configService.get<string>('REDIS_URL');
        
        // Fallback to direct connection if no SENTINEL
        this.redis = new Redis(redisUrl || "redis://localhost:6379", { 
            keyPrefix: "app:" 
        });

        // Add event listeners for connection management
        this.redis.on("connect", () => {
            console.log("Redis connected successfully");
        });

        this.redis.on("ready", () => {
            console.log("Redis ready to receive commands");
        });

        this.redis.on("error", (err) => {
            console.error("Redis connection error:", err);
        });

        this.redis.on("close", () => {
            console.log("Redis connection closed");
        });

        this.redis.on("reconnecting", () => {
            console.log("Redis reconnecting...");
        });
    }

    onModuleDestroy() {
        this.redis.quit();
    }

    /*
    config.ttl: number format in seconds
    */
    async set<T = any>(key: string, object: T | undefined | null, config?: { ttl?: number }) {
        if (config?.ttl) {
            await this.redis.set(key, JSON.stringify(object), "EX", config.ttl);
        } else {
            await this.redis.set(key, JSON.stringify(object));
        }
    }

    async get<T = any>(key: string, defaultValue?: T): Promise<T | undefined | null> {
        const data = await this.redis.get(key);
        return data ? (JSON.parse(data) as T) : defaultValue;
    }

    async del(key: string): Promise<boolean> {
        const res = await this.redis.del(key);
        return res == 1;
    }

    async delArr(key: string[]): Promise<number> {
        const res = await this.redis.del(key);
        return res;
    }
    async addKeyToSet(setKey: string, key: string): Promise<void> {
        await this.redis.sadd(setKey, key);
    }

    async getKeysFromSet(setKey: string): Promise<string[]> {
        return this.redis.smembers(setKey);
    }

    async clearCacheBySet(setKey: string): Promise<void> {
        const keys = await this.redis.smembers(setKey);
        if (keys.length > 0) await this.redis.del(...keys);
        await this.redis.del(setKey);
    }
    async delByPattern(pattern: string): Promise<number> {
        const keys = await this.redis.keys(pattern);
        if (keys.length === 0) return 0;

        const pipeline = this.redis.pipeline();
        keys.forEach((key) => pipeline.del(key));
        const results = await pipeline.exec();

        return results.filter(([err]) => !err).length;
    }

    async iget<T = any, Z extends string | number = string | number>(
        key: string,
        id: Z,
        defaultValue?: T,
        config: { hasTTL: boolean } = { hasTTL: false }
    ): Promise<T | undefined | null> {
        if (config.hasTTL) return await this.get(`${key}:${id}`, defaultValue);
        const data = await this.redis.hget(key, id.toString());
        return data ? (JSON.parse(data) as T) : defaultValue;
    }

    async iset<T = any, Z extends string | number = string | number>(key: string, id: Z, object: T | undefined | null, config?: { ttl?: number }) {
        if (config?.ttl) {
            return await this.set(`${key}:${id}`, object, config);
        }
        return await this.redis.hset(key, id, JSON.stringify(object));
    }

    async hGet<T = any>(key: string, id: string, defaultValue?: T): Promise<T | undefined | null> {
        const data = await this.redis.hget(key, id);
        return data ? (JSON.parse(data) as T) : defaultValue;
    }

    // eslint-disable-next-line
    async hGetAll<T = any>(key: string, defaultValue?: T): Promise<any> {
        return this.redis.hgetall(key);
    }

    async hSet<T = any>(key: string, id: string, object: T | undefined | null, ttlInSecond?: number): Promise<boolean> {
        let success = true;
        const chain = this.redis.multi().hset(key, id, JSON.stringify(object));

        if (ttlInSecond) {
            chain.expire(key, ttlInSecond);
        }

        await chain.exec().catch((err) => {
            success = false;
            console.log("hSet error", err);
        });

        return success;
    }

    async hmSet(key: string, object: object, ttlInSecond?: number): Promise<boolean> {
        let success = true;
        const chain = this.redis.multi().hmset(key, object);

        if (ttlInSecond) {
            chain.expire(key, ttlInSecond);
        }

        await chain.exec().catch((err) => {
            success = false;
            console.log("mSet error", err);
        });

        return success;
    }

    async lPush<T = any>(key: string, object: T | undefined | null, ttlInSecond?: number): Promise<boolean> {
        let success = true;
        const chain = this.redis.multi().lpush(key, JSON.stringify(object));

        if (ttlInSecond) {
            chain.expire(key, ttlInSecond);
        }

        await chain.exec().catch((err) => {
            success = false;
            console.log("lPush error", err);
        });

        return success;
    }

    async rPush<T = any>(key: string, object: T | undefined | null, ttlInSecond?: number): Promise<boolean> {
        let success = true;
        const chain = this.redis.multi().rpush(key, JSON.stringify(object));

        if (ttlInSecond) {
            chain.expire(key, ttlInSecond);
        }

        await chain.exec().catch((err) => {
            success = false;
            console.log("rPush error", err);
        });

        return success;
    }

    async lTrim(key: string, start: number, stop: number): Promise<boolean> {
        let success = true;
        await this.redis.ltrim(key, start, stop).catch((err) => {
            success = false;
            console.log("lTrim error", err);
        });
        return success;
    }

    async lRange<T = any>(key: string, start: number, end: number): Promise<T[]> {
        const data = await this.redis.lrange(key, start, end);
        return data.map((v) => JSON.parse(v));
    }

    async lRem<T = any>(key: string, object: T | undefined | null): Promise<boolean> {
        let success = true;
        await this.redis
            .multi()
            .lrem(key, 0, JSON.stringify(object))
            .exec()
            .catch((err) => {
                success = false;
                console.log("lRem error", err);
            });

        return success;
    }

    async incrBy(key: string, increment: number) {
        return this.redis.incrby(key, increment);
    }

    async incr(key: string): Promise<number> {
        return this.redis.incr(key);
    }

    async decr(key: string): Promise<number> {
        return this.redis.decr(key);
    }

    async try<A, T = A>(key: string, config: { ttl: number } = { ttl: 600 }, f: () => Promise<A>) {
        let data = await this.get<T>(key);
        if (!data) {
            data = (await f()) as any;
            if (data) await this.set(key, data, config);
        }
        return data as T;
    }

    async itry<A, T = A, Z extends string | number = string | number>(key: string, id: Z, f: (id: Z) => Promise<A>, config?: { ttl?: number }) {
        let data = await this.iget<T>(key, id, undefined, {
            hasTTL: Boolean(config?.ttl)
        });

        if (!data) {
            data = (await f(id)) as any;
            if (data) await this.iset(key, id, data, config);
        }
        return data as T;
    }

    async lock(key: string, ttlInSecond: number = 20): Promise<boolean> {
        const lockKey = await this.getLockKey(key);

        let success = false;
        await this.redis
            .multi()
            .setnx(lockKey, lockKey)
            .expire(lockKey, ttlInSecond)
            .exec((err, results) => {
                if (err) {
                    return;
                }

                success = results![0][1]! == 1;
            });

        return success;
    }

    async keys(pattern: string): Promise<string[]> {
        return this.redis.keys(pattern);
    }

    async unlock(key: string): Promise<boolean> {
        const lockKey = await this.getLockKey(key);
        const res = await this.redis.del(lockKey);
        if (res == 1) {
            return true;
        }

        return false;
    }

    async getLockKey(key: string): Promise<string> {
        return `cache:lock:${key}`;
    }

    async zadd(key: string, score: number, member: string): Promise<number> {
        return this.redis.zadd(key, score, member);
    }

    async zincrby(key: string, score: number, member: string): Promise<string> {
        return this.redis.zincrby(key, score, member);
    }
    async hIncrByFloat(key: string, field: string, increment: number): Promise<number> {
        try {
            const result = await this.redis.hincrbyfloat(key, field, increment);
            return Number(result);
        } catch (err) {
            console.error("hIncrByFloat error:", err);
            throw err;
        }
    }

    async zrevrange(key: string, start: number, stop: number, withScores: boolean = false): Promise<string[] | Array<{ member: string; score: number }>> {
        const result = await this.redis.zrevrange(key, start, stop, "WITHSCORES");

        if (!withScores) {
            return result.filter((_, index) => index % 2 === 0);
        }

        const formattedResult = [];
        for (let i = 0; i < result.length; i += 2) {
            formattedResult.push({
                member: result[i],
                score: parseFloat(result[i + 1])
            });
        }
        return formattedResult;
    }

    async zrevrank(key: string, member: string): Promise<number | null> {
        const rank = await this.redis.zrevrank(key, member);
        return rank !== null ? rank : null;
    }

    // New method to get a member's score in a sorted set
    async zscore(key: string, member: string): Promise<number | null> {
        const score = await this.redis.zscore(key, member);
        return score !== null ? parseFloat(score) : null;
    }

    async zCard(key: string): Promise<number> {
        return this.redis.zcard(key);
    }

    async zRange(key: string, start: number, end: number): Promise<string[]> {
        return this.redis.zrange(key, start, end);
    }

    async zRem(key: string, member: string): Promise<number> {
        return this.redis.zrem(key, member);
    }

    async zRevRange(key: string, start: number, end: number): Promise<string[]> {
        return this.redis.zrevrange(key, start, end);
    }

    async hDel(key: string, field: string): Promise<number> {
        return this.redis.hdel(key, field);
    }

    async zAdd(key: string, score: number, member: string): Promise<number> {
        return this.redis.zadd(key, score, member);
    }

    async expire(key: string, ttl: number): Promise<number> {
        return this.redis.expire(key, ttl);
    }

    async zScore(key: string, member: string): Promise<string> {
        return this.redis.zscore(key, member);
    }

    async zRangeWithScores(key: string, start: number, end: number): Promise<Array<{ member: string; score: number }>> {
        const result = await this.redis.zrange(key, start, end, "WITHSCORES");
        const formattedResult = [];
        for (let i = 0; i < result.length; i += 2) {
            formattedResult.push({
                member: result[i],
                score: parseFloat(result[i + 1])
            });
        }
        return formattedResult;
    }

    async hMGet(key: string, fields: string[]): Promise<string[]> {
        return this.redis.hmget(key, ...fields);
    }

    /**
     * Increment a field in a hash by a specified value
     * @param key - The hash key
     * @param field - The field name in the hash
     * @param increment - The value to increment by (default: 1)
     * @returns The new value of the field after increment
     */
    async hIncrBy(key: string, field: string, increment: number = 1): Promise<number> {
        return this.redis.hincrby(key, field, increment);
    }
    async zRangeByScore(key: string, min: number, max: number): Promise<string[]> {
        return this.redis.zrangebyscore(key, min, max);
    }

    pipeline() {
        return this.redis.pipeline();
    }

    /**
     * Gracefully close the Redis connection
     */
    async close(): Promise<void> {
        await this.redis.quit();
    }

    /**
     * Get Redis connection status
     */
    getConnectionStatus(): string {
        return this.redis.status;
    }

    /**
     * Execute Lua script with keys and arguments
     */
    async evalScript(script: string, keys: string[], args: (string | number)[]): Promise<any> {
        return await this.redis.eval(script, keys.length, ...keys, ...args);
    }

    /**
     * Load Lua script and return SHA
     */
    async loadScript(script: string): Promise<string> {
        return (await this.redis.script("LOAD", script)) as string;
    }

    /**
     * Execute Lua script by SHA
     */
    async evalSha(sha: string, keys: string[], args: (string | number)[]): Promise<any> {
        return await this.redis.evalsha(sha, keys.length, ...keys, ...args);
    }

    async zcount(key: string, min: number, max: number): Promise<number> {
        return this.redis.zcount(key, min, max);
    }
    async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
        return this.redis.zremrangebyscore(key, min, max);
    }

    async ttl(key: string): Promise<number> {
        return await this.redis.ttl(key);
    }
    /**
     * Kiểm tra key có tồn tại không
     */
    async exists(key: string): Promise<boolean> {
        const result = await this.redis.exists(key);
        return result === 1;
    }

    async lLen(key: string): Promise<number> {
        return this.redis.llen(key);
    }
    async mGet(keys): Promise<any[]> {
        return this.redis.mget(keys);
    }
}
