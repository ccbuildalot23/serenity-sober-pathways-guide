import { McpServiceInterface, McpHealthStatus } from '../McpServiceRegistry';
import { supabase } from '@/integrations/supabase/client';

/**
 * Data Sync Service
 * Manages data synchronization across devices and offline/online states via MCP
 */
export class DataSyncService implements McpServiceInterface {
  private connected: boolean = false;
  private lastHealthCheck: Date = new Date();
  private syncQueue: SyncOperation[] = [];
  private conflictResolver: ConflictResolver;
  private syncStatus: Map<string, SyncStatus> = new Map();
  private offlineCache: Map<string, any> = new Map();

  constructor() {
    this.conflictResolver = new ConflictResolver();
  }

  async initialize(): Promise<void> {
    try {
      // Initialize sync mechanisms
      await this.setupSyncListeners();
      await this.loadOfflineCache();
      
      this.connected = true;
      console.log('Data Sync Service initialized');
      
      // Attempt initial sync
      await this.performInitialSync();
    } catch (error) {
      console.error('Failed to initialize Data Sync Service:', error);
      throw error;
    }
  }

  async execute(operation: string, params: Record<string, any>): Promise<any> {
    if (!this.connected && operation !== 'getOfflineData') {
      throw new Error('Service not connected');
    }

    switch (operation) {
      case 'sync':
        return this.syncData(params);
      
      case 'syncAll':
        return this.syncAllData();
      
      case 'resolveConflict':
        return this.resolveDataConflict(params);
      
      case 'getStatus':
        return this.getSyncStatus(params.entityType);
      
      case 'queueOperation':
        return this.queueSyncOperation(params);
      
      case 'processQueue':
        return this.processSyncQueue();
      
      case 'getOfflineData':
        return this.getOfflineData(params.key);
      
      case 'setOfflineData':
        return this.setOfflineData(params.key, params.data);
      
      case 'clearCache':
        return this.clearOfflineCache();
      
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  async healthCheck(): Promise<McpHealthStatus> {
    this.lastHealthCheck = new Date();
    
    try {
      const issues: string[] = [];
      
      if (!this.connected) {
        issues.push('Service disconnected');
      }
      
      // Check sync queue
      if (this.syncQueue.length > 50) {
        issues.push(`Large sync queue: ${this.syncQueue.length} operations`);
      }
      
      // Check for stale sync status
      const staleSyncs = Array.from(this.syncStatus.values()).filter(
        status => Date.now() - status.lastSync > 3600000 // 1 hour
      );
      
      if (staleSyncs.length > 0) {
        issues.push(`${staleSyncs.length} entities with stale sync`);
      }
      
      // Check offline cache size
      if (this.offlineCache.size > 1000) {
        issues.push(`Large offline cache: ${this.offlineCache.size} items`);
      }
      
      return {
        healthy: issues.length === 0,
        issues,
        recoverable: true,
        lastCheck: this.lastHealthCheck.toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        issues: ['Health check failed: ' + error.message],
        recoverable: true,
        lastCheck: this.lastHealthCheck.toISOString()
      };
    }
  }

  async disconnect(): Promise<void> {
    // Save offline cache
    await this.saveOfflineCache();
    
    // Process remaining queue
    await this.processSyncQueue();
    
    this.connected = false;
    this.syncStatus.clear();
    console.log('Data Sync Service disconnected');
  }

  // Private methods

  private async setupSyncListeners() {
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }

    // Listen for realtime database changes
    supabase
      .channel('sync-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public'
      }, (payload) => {
        this.handleDatabaseChange(payload);
      })
      .subscribe();
  }

