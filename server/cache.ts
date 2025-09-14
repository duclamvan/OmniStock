import { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  data: any;
  timestamp: number;
}

class InMemoryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTTL: number = 60000; // 60 seconds default

  set(key: string, data: any, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + ttl
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.timestamp) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries periodically
  startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      // Use Array.from to avoid iterator TypeScript errors
      Array.from(this.cache.entries()).forEach(([key, entry]) => {
        if (now > entry.timestamp) {
          this.cache.delete(key);
        }
      });
    }, 30000); // Clean up every 30 seconds
  }
  
  // Method to get all cache keys for pattern matching
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Create singleton instance
export const cache = new InMemoryCache();
cache.startCleanup();

// Cache middleware factory
export function cacheMiddleware(ttl: number = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Create cache key from URL and query params
    const cacheKey = `${req.originalUrl || req.url}`;
    
    // Check cache
    const cachedData = cache.get(cacheKey);
    if (cachedData !== null) {
      // Add cache hit header
      res.setHeader('X-Cache', 'HIT');
      return res.json(cachedData);
    }

    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = function(data: any) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, data, ttl);
      }
      // Add cache miss header
      res.setHeader('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
  };
}

// Invalidate cache for specific patterns
export function invalidateCache(pattern?: string): void {
  if (!pattern) {
    cache.clear();
    return;
  }

  // Use the public getKeys() method to avoid iterator TypeScript errors
  const keys = cache.getKeys();
  for (const key of keys) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}