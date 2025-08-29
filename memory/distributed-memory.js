/**
 * Distributed Memory System for Serenity Swarm
 * Enables cross-agent knowledge sharing with persistence and synchronization
 */

class DistributedMemory {
  constructor(config) {
    this.nodeId = config.nodeId;
    this.namespace = config.namespace || 'serenity_swarm_memory';
    this.retentionHours = config.retentionHours || 168; // 7 days default
    
    // Local memory store
    this.localStore = new Map();
    this.metadata = new Map();
    
    // Synchronization tracking
    this.syncState = {
      lastSync: null,
      pendingWrites: new Set(),
      syncInProgress: false,
      conflictResolution: 'timestamp_wins'
    };
    
    // Performance metrics
    this.metrics = {
      reads: 0,
      writes: 0,
      syncs: 0,
      conflicts: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    
    // Event handlers
    this.eventHandlers = new Map();
    
    console.log(`Distributed memory initialized for node ${this.nodeId}`);
    this.startPeriodicSync();
  }

  /**
   * Store knowledge with metadata
   */
  async store(key, value, options = {}) {
    const timestamp = Date.now();
    const fullKey = this.buildKey(key, options.scope);
    
    const entry = {
      value: value,
      timestamp: timestamp,
      nodeId: this.nodeId,
      version: (this.getVersion(fullKey) || 0) + 1,
      ttl: options.ttl ? timestamp + options.ttl : null,
      tags: options.tags || [],
      scope: options.scope || 'global',
      priority: options.priority || 'medium'
    };

    // Store locally
    this.localStore.set(fullKey, entry);
    this.metadata.set(fullKey, {
      created: timestamp,
      lastAccessed: timestamp,
      accessCount: 1
    });

    // Mark for synchronization
    this.syncState.pendingWrites.add(fullKey);
    
    this.metrics.writes++;
    
    // Emit store event
    this.emit('store', { key: fullKey, entry, nodeId: this.nodeId });
    
    console.log(`Stored knowledge: ${fullKey} (v${entry.version})`);
    
    // Trigger async sync if not in progress
    if (!this.syncState.syncInProgress) {
      this.scheduleSync();
    }
    
    return entry.version;
  }

  /**
   * Retrieve knowledge with caching
   */
  async retrieve(key, options = {}) {
    const fullKey = this.buildKey(key, options.scope);
    const entry = this.localStore.get(fullKey);
    
    if (entry) {
      // Check TTL
      if (entry.ttl && Date.now() > entry.ttl) {
        this.localStore.delete(fullKey);
        this.metadata.delete(fullKey);
        this.metrics.cacheMisses++;
        return null;
      }
      
      // Update access metadata
      const meta = this.metadata.get(fullKey);
      if (meta) {
        meta.lastAccessed = Date.now();
        meta.accessCount++;
      }
      
      this.metrics.reads++;
      this.metrics.cacheHits++;
      
      return {
        value: entry.value,
        metadata: {
          timestamp: entry.timestamp,
          nodeId: entry.nodeId,
          version: entry.version,
          scope: entry.scope
        }
      };
    }
    
    this.metrics.cacheMisses++;
    
    // Try to retrieve from distributed store
    const distributedEntry = await this.retrieveFromDistributedStore(fullKey);
    if (distributedEntry) {
      this.localStore.set(fullKey, distributedEntry);
      this.metrics.reads++;
      return {
        value: distributedEntry.value,
        metadata: {
          timestamp: distributedEntry.timestamp,
          nodeId: distributedEntry.nodeId,
          version: distributedEntry.version,
          scope: distributedEntry.scope
        }
      };
    }
    
    return null;
  }

  /**
   * Query knowledge by patterns and tags
   */
  async query(pattern, options = {}) {
    const results = [];
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    
    for (const [key, entry] of this.localStore) {
      if (regex.test(key)) {
        // Filter by tags if specified
        if (options.tags && !this.matchesTags(entry.tags, options.tags)) {
          continue;
        }
        
        // Filter by scope if specified
        if (options.scope && entry.scope !== options.scope) {
          continue;
        }
        
        // Check TTL
        if (entry.ttl && Date.now() > entry.ttl) {
          continue;
        }
        
        results.push({
          key: key,
          value: entry.value,
          metadata: {
            timestamp: entry.timestamp,
            nodeId: entry.nodeId,
            version: entry.version,
            scope: entry.scope,
            tags: entry.tags
          }
        });
      }
    }
    
    // Sort by relevance/timestamp
    results.sort((a, b) => b.metadata.timestamp - a.metadata.timestamp);
    
    return results.slice(0, options.limit || 100);
  }

  /**
   * Share knowledge with specific agents
   */
  async share(key, targetAgents, options = {}) {
    const entry = await this.retrieve(key, options);
    if (!entry) {
      throw new Error(`Knowledge not found: ${key}`);
    }
    
    const sharePackage = {
      key: key,
      value: entry.value,
      metadata: entry.metadata,
      sharedBy: this.nodeId,
      sharedAt: Date.now(),
      targets: targetAgents
    };
    
    // Broadcast to target agents
    this.emit('share', sharePackage);
    
    console.log(`Shared knowledge ${key} with agents: ${targetAgents.join(', ')}`);
    
    return sharePackage;
  }

  /**
   * Synchronize with distributed store
   */
  async synchronize() {
    if (this.syncState.syncInProgress) {
      return false;
    }
    
    this.syncState.syncInProgress = true;
    const syncStartTime = Date.now();
    
    try {
      // Upload pending writes
      for (const key of this.syncState.pendingWrites) {
        const entry = this.localStore.get(key);
        if (entry) {
          await this.uploadToDistributedStore(key, entry);
        }
      }
      
      // Download updates from other nodes
      await this.downloadFromDistributedStore();
      
      this.syncState.pendingWrites.clear();
      this.syncState.lastSync = syncStartTime;
      this.metrics.syncs++;
      
      console.log(`Memory sync completed in ${Date.now() - syncStartTime}ms`);
      
      return true;
    } catch (error) {
      console.error(`Memory sync failed: ${error.message}`);
      return false;
    } finally {
      this.syncState.syncInProgress = false;
    }
  }

  /**
   * Handle knowledge conflicts during sync
   */
  resolveConflict(localEntry, remoteEntry, key) {
    this.metrics.conflicts++;
    
    switch (this.syncState.conflictResolution) {
      case 'timestamp_wins':
        return localEntry.timestamp > remoteEntry.timestamp ? localEntry : remoteEntry;
      
      case 'version_wins':
        return localEntry.version > remoteEntry.version ? localEntry : remoteEntry;
      
      case 'node_priority':
        return localEntry.nodeId < remoteEntry.nodeId ? localEntry : remoteEntry;
      
      case 'merge':
        return this.mergeEntries(localEntry, remoteEntry);
      
      default:
        return localEntry; // Local wins by default
    }
  }

  /**
   * Merge conflicting entries
   */
  mergeEntries(local, remote) {
    return {
      value: { ...remote.value, ...local.value },
      timestamp: Math.max(local.timestamp, remote.timestamp),
      nodeId: local.nodeId,
      version: Math.max(local.version, remote.version) + 1,
      tags: [...new Set([...local.tags, ...remote.tags])],
      scope: local.scope,
      priority: local.priority === 'high' || remote.priority === 'high' ? 'high' : local.priority
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    const retentionMs = this.retentionHours * 60 * 60 * 1000;
    let cleanedCount = 0;
    
    for (const [key, entry] of this.localStore) {
      // Remove expired TTL entries
      if (entry.ttl && now > entry.ttl) {
        this.localStore.delete(key);
        this.metadata.delete(key);
        cleanedCount++;
        continue;
      }
      
      // Remove old entries beyond retention period
      if (now - entry.timestamp > retentionMs) {
        this.localStore.delete(key);
        this.metadata.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired memory entries`);
    }
  }

  /**
   * Get memory statistics
   */
  getStats() {
    return {
      nodeId: this.nodeId,
      namespace: this.namespace,
      totalEntries: this.localStore.size,
      pendingWrites: this.syncState.pendingWrites.size,
      lastSync: this.syncState.lastSync,
      metrics: this.metrics,
      memoryUsage: this.calculateMemoryUsage()
    };
  }

  /**
   * Build namespaced key
   */
  buildKey(key, scope) {
    return `${this.namespace}:${scope || 'global'}:${key}`;
  }

  /**
   * Get current version of a key
   */
  getVersion(key) {
    const entry = this.localStore.get(key);
    return entry ? entry.version : 0;
  }

  /**
   * Check if entry tags match query tags
   */
  matchesTags(entryTags, queryTags) {
    return queryTags.every(tag => entryTags.includes(tag));
  }

  /**
   * Calculate memory usage
   */
  calculateMemoryUsage() {
    let totalSize = 0;
    for (const entry of this.localStore.values()) {
      totalSize += JSON.stringify(entry).length;
    }
    return {
      bytes: totalSize,
      kb: Math.round(totalSize / 1024),
      entries: this.localStore.size
    };
  }

  /**
   * Start periodic synchronization
   */
  startPeriodicSync() {
    setInterval(() => {
      if (this.syncState.pendingWrites.size > 0) {
        this.synchronize();
      }
    }, 30000); // Sync every 30 seconds
    
    // Also run cleanup periodically
    setInterval(() => {
      this.cleanup();
    }, 300000); // Cleanup every 5 minutes
  }

  /**
   * Schedule immediate sync
   */
  scheduleSync() {
    setTimeout(() => {
      if (!this.syncState.syncInProgress) {
        this.synchronize();
      }
    }, 1000);
  }

  /**
   * Mock distributed store operations (implement with actual backend)
   */
  async uploadToDistributedStore(key, entry) {
    // Implementation would upload to Redis, Database, etc.
    console.log(`Uploading ${key} to distributed store`);
  }

  async downloadFromDistributedStore() {
    // Implementation would download updates from distributed store
    console.log('Downloading updates from distributed store');
  }

  async retrieveFromDistributedStore(key) {
    // Implementation would retrieve from distributed store
    return null;
  }

  /**
   * Event handling
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => handler(data));
    }
  }
}

module.exports = { DistributedMemory };