import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl =
  process.env.REDIS_URL ||
  process.env.REDIS_PRIVATE_URL ||
  process.env.UPSTASH_REDIS_URL ||
  null;

let client: Redis | null = null;
const memoryStore: Record<string, string> = {};

if (redisUrl) {
  try {
    client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 2000);
        return delay;
      },
      tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    });

    client.on('connect', () => {
      console.log('[Redis] Connected successfully to external Redis instance.');
    });

    client.on('error', (err) => {
      console.warn('[Redis Error]:', err.message);
    });
  } catch (err: any) {
    console.warn('[Redis] Initialization failed, falling back to memory cache:', err.message);
    client = null;
  }
} else {
  console.log('[Redis] No REDIS_URL configured. Running in decoupled fallback memory cache mode.');
}

export const RedisState = {
  isConfigured(): boolean {
    return !!client && client.status === 'ready';
  },

  async get<T = any>(key: string): Promise<T | null> {
    try {
      if (client && client.status === 'ready') {
        const val = await client.get(key);
        return val ? JSON.parse(val) : null;
      }
    } catch (err: any) {
      console.warn(`[Redis get error for ${key}]:`, err.message);
    }
    const mem = memoryStore[key];
    return mem ? JSON.parse(mem) : null;
  },

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    try {
      if (client && client.status === 'ready') {
        if (ttlSeconds && ttlSeconds > 0) {
          await client.set(key, serialized, 'EX', ttlSeconds);
        } else {
          await client.set(key, serialized);
        }
        return;
      }
    } catch (err: any) {
      console.warn(`[Redis set error for ${key}]:`, err.message);
    }
    memoryStore[key] = serialized;
  },

  async del(key: string): Promise<void> {
    try {
      if (client && client.status === 'ready') {
        await client.del(key);
      }
    } catch (err: any) {
      console.warn(`[Redis del error for ${key}]:`, err.message);
    }
    delete memoryStore[key];
  },

  // Save or update an active room
  async saveRoom(roomCode: string, room: any, ttlSeconds = 86400): Promise<void> {
    const key = `thaasbai:room:${roomCode.trim().toUpperCase()}`;
    await this.set(key, room, ttlSeconds);
  },

  async getRoom(roomCode: string): Promise<any | null> {
    const key = `thaasbai:room:${roomCode.trim().toUpperCase()}`;
    return this.get(key);
  },

  // Session token mapping (maps client session UUID to roomCode & seatIndex)
  async saveClientSession(
    sessionToken: string,
    session: { roomCode: string; seatIndex: number; profileId: string; joinedAt: string },
    ttlSeconds = 86400
  ): Promise<void> {
    const key = `thaasbai:session:${sessionToken.trim()}`;
    await this.set(key, session, ttlSeconds);
  },

  async getClientSession(sessionToken: string): Promise<{ roomCode: string; seatIndex: number; profileId: string; joinedAt: string } | null> {
    const key = `thaasbai:session:${sessionToken.trim()}`;
    return this.get(key);
  },

  async deleteClientSession(sessionToken: string): Promise<void> {
    const key = `thaasbai:session:${sessionToken.trim()}`;
    await this.del(key);
  },
};