  private async loadOfflineCache() {
    // Load from localStorage if available
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem('mcp_offline_cache');
      if (cached) {
        try {
          const data = JSON.parse(cached);
          this.offlineCache = new Map(Object.entries(data));
        } catch (error) {
          console.error('Failed to load offline cache:', error);
        }
      }
    }
  }

  private async saveOfflineCache() {
    // Save to localStorage
    if (typeof localStorage !== 'undefined') {
      const data = Object.fromEntries(this.offlineCache.entries());
      localStorage.setItem('mcp_offline_cache', JSON.stringify(data));
    }
  }

  private async performInitialSync() {
    try {
      const entities = ['profiles', 'daily_checkins', 'crisis_events', 'support_network'];
      
      for (const entity of entities) {
        await this.syncEntity(entity);
      }
    } catch (error) {
      console.error('Initial sync failed:', error);
    }
  }

  private async syncData(params: any) {
    const { entityType, data, lastSync } = params;
    
    try {
      // Get remote data
      const { data: remoteData, error } = await supabase
        .from(entityType)
        .select('*')
        .gte('updated_at', lastSync || '1970-01-01');

      if (error) throw error;

      // Detect conflicts
      const conflicts = this.detectConflicts(data, remoteData);
      
      // Resolve conflicts
      const resolved = await this.resolveConflicts(conflicts);
      
      // Merge data
      const merged = this.mergeData(data, remoteData, resolved);
      
      // Update local and remote
      await this.updateData(entityType, merged);
      
      // Update sync status
      this.updateSyncStatus(entityType, 'synced');
      
      return {
        success: true,
        entityType,
        synced: merged.length,
        conflicts: conflicts.length,
        resolved: resolved.length
      };
      
    } catch (error) {
      this.updateSyncStatus(entityType, 'error');
      throw error;
    }
  }

  private async syncAllData() {
    const results = [];
    const entities = Array.from(this.syncStatus.keys());
    
    for (const entity of entities) {
      try {
        const result = await this.syncData({
          entityType: entity,
          data: [],
          lastSync: this.syncStatus.get(entity)?.lastSync
        });
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          entityType: entity,
          error: error.message
        });
      }
    }
    
    return {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  private async syncEntity(entityType: string) {
    const { data, error } = await supabase
      .from(entityType)
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      // Cache for offline use
      this.offlineCache.set(entityType, data);
      
      // Update sync status
      this.updateSyncStatus(entityType, 'synced');
    }
  }

  private detectConflicts(localData: any[], remoteData: any[]): Conflict[] {
    const conflicts: Conflict[] = [];
    
    for (const local of localData) {
      const remote = remoteData.find(r => r.id === local.id);
      
      if (remote && local.updated_at !== remote.updated_at) {
        conflicts.push({
          id: local.id,
          type: 'update',
          localData: local,
          remoteData: remote,
          localTimestamp: local.updated_at,
          remoteTimestamp: remote.updated_at
        });
      }
    }
    
    return conflicts;
  }

  private async resolveConflicts(conflicts: Conflict[]): Promise<Resolution[]> {
    const resolutions: Resolution[] = [];
    
    for (const conflict of conflicts) {
      const resolution = await this.conflictResolver.resolve(conflict);
      resolutions.push(resolution);
    }
    
    return resolutions;
  }

  private async resolveDataConflict(params: any) {
    const { conflictId, strategy = 'latest', customResolution } = params;
    
    // Find conflict
    const conflict = this.findConflict(conflictId);
    if (!conflict) {
      throw new Error('Conflict not found');
    }
    
    let resolution: any;
    
    switch (strategy) {
      case 'latest':
        resolution = conflict.localTimestamp > conflict.remoteTimestamp ?
          conflict.localData : conflict.remoteData;
        break;
      
      case 'remote':
        resolution = conflict.remoteData;
        break;
      
      case 'local':
        resolution = conflict.localData;
        break;
      
      case 'merge':
        resolution = { ...conflict.remoteData, ...conflict.localData };
        break;
      
      case 'custom':
        resolution = customResolution;
        break;
      
      default:
        throw new Error(`Unknown resolution strategy: ${strategy}`);
    }
    
    return {
      conflictId,
      strategy,
      resolution,
      applied: true
    };
  }

  private mergeData(localData: any[], remoteData: any[], resolutions: Resolution[]): any[] {
    const merged = new Map();
    
    // Add all remote data
    for (const item of remoteData) {
      merged.set(item.id, item);
    }
    
    // Override with local data where appropriate
    for (const item of localData) {
      const resolution = resolutions.find(r => r.id === item.id);
      
      if (resolution) {
        merged.set(item.id, resolution.data);
      } else if (!merged.has(item.id)) {
        merged.set(item.id, item);
      }
    }
    
    return Array.from(merged.values());
  }

  private async updateData(entityType: string, data: any[]) {
    // Update in batches
    const batchSize = 100;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      await supabase
        .from(entityType)
        .upsert(batch);
    }
  }

  private async queueSyncOperation(params: any) {
    const operation: SyncOperation = {
      id: this.generateOperationId(),
      type: params.type,
      entityType: params.entityType,
      data: params.data,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending'
    };
    
    this.syncQueue.push(operation);
    
    // Save to offline cache
    await this.saveOfflineCache();
    
    return {
      operationId: operation.id,
      queued: true,
      queueLength: this.syncQueue.length
    };
  }

  private async processSyncQueue() {
    const processed: SyncOperation[] = [];
    const failed: SyncOperation[] = [];
    
    while (this.syncQueue.length > 0) {
      const operation = this.syncQueue.shift();
      if (!operation) continue;
      
      try {
        await this.processOperation(operation);
        operation.status = 'completed';
        processed.push(operation);
      } catch (error) {
        operation.retries++;
        operation.status = 'failed';
        
        if (operation.retries < 3) {
          // Re-queue for retry
          this.syncQueue.push(operation);
        } else {
          failed.push(operation);
        }
      }
    }
    
    return {
      processed: processed.length,
      failed: failed.length,
      remaining: this.syncQueue.length
    };
  }

  private async processOperation(operation: SyncOperation) {
    switch (operation.type) {
      case 'create':
        await supabase.from(operation.entityType).insert(operation.data);
        break;
      
      case 'update':
        await supabase.from(operation.entityType).update(operation.data)
          .eq('id', operation.data.id);
        break;
      
      case 'delete':
        await supabase.from(operation.entityType).delete()
          .eq('id', operation.data.id);
        break;
      
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  private getSyncStatus(entityType?: string) {
    if (entityType) {
      return this.syncStatus.get(entityType) || {
        status: 'unknown',
        lastSync: 0,
        pending: 0
      };
    }
    
    return Array.from(this.syncStatus.entries()).map(([entity, status]) => ({
      entity,
      ...status
    }));
  }

  private getOfflineData(key: string) {
    return this.offlineCache.get(key);
  }

  private setOfflineData(key: string, data: any) {
    this.offlineCache.set(key, data);
    this.saveOfflineCache();
    
    return {
      key,
      stored: true,
      cacheSize: this.offlineCache.size
    };
  }

  private clearOfflineCache() {
    const size = this.offlineCache.size;
    this.offlineCache.clear();
    
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('mcp_offline_cache');
    }
    
    return {
      cleared: size,
      cacheSize: 0
    };
  }

  private updateSyncStatus(entityType: string, status: 'synced' | 'pending' | 'error') {
    const current = this.syncStatus.get(entityType) || {
      status: 'unknown',
      lastSync: 0,
      pending: 0
    };
    
    current.status = status;
    if (status === 'synced') {
      current.lastSync = Date.now();
      current.pending = 0;
    }
    
    this.syncStatus.set(entityType, current);
  }

  private handleOnline() {
    console.log('Connection restored, syncing data...');
    this.connected = true;
    this.processSyncQueue();
    this.syncAllData();
  }

  private handleOffline() {
    console.log('Connection lost, switching to offline mode');
    this.connected = false;
  }

  private handleDatabaseChange(payload: any) {
    // Handle realtime database changes
    console.log('Database change detected:', payload);
    
    // Queue sync for affected entity
    this.queueSyncOperation({
      type: payload.eventType,
      entityType: payload.table,
      data: payload.new || payload.old
    });
  }

  private findConflict(_conflictId: string): Conflict | undefined {
    // Would retrieve from storage
    return undefined;
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Conflict Resolution Helper
class ConflictResolver {
  async resolve(conflict: Conflict): Promise<Resolution> {
    // Default to latest-wins strategy
    const useLocal = conflict.localTimestamp > conflict.remoteTimestamp;
    
    return {
      id: conflict.id,
      strategy: 'latest',
      data: useLocal ? conflict.localData : conflict.remoteData,
      winner: useLocal ? 'local' : 'remote'
    };
  }
}

// Types
interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: string;
  data: any;
  timestamp: number;
  retries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface SyncStatus {
  status: 'synced' | 'pending' | 'error' | 'unknown';
  lastSync: number;
  pending: number;
}

interface Conflict {
  id: string;
  type: 'update' | 'delete';
  localData: any;
  remoteData: any;
  localTimestamp: string;
  remoteTimestamp: string;
}

interface Resolution {
  id: string;
  strategy: string;
  data: any;
  winner?: 'local' | 'remote';
}