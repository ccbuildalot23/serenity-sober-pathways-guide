interface CacheConfig {
  maxAge: number; // in milliseconds
  maxSize: number; // in bytes
  priority: 'high' | 'medium' | 'low';
}

interface CacheItem {
  key: string;
  data: any;
  timestamp: number;
  size: number;
  priority: 'high' | 'medium' | 'low';
  lastAccessed: number;
}

class OfflineCacheService {
  private cache = new Map<string, CacheItem>();
  private maxCacheSize = 50 * 1024 * 1024; // 50MB
  private currentCacheSize = 0;

  // Cache configurations for different data types
  private cacheConfigs: Record<string, CacheConfig> = {
    // Crisis data - highest priority, never expires
    'crisis-contacts': { maxAge: Infinity, maxSize: 1024 * 1024, priority: 'high' },
    'emergency-resources': { maxAge: Infinity, maxSize: 5 * 1024 * 1024, priority: 'high' },
    'coping-strategies': { maxAge: 7 * 24 * 60 * 60 * 1000, maxSize: 2 * 1024 * 1024, priority: 'high' },
    
    // Recovery data - medium priority
    'recovery-plan': { maxAge: 24 * 60 * 60 * 1000, maxSize: 1024 * 1024, priority: 'medium' },
    'check-ins': { maxAge: 7 * 24 * 60 * 60 * 1000, maxSize: 5 * 1024 * 1024, priority: 'medium' },
    'goals': { maxAge: 24 * 60 * 60 * 1000, maxSize: 512 * 1024, priority: 'medium' },
    
    // Content data - lower priority
    'success-stories': { maxAge: 24 * 60 * 60 * 1000, maxSize: 10 * 1024 * 1024, priority: 'low' },
    'cbt-exercises': { maxAge: 7 * 24 * 60 * 60 * 1000, maxSize: 5 * 1024 * 1024, priority: 'medium' },
    'educational-content': { maxAge: 7 * 24 * 60 * 60 * 1000, maxSize: 10 * 1024 * 1024, priority: 'low' },
  };

  constructor() {
    this.loadCacheFromStorage();
    this.setupPeriodicCleanup();
  }

  private loadCacheFromStorage() {
    try {
      const stored = localStorage.getItem('offline-cache');
      if (stored) {
        const data = JSON.parse(stored);
        this.cache = new Map(data.cache);
        this.currentCacheSize = data.size || 0;
      }
    } catch (error) {
      console.error('Failed to load cache from storage:', error);
    }
  }

  private saveCacheToStorage() {
    try {
      const data = {
        cache: Array.from(this.cache.entries()),
        size: this.currentCacheSize,
      };
      localStorage.setItem('offline-cache', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save cache to storage:', error);
      // If storage is full, clear some low-priority items
      this.clearLowPriorityItems();
    }
  }

  private setupPeriodicCleanup() {
    // Clean expired items every 5 minutes
    setInterval(() => {
      this.cleanExpiredItems();
    }, 5 * 60 * 1000);
  }

  private getItemSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  private isExpired(item: CacheItem): boolean {
    const config = this.cacheConfigs[item.key.split(':')[0]];
    if (!config || config.maxAge === Infinity) return false;
    
    return Date.now() - item.timestamp > config.maxAge;
  }

  private clearLowPriorityItems() {
    const lowPriorityItems = Array.from(this.cache.entries())
      .filter(([, item]) => item.priority === 'low')
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    for (const [key, item] of lowPriorityItems) {
      this.cache.delete(key);
      this.currentCacheSize -= item.size;
      
      // Stop when we've freed up enough space
      if (this.currentCacheSize < this.maxCacheSize * 0.8) break;
    }
  }

  private cleanExpiredItems() {
    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        this.cache.delete(key);
        this.currentCacheSize -= item.size;
      }
    }
    this.saveCacheToStorage();
  }

  private makeSpace(requiredSize: number) {
    if (this.currentCacheSize + requiredSize <= this.maxCacheSize) return;

    // First, remove expired items
    this.cleanExpiredItems();

    // If still not enough space, remove items by priority and last access time
    const items = Array.from(this.cache.entries())
      .sort((a, b) => {
        // Sort by priority first (low < medium < high)
        const priorityOrder = { low: 0, medium: 1, high: 2 };
        const priorityDiff = priorityOrder[a[1].priority] - priorityOrder[b[1].priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // Then by last accessed time (oldest first)
        return a[1].lastAccessed - b[1].lastAccessed;
      });

    for (const [key, item] of items) {
      // Never remove high-priority items
      if (item.priority === 'high') continue;
      
      this.cache.delete(key);
      this.currentCacheSize -= item.size;
      
      if (this.currentCacheSize + requiredSize <= this.maxCacheSize) break;
    }
  }

  set(key: string, data: any, category: string = 'default'): void {
    const size = this.getItemSize(data);
    const config = this.cacheConfigs[category] || { maxAge: 60 * 60 * 1000, maxSize: 1024 * 1024, priority: 'medium' as const };
    
    // Check if item is too large
    if (size > config.maxSize) {
      console.warn(`Item too large for cache: ${key} (${size} bytes)`);
      return;
    }

    // Make space if needed
    this.makeSpace(size);

    // Remove existing item if it exists
    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!;
      this.currentCacheSize -= existing.size;
    }

    const item: CacheItem = {
      key,
      data,
      timestamp: Date.now(),
      size,
      priority: config.priority,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, item);
    this.currentCacheSize += size;
    this.saveCacheToStorage();
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (this.isExpired(item)) {
      this.cache.delete(key);
      this.currentCacheSize -= item.size;
      this.saveCacheToStorage();
      return null;
    }

    // Update last accessed time
    item.lastAccessed = Date.now();
    this.cache.set(key, item);
    
    return item.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    const item = this.cache.get(key);
    if (item) {
      this.cache.delete(key);
      this.currentCacheSize -= item.size;
      this.saveCacheToStorage();
      return true;
    }
    return false;
  }

  clear(): void {
    this.cache.clear();
    this.currentCacheSize = 0;
    this.saveCacheToStorage();
  }

  // Get cache statistics
  getStats() {
    const items = Array.from(this.cache.values());
    const stats = {
      totalItems: items.length,
      totalSize: this.currentCacheSize,
      maxSize: this.maxCacheSize,
      utilizationPercent: (this.currentCacheSize / this.maxCacheSize) * 100,
      breakdown: {
        high: items.filter(item => item.priority === 'high').length,
        medium: items.filter(item => item.priority === 'medium').length,
        low: items.filter(item => item.priority === 'low').length,
      },
    };
    
    return stats;
  }

  // Preload critical data for offline use
  async preloadCriticalData() {
    const criticalKeys = [
      'crisis-contacts',
      'emergency-resources',
      'coping-strategies',
      'recovery-plan',
    ];

    // This would be implemented to fetch and cache critical data
    console.log('Preloading critical data for offline use:', criticalKeys);
  }

  // Predictive caching based on user behavior
  async predictiveCache(userBehavior: { frequentlyAccessed: string[], timeOfDay: number, dayOfWeek: number }) {
    // Cache frequently accessed data
    for (const key of userBehavior.frequentlyAccessed) {
      if (!this.has(key)) {
        // Fetch and cache the data
        console.log('Predictively caching:', key);
      }
    }
  }
}

export const offlineCacheService = new OfflineCacheService();