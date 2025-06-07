
interface OfflineData {
  crisisEvents: any[];
  followUpTasks: any[];
  checkInResponses: any[];
  crisisResolutions: any[];
  lastSync: number;
}

class OfflineStorageService {
  private dbName = 'CrisisToolsDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('crisisEvents')) {
          const crisisStore = db.createObjectStore('crisisEvents', { keyPath: 'id' });
          crisisStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('followUpTasks')) {
          const followUpStore = db.createObjectStore('followUpTasks', { keyPath: 'id' });
          followUpStore.createIndex('scheduled', 'scheduled', { unique: false });
        }

        if (!db.objectStoreNames.contains('checkInResponses')) {
          const checkInStore = db.createObjectStore('checkInResponses', { keyPath: 'id' });
          checkInStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('crisisResolutions')) {
          const resolutionStore = db.createObjectStore('crisisResolutions', { keyPath: 'id' });
          resolutionStore.createIndex('resolutionTime', 'resolutionTime', { unique: false });
        }
      };
    });
  }

  async saveData(storeName: string, data: any): Promise<void> {
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getData(storeName: string): Promise<any[]> {
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async clearStore(storeName: string): Promise<void> {
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // Fallback to localStorage if IndexedDB fails
  saveToLocalStorage(key: string, data: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  getFromLocalStorage(key: string): any {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get from localStorage:', error);
      return null;
    }
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  // Queue operations for when back online
  queueForSync(operation: any): void {
    const queue = this.getFromLocalStorage('syncQueue') || [];
    queue.push({
      ...operation,
      timestamp: Date.now()
    });
    this.saveToLocalStorage('syncQueue', queue);
  }

  getSyncQueue(): any[] {
    return this.getFromLocalStorage('syncQueue') || [];
  }

  clearSyncQueue(): void {
    this.saveToLocalStorage('syncQueue', []);
  }
}

export const offlineStorage = new OfflineStorageService();
