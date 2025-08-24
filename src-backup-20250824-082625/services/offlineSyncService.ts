import { Network } from '@capacitor/network';
import { Storage } from '@capacitor/storage';
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from '@/integrations/supabase/client';

/**
 * Offline Sync Service for Mobile App
 * 
 * Features:
 * - Queue operations when offline
 * - Auto-sync when connection restored
 * - Conflict resolution
 * - Local caching
 * - Background sync
 */

export interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  retryCount: number;
  userId: string;
}

export interface CacheItem {
  key: string;
  data: any;
  timestamp: number;
  expiryMs?: number;
}

export interface ConflictResolution {
  strategy: 'client-wins' | 'server-wins' | 'merge' | 'manual';
  resolver?: (local: any, remote: any) => any;
}

class OfflineSyncService {
  private syncQueue: SyncQueueItem[] = [];
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;
  private listeners: Map<string, Set<Function>> = new Map();
  private conflictStrategies: Map<string, ConflictResolution> = new Map();

  constructor() {
    this.initializeNetworkListener();
    this.loadSyncQueue();
    this.setupDefaultConflictStrategies();
  }

  /**
   * Initialize network status monitoring
   */
  private async initializeNetworkListener() {
    // Get initial network status
    const status = await Network.getStatus();
    this.isOnline = status.connected;

    // Listen for network changes
    Network.addListener('networkStatusChange', async (status) => {
      const wasOffline = !this.isOnline;
      this.isOnline = status.connected;

      if (wasOffline && this.isOnline) {
        // Connection restored - trigger sync
        await this.syncPendingOperations();
        this.notifyListeners('connection-restored');
        
        // Show notification
        await LocalNotifications.schedule({
          notifications: [{
            title: 'Connection Restored',
            body: 'Your data is being synced',
            id: 1,
            schedule: { at: new Date(Date.now() + 100) }
          }]
        });
      } else if (!this.isOnline) {
        this.notifyListeners('connection-lost');
        
        // Show offline notification
        await LocalNotifications.schedule({
          notifications: [{
            title: 'Offline Mode',
            body: 'Your changes will be saved when connection is restored',
            id: 2,
            schedule: { at: new Date(Date.now() + 100) }
          }]
        });
      }
    });
  }

  /**
   * Setup default conflict resolution strategies
   */
  private setupDefaultConflictStrategies() {
    // Daily check-ins: merge strategy
    this.conflictStrategies.set('daily_checkins', {
      strategy: 'merge',
      resolver: (local, remote) => ({
        ...remote,
        ...local,
        updated_at: new Date().toISOString()
      })
    });

    // Messages: server wins (preserve order)
    this.conflictStrategies.set('messages', {
      strategy: 'server-wins'
    });

    // User profiles: client wins
    this.conflictStrategies.set('profiles', {
      strategy: 'client-wins'
    });

    // Crisis alerts: always sync both
    this.conflictStrategies.set('crisis_alerts', {
      strategy: 'merge',
      resolver: (local, remote) => {
        // Keep both if different timestamps
        if (local.created_at !== remote.created_at) {
          return [local, remote];
        }
        return remote;
      }
    });
  }

  /**
   * Queue an operation for sync
   */
  async queueOperation(
    operation: 'create' | 'update' | 'delete',
    table: string,
    data: any,
    userId: string
  ): Promise<void> {
    const item: SyncQueueItem = {
      id: `${Date.now()}_${Math.random()}`,
      operation,
      table,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      userId
    };

    this.syncQueue.push(item);
    await this.saveSyncQueue();

    // Try immediate sync if online
    if (this.isOnline) {
      await this.syncPendingOperations();
    }
  }

