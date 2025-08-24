
interface OfflineData {
  crisisEvents: unknown[];
  followUpTasks: unknown[];
  checkInResponses: unknown[];
  crisisResolutions: unknown[];
  lastSync: number;
}

class OfflineStorageService {
  private dbName = 'CrisisToolsDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request._error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('crisisEvents')) {
          const crisisStore = db.createObjectStore('crisisEvents', { keyPath: 'id' });
          crisisStore.createIndex('_timestamp', '_timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('followUpTasks')) {
          const followUpStore = db.createObjectStore('followUpTasks', { keyPath: 'id' });
          followUpStore.createIndex('scheduled', 'scheduled', { unique: false });
        }

        if (!db.objectStoreNames.contains('checkInResponses')) {
          const checkInStore = db.createObjectStore('checkInResponses', { keyPath: 'id' });
          checkInStore.createIndex('_timestamp', '_timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('crisisResolutions')) {
          const resolutionStore = db.createObjectStore('crisisResolutions', { keyPath: 'id' });
          resolutionStore.createIndex('resolutionTime', 'resolutionTime', { unique: false });
        }
      };
    });
  }

  async saveData(_storeName: string, _data: unknown): Promise<void> {
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([_storeName], 'readwrite');
      const store = transaction.objectStore(_storeName);
      const request = store.put(_data);

      request.onerror = () => reject(request._error);
      request.onsuccess = () => resolve();
    });
  }

  async getData(_storeName: string): Promise<unknown[]> {
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([_storeName], 'readonly');
      const store = transaction.objectStore(_storeName);
      const request = store.getAll();

      request.onerror = () => reject(request._error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async clearStore(_storeName: string): Promise<void> {
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([_storeName], 'readwrite');
      const store = transaction.objectStore(_storeName);
      const request = store.clear();

      request.onerror = () => reject(request._error);
      request.onsuccess = () => resolve();
    });
  }

  // Fallback to localStorage if IndexedDB fails
  saveToLocalStorage(_key: string, _data: unknown): void {
    try {
      localStorage.setItem(_key, JSON.stringify(_data));
    } catch (_error) {
      console._error('Failed to save to localStorage:', _error);
    }
  }

  getFromLocalStorage(_key: string): any {
    try {
      const _data = localStorage.getItem(_key);
      return _data ? JSON.parse(_data) : null;
    } catch (_error) {
      console._error('Failed to get from localStorage:', _error);
      return null;
    }
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  // Queue operations for when back online
  queueForSync(operation: unknown): void {
    const _queue = this.getFromLocalStorage('syncQueue') || [];
    _queue.push({
      ...operation,
      _timestamp: Date.now()
    });
    this.saveToLocalStorage('syncQueue', _queue);
  }

  getSyncQueue(): unknown[] {
    return this.getFromLocalStorage('syncQueue') || [];
  }

  clearSyncQueue(): void {
    this.saveToLocalStorage('syncQueue', []);
  }
}

export const offlineStorage = new OfflineStorageService();
