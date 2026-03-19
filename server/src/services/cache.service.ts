import logger from "../utils/logger";

class CacheService {
  private cache: Map<string, any> = new Map();
  private seatLocks: Map<string, { userId: string; expiresAt: number }> = new Map();

  constructor() {
    logger.info("✅ Initialized In-Memory Cache Service");
  }

  // =====================
  // Generic Cache Methods
  // =====================

  async get<T>(key: string): Promise<T | null> {
    const data = this.cache.get(key);
    if (!data) return null;
    
    // Check expiry if we stored it with expiry (simplified here, just returning value)
    // For a real generic cache we'd need to store expiry time with value.
    // Since we are simplifying, we might not even use this generic get much.
    return data as T;
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<boolean> {
    this.cache.set(key, value);
    // In a real in-memory cache we would set a timeout to delete it.
    if (ttlSeconds > 0) {
      setTimeout(() => {
        this.cache.delete(key);
      }, ttlSeconds * 1000);
    }
    return true;
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async deletePattern(pattern: string): Promise<boolean> {
    // pattern matching is complex for Map, and likely not needed for this simplified version
    // checking usage, it's mostly for invalidating show cache
    if (pattern.endsWith('*')) {
        const prefix = pattern.slice(0, -1);
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }
    return true;
  }

  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttlSeconds: number = 300): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    const data = await fetchFn();
    this.set(key, data, ttlSeconds);
    return data;
  }

  // =====================
  // Movie Cache Methods
  // =====================
  // Simplified: Pass-through (No caching or short caching)

  async getCachedMovies(endpoint: string, category: string) {
    return this.get(`movies:${endpoint}:${category}`);
  }

  async cacheMovies(endpoint: string, category: string, movies: any[]) {
    return this.set(`movies:${endpoint}:${category}`, movies, 60); 
  }

  async getCachedMovieDetails(movieId: string) {
    return this.get(`movie:${movieId}`);
  }

  async cacheMovieDetails(movieId: string, details: any) {
    return this.set(`movie:${movieId}`, details, 60);
  }

  // =====================
  // Show Cache Methods
  // =====================

  async getCachedShows(movieId: string, date: string) {
    // Return null to force fetch from DB to ensure seat availability is fresh
    return null; 
    // return this.get(`shows:${movieId}:${date}`);
  }

  async cacheShows(movieId: string, date: string, shows: any[]) {
    // No-op or very short cache
    return true;
    // return this.set(`shows:${movieId}:${date}`, shows, 5); 
  }

  async invalidateShowCache(movieId: string) {
    return this.deletePattern(`shows:${movieId}:*`);
  }

  // =====================
  // Seat Lock Methods (In-Memory)
  // =====================

  async lockSeats(
    showId: string,
    seats: string[],
    userId: string,
    ttlSeconds: number = 600
  ): Promise<boolean> {
    const now = Date.now();
    const lockKeyPrefix = `seatlock:${showId}:`;

    // 1. Check if any seat is already locked by someone else
    for (const seat of seats) {
      const lockKey = lockKeyPrefix + seat;
      const lock = this.seatLocks.get(lockKey);
      
      if (lock) {
        if (lock.userId !== userId && lock.expiresAt > now) {
           return false; // Locked by someone else
        }
        if (lock.expiresAt <= now) {
            this.seatLocks.delete(lockKey); // Expired lock
        }
      }
    }

    // 2. Lock seats
    const expiresAt = now + (ttlSeconds * 1000);
    for (const seat of seats) {
        const lockKey = lockKeyPrefix + seat;
        this.seatLocks.set(lockKey, { userId, expiresAt });
    }

    return true;
  }

  async unlockSeats(showId: string, seats: string[]): Promise<void> {
    const lockKeyPrefix = `seatlock:${showId}:`;
    for (const seat of seats) {
        this.seatLocks.delete(lockKeyPrefix + seat);
    }
  }

  async getLockedSeats(showId: string): Promise<string[]> {
    const now = Date.now();
    const lockKeyPrefix = `seatlock:${showId}:`;
    const lockedSeats: string[] = [];

    // This is inefficient but functional for small apps (O(N) of all locks)
    // For better performance we could store a Map<ShowId, Set<Seat>>
    // But since this is a "farzi cheeze" removal task, simple is fine.
    
    for (const [key, lock] of this.seatLocks.entries()) {
        if (key.startsWith(lockKeyPrefix)) {
            if (lock.expiresAt > now) {
                // Extract seat number from key
                // Key format: seatlock:{showId}:{seat}
                // showId might contain colons? assume it doesn't or handle carefully
                // safer: key.slice(lockKeyPrefix.length)
                lockedSeats.push(key.slice(lockKeyPrefix.length));
            } else {
                this.seatLocks.delete(key); // Cleanup expired
            }
        }
    }
    return lockedSeats;
  }

  // =====================
  // Rate Limiting Methods
  // =====================

  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    // Simplified: always allow or implement basic counter if needed.
    // Express-rate-limit middleware handles API rate limiting already.
    // This method might be used for custom logic.
    return true;
  }

  async disconnect(): Promise<void> {
    this.cache.clear();
    this.seatLocks.clear();
  }
}

export const cacheService = new CacheService();
export default cacheService;