  /**
   * Sync all pending operations
   */
  async syncPendingOperations(): Promise<void> {
    if (this.syncInProgress || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    const failedItems: SyncQueueItem[] = [];

    try {
      for (const item of this.syncQueue) {
        try {
          await this.executeSyncItem(item);
        } catch (error) {
          console.error(`Sync failed for item ${item.id}:`, error);
          item.retryCount++;
          
          if (item.retryCount < 3) {
            failedItems.push(item);
          } else {
            // Move to dead letter queue after 3 retries
            await this.moveToDeadLetter(item);
          }
        }
      }

      // Update queue with failed items
      this.syncQueue = failedItems;
      await this.saveSyncQueue();

      if (failedItems.length === 0) {
        this.notifyListeners('sync-complete');
      } else {
        this.notifyListeners('sync-partial', failedItems);
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Execute a single sync item
   */
  private async executeSyncItem(item: SyncQueueItem): Promise<void> {
    const strategy = this.conflictStrategies.get(item.table);

    switch (item.operation) {
      case 'create':
        await this.syncCreate(item, strategy);
        break;
      case 'update':
        await this.syncUpdate(item, strategy);
        break;
      case 'delete':
        await this.syncDelete(item);
        break;
    }
  }

  /**
   * Sync create operation
   */
  private async syncCreate(item: SyncQueueItem, strategy?: ConflictResolution): Promise<void> {
    // Check if already exists (duplicate prevention)
    if (item.data.id) {
      const { data: existing } = await supabase
        .from(item.table)
        .select('*')
        .eq('id', item.data.id)
        .single();

      if (existing) {
        // Handle conflict
        if (strategy?.strategy === 'merge' && strategy.resolver) {
          const merged = strategy.resolver(item.data, existing);
          await supabase.from(item.table).update(merged).eq('id', item.data.id);
        } else if (strategy?.strategy === 'client-wins') {
          await supabase.from(item.table).update(item.data).eq('id', item.data.id);
        }
        // server-wins: do nothing
        return;
      }
    }

    // Create new record
    const { error } = await supabase.from(item.table).insert(item.data);
    if (error) throw error;
  }

  /**
   * Sync update operation
   */
  private async syncUpdate(item: SyncQueueItem, strategy?: ConflictResolution): Promise<void> {
    if (!item.data.id) {
      throw new Error('Update operation requires an ID');
    }

    // Get current server version
    const { data: remote } = await supabase
      .from(item.table)
      .select('*')
      .eq('id', item.data.id)
      .single();

    if (!remote) {
      // Record doesn't exist, convert to create
      await this.syncCreate({ ...item, operation: 'create' }, strategy);
      return;
    }

    // Check for conflicts
    const localTimestamp = item.data.updated_at || item.timestamp;
    const remoteTimestamp = remote.updated_at || 0;

    if (new Date(remoteTimestamp) > new Date(localTimestamp)) {
      // Conflict detected
      let finalData = item.data;

      if (strategy?.strategy === 'merge' && strategy.resolver) {
        finalData = strategy.resolver(item.data, remote);
      } else if (strategy?.strategy === 'server-wins') {
        return; // Skip update
      }
      // client-wins: proceed with local data

      const { error } = await supabase
        .from(item.table)
        .update(finalData)
        .eq('id', item.data.id);
      
      if (error) throw error;
    } else {
      // No conflict, proceed with update
      const { error } = await supabase
        .from(item.table)
        .update(item.data)
        .eq('id', item.data.id);
      
      if (error) throw error;
    }
  }

  /**
   * Sync delete operation
   */
  private async syncDelete(item: SyncQueueItem): Promise<void> {
    if (!item.data.id) {
      throw new Error('Delete operation requires an ID');
    }

    const { error } = await supabase
      .from(item.table)
      .delete()
      .eq('id', item.data.id);
    
    if (error && !error.message.includes('not found')) {
      throw error;
    }
  }

  /**
   * Cache data locally
   */
  async cacheData(key: string, data: any, expiryMs?: number): Promise<void> {
    const cacheItem: CacheItem = {
      key,
      data,
      timestamp: Date.now(),
      expiryMs
    };

    await Storage.set({
      key: `cache_${key}`,
      value: JSON.stringify(cacheItem)
    });
  }

  /**
   * Get cached data
   */
  async getCachedData<T>(key: string): Promise<T | null> {
    const { value } = await Storage.get({ key: `cache_${key}` });
    
    if (!value) return null;

    try {
      const cacheItem: CacheItem = JSON.parse(value);
      
      // Check expiry
      if (cacheItem.expiryMs) {
        const elapsed = Date.now() - cacheItem.timestamp;
        if (elapsed > cacheItem.expiryMs) {
          await Storage.remove({ key: `cache_${key}` });
          return null;
        }
      }

      return cacheItem.data as T;
    } catch {
      return null;
    }
  }

  /**
   * Clear all cached data
   */
  async clearCache(pattern?: string): Promise<void> {
    const { keys } = await Storage.keys();
    
    for (const key of keys) {
      if (key.startsWith('cache_')) {
        if (!pattern || key.includes(pattern)) {
          await Storage.remove({ key });
        }
      }
    }
  }

  /**
   * Prefetch essential data for offline use
   */
  async prefetchEssentialData(userId: string): Promise<void> {
    try {
      // Prefetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profile) {
        await this.cacheData(`profile_${userId}`, profile, 24 * 60 * 60 * 1000); // 24 hours
      }

      // Prefetch recent check-ins
      const { data: checkins } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);
      
      if (checkins) {
        await this.cacheData(`checkins_${userId}`, checkins, 12 * 60 * 60 * 1000); // 12 hours
      }

      // Prefetch emergency contacts
      const { data: contacts } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', userId);
      
      if (contacts) {
        await this.cacheData(`emergency_contacts_${userId}`, contacts, 24 * 60 * 60 * 1000);
      }

      // Prefetch crisis resources
      const crisisResources = [
        { number: '988', label: 'Crisis Lifeline' },
        { number: '1-800-273-8255', label: 'Suicide Prevention' },
        { number: '1-800-662-4357', label: 'SAMHSA Helpline' }
      ];
      
      await this.cacheData('crisis_resources', crisisResources);

    } catch (error) {
      console.error('Prefetch failed:', error);
    }
  }

  /**
   * Save sync queue to storage
   */
  private async saveSyncQueue(): Promise<void> {
    await Storage.set({
      key: 'sync_queue',
      value: JSON.stringify(this.syncQueue)
    });
  }

  /**
   * Load sync queue from storage
   */
  private async loadSyncQueue(): Promise<void> {
    const { value } = await Storage.get({ key: 'sync_queue' });
    if (value) {
      try {
        this.syncQueue = JSON.parse(value);
      } catch {
        this.syncQueue = [];
      }
    }
  }

  /**
   * Move failed item to dead letter queue
   */
  private async moveToDeadLetter(item: SyncQueueItem): Promise<void> {
    const { value } = await Storage.get({ key: 'dead_letter_queue' });
    const deadLetter = value ? JSON.parse(value) : [];
    
    deadLetter.push({
      ...item,
      movedAt: Date.now()
    });

    await Storage.set({
      key: 'dead_letter_queue',
      value: JSON.stringify(deadLetter)
    });

    // Notify about failed sync
    await LocalNotifications.schedule({
      notifications: [{
        title: 'Sync Failed',
        body: `Some changes couldn't be synced. Please check your connection.`,
        id: 100 + Math.floor(Math.random() * 1000),
        schedule: { at: new Date(Date.now() + 100) }
      }]
    });
  }

  /**
   * Subscribe to sync events
   */
  subscribe(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(callback);
    
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /**
   * Notify listeners of events
   */
  private notifyListeners(event: string, data?: any): void {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    isOnline: boolean;
    pendingOperations: number;
    syncInProgress: boolean;
  } {
    return {
      isOnline: this.isOnline,
      pendingOperations: this.syncQueue.length,
      syncInProgress: this.syncInProgress
    };
  }

  /**
   * Force sync (for manual trigger)
   */
  async forceSync(): Promise<void> {
    if (this.isOnline) {
      await this.syncPendingOperations();
    } else {
      throw new Error('Cannot sync while offline');
    }
  }

  /**
   * Clear sync queue (use with caution)
   */
  async clearSyncQueue(): Promise<void> {
    this.syncQueue = [];
    await this.saveSyncQueue();
  }
}

// Export singleton instance
export const offlineSyncService = new OfflineSyncService();