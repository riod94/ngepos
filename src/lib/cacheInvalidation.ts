import { db } from "~/db/db";

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheConfig {
  products: number;
  categories: number;
  customers: number;
  loyaltyPrograms: number;
  settings: number;
  defaultTTL: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000;

const CACHE_TTL: CacheConfig = {
  products: 10 * 60 * 1000,
  categories: 30 * 60 * 1000,
  customers: 5 * 60 * 1000,
  loyaltyPrograms: 15 * 60 * 1000,
  settings: 60 * 60 * 1000,
  defaultTTL: DEFAULT_TTL_MS,
};

class CacheInvalidationService {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private listeners: Map<string, Set<(key: string) => void>> = new Map();

  getTTL(entityType: keyof CacheConfig): number {
    return CACHE_TTL[entityType] || CACHE_TTL.defaultTTL;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.guessTTL(key),
    };
    this.memoryCache.set(key, entry as CacheEntry);
  }

  get<T>(key: string): T | null {
    const entry = this.memoryCache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.invalidate(key);
      return null;
    }

    return entry.data;
  }

  invalidate(key: string): void {
    this.memoryCache.delete(key);
    this.notifyListeners(key);
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    const keysToInvalidate: string[] = [];

    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        keysToInvalidate.push(key);
      }
    }

    keysToInvalidate.forEach((key) => this.invalidate(key));
  }

  invalidateEntity(entityType: keyof CacheConfig): void {
    this.invalidatePattern(`^${entityType}:`);
  }

  invalidateAll(): void {
    const keys = Array.from(this.memoryCache.keys());
    keys.forEach((key) => this.invalidate(key));
  }

  onInvalidate(entityType: string, callback: (key: string) => void): () => void {
    if (!this.listeners.has(entityType)) {
      this.listeners.set(entityType, new Set());
    }
    this.listeners.get(entityType)!.add(callback);

    return () => {
      this.listeners.get(entityType)?.delete(callback);
    };
  }

  private notifyListeners(key: string): void {
    const entityType = key.split(":")[0];
    const callbacks = this.listeners.get(entityType);
    if (callbacks) {
      callbacks.forEach((cb) => cb(key));
    }
  }

  private guessTTL(key: string): number {
    const entityType = key.split(":")[0] as keyof CacheConfig;
    return this.getTTL(entityType);
  }

  isExpired(key: string): boolean {
    const entry = this.memoryCache.get(key);
    if (!entry) return true;
    return Date.now() - entry.timestamp > entry.ttl;
  }

  getStats() {
    const entries: Record<string, { age: number; ttl: number; expired: boolean }> = {};
    for (const [key, entry] of this.memoryCache.entries()) {
      const age = Date.now() - entry.timestamp;
      entries[key] = { age, ttl: entry.ttl, expired: age > entry.ttl };
    }
    return {
      totalEntries: this.memoryCache.size,
      entries,
    };
  }
}

export const cacheService = new CacheInvalidationService();

export async function invalidateProductCache(productId?: string): Promise<void> {
  if (productId) {
    cacheService.invalidate(`products:${productId}`);
  } else {
    cacheService.invalidateEntity("products");
  }
  await db.products.hook("creating", () => {
    cacheService.invalidateEntity("products");
  });
}

export async function invalidateCustomerCache(customerId?: string): Promise<void> {
  if (customerId) {
    cacheService.invalidate(`customers:${customerId}`);
  } else {
    cacheService.invalidateEntity("customers");
  }
}

export async function invalidateLoyaltyCache(programId?: string): Promise<void> {
  if (programId) {
    cacheService.invalidate(`loyaltyPrograms:${programId}`);
  } else {
    cacheService.invalidateEntity("loyaltyPrograms");
  }
}

export async function invalidateSyncCache(): Promise<void> {
  cacheService.invalidatePattern("^sync:");
  cacheService.invalidatePattern("^pending:");
}

export function createCacheKey(entityType: string, id: string): string {
  return `${entityType}:${id}`;
}
