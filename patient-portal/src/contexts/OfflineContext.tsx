import React, {createContext, useContext, useReducer, useEffect, ReactNode} from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {OfflineService} from '@services/offline';
import {SyncService} from '@services/sync';
import {useAuth} from './AuthContext';

interface OfflineData {
  checkins: any[];
  medications: any[];
  appointments: any[];
  messages: any[];
  analytics: any;
  lastSyncTime?: string;
}

interface OfflineState {
  isConnected: boolean;
  isOnline: boolean;
  connectionType: string | null;
  isSyncing: boolean;
  pendingActions: PendingAction[];
  offlineData: OfflineData;
  lastSyncTime?: string;
  syncError?: string;
  autoSyncEnabled: boolean;
}

interface PendingAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'checkin' | 'medication' | 'appointment' | 'message';
  data: any;
  timestamp: string;
  retryCount: number;
}

type OfflineAction =
  | {type: 'SET_CONNECTION_STATUS'; payload: {isConnected: boolean; connectionType: string | null}}
  | {type: 'SET_SYNC_STATUS'; payload: boolean}
  | {type: 'ADD_PENDING_ACTION'; payload: PendingAction}
  | {type: 'REMOVE_PENDING_ACTION'; payload: string}
  | {type: 'UPDATE_OFFLINE_DATA'; payload: Partial<OfflineData>}
  | {type: 'SET_LAST_SYNC_TIME'; payload: string}
  | {type: 'SET_SYNC_ERROR'; payload: string | undefined}
  | {type: 'SET_AUTO_SYNC'; payload: boolean}
  | {type: 'CLEAR_OFFLINE_DATA'};

const initialState: OfflineState = {
  isConnected: true,
  isOnline: true,
  connectionType: null,
  isSyncing: false,
  pendingActions: [],
  offlineData: {
    checkins: [],
    medications: [],
    appointments: [],
    messages: [],
    analytics: null,
  },
  autoSyncEnabled: true,
};

const offlineReducer = (state: OfflineState, action: OfflineAction): OfflineState => {
  switch (action.type) {
    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        isConnected: action.payload.isConnected,
        isOnline: action.payload.isConnected,
        connectionType: action.payload.connectionType,
      };
    case 'SET_SYNC_STATUS':
      return {
        ...state,
        isSyncing: action.payload,
        syncError: action.payload ? undefined : state.syncError,
      };
    case 'ADD_PENDING_ACTION':
      return {
        ...state,
        pendingActions: [...state.pendingActions, action.payload],
      };
    case 'REMOVE_PENDING_ACTION':
      return {
        ...state,
        pendingActions: state.pendingActions.filter(action => action.id !== action.payload),
      };
    case 'UPDATE_OFFLINE_DATA':
      return {
        ...state,
        offlineData: {...state.offlineData, ...action.payload},
      };
    case 'SET_LAST_SYNC_TIME':
      return {
        ...state,
        lastSyncTime: action.payload,
      };
    case 'SET_SYNC_ERROR':
      return {
        ...state,
        syncError: action.payload,
      };
    case 'SET_AUTO_SYNC':
      return {
        ...state,
        autoSyncEnabled: action.payload,
      };
    case 'CLEAR_OFFLINE_DATA':
      return {
        ...state,
        offlineData: {
          checkins: [],
          medications: [],
          appointments: [],
          messages: [],
          analytics: null,
        },
        pendingActions: [],
        lastSyncTime: undefined,
        syncError: undefined,
      };
    default:
      return state;
  }
};

interface OfflineContextType {
  ...OfflineState;
  addPendingAction: (action: Omit<PendingAction, 'id' | 'timestamp' | 'retryCount'>) => void;
  syncData: () => Promise<void>;
  clearOfflineData: () => Promise<void>;
  getOfflineData: (entity: keyof OfflineData) => any;
  updateOfflineData: (entity: keyof OfflineData, data: any) => Promise<void>;
  setAutoSync: (enabled: boolean) => Promise<void>;
  retryFailedActions: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const useOffline = (): OfflineContextType => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

interface OfflineProviderProps {
  children: ReactNode;
}

export const OfflineProvider: React.FC<OfflineProviderProps> = ({children}) => {
  const [state, dispatch] = useReducer(offlineReducer, initialState);
  const {user} = useAuth();

  useEffect(() => {
    initializeOfflineData();
    setupNetworkListener();
    
    return () => {
      // Cleanup network listener
      NetInfo.removeEventListener('connectionChange', handleNetworkChange);
    };
  }, []);

  useEffect(() => {
    if (user) {
      loadOfflineData();
    }
  }, [user]);

  useEffect(() => {
    // Auto sync when connection is restored
    if (state.isConnected && state.pendingActions.length > 0 && state.autoSyncEnabled) {
      syncData();
    }
  }, [state.isConnected, state.autoSyncEnabled]);

  const initializeOfflineData = async () => {
    try {
      // Load auto sync preference
      const autoSync = await AsyncStorage.getItem('auto_sync_enabled');
      if (autoSync !== null) {
        dispatch({type: 'SET_AUTO_SYNC', payload: JSON.parse(autoSync)});
      }

      // Load last sync time
      const lastSync = await AsyncStorage.getItem('last_sync_time');
      if (lastSync) {
        dispatch({type: 'SET_LAST_SYNC_TIME', payload: lastSync});
      }
    } catch (error) {
      console.error('Failed to initialize offline data:', error);
    }
  };

  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener(handleNetworkChange);
    
    // Get initial connection state
    NetInfo.fetch().then(state => {
      handleNetworkChange(state);
    });

    return unsubscribe;
  };

  const handleNetworkChange = (state: any) => {
    dispatch({
      type: 'SET_CONNECTION_STATUS',
      payload: {
        isConnected: state.isConnected,
        connectionType: state.type,
      },
    });
  };

  const loadOfflineData = async () => {
    if (!user) return;

    try {
      const offlineData = await OfflineService.getOfflineData(user.id);
      dispatch({type: 'UPDATE_OFFLINE_DATA', payload: offlineData});

      // Load pending actions
      const pendingActions = await OfflineService.getPendingActions(user.id);
      pendingActions.forEach(action => {
        dispatch({type: 'ADD_PENDING_ACTION', payload: action});
      });
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  };

  const addPendingAction = (actionData: Omit<PendingAction, 'id' | 'timestamp' | 'retryCount'>) => {
    const action: PendingAction = {
      ...actionData,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    dispatch({type: 'ADD_PENDING_ACTION', payload: action});
    
    // Save to local storage
    if (user) {
      OfflineService.savePendingAction(user.id, action);
    }
  };

  const syncData = async () => {
    if (!state.isConnected || !user || state.isSyncing) {
      return;
    }

    try {
      dispatch({type: 'SET_SYNC_STATUS', payload: true});

      // Sync pending actions
      const syncResults = await SyncService.syncPendingActions(user.id, state.pendingActions);
      
      // Remove successfully synced actions
      syncResults.successful.forEach(actionId => {
        dispatch({type: 'REMOVE_PENDING_ACTION', payload: actionId});
        OfflineService.removePendingAction(user.id, actionId);
      });

      // Update retry count for failed actions
      syncResults.failed.forEach(({actionId, error}) => {
        const action = state.pendingActions.find(a => a.id === actionId);
        if (action) {
          const updatedAction = {...action, retryCount: action.retryCount + 1};
          OfflineService.updatePendingAction(user.id, updatedAction);
        }
      });

      // Sync data from server
      const serverData = await SyncService.fetchLatestData(user.id, state.lastSyncTime);
      if (serverData) {
        dispatch({type: 'UPDATE_OFFLINE_DATA', payload: serverData});
        await OfflineService.saveOfflineData(user.id, {...state.offlineData, ...serverData});
      }

      // Update last sync time
      const now = new Date().toISOString();
      dispatch({type: 'SET_LAST_SYNC_TIME', payload: now});
      await AsyncStorage.setItem('last_sync_time', now);

      console.log('Offline sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
      dispatch({type: 'SET_SYNC_ERROR', payload: error.message || 'Sync failed'});
    } finally {
      dispatch({type: 'SET_SYNC_STATUS', payload: false});
    }
  };

  const clearOfflineData = async () => {
    try {
      if (user) {
        await OfflineService.clearOfflineData(user.id);
      }
      dispatch({type: 'CLEAR_OFFLINE_DATA'});
      await AsyncStorage.removeItem('last_sync_time');
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  };

  const getOfflineData = (entity: keyof OfflineData) => {
    return state.offlineData[entity];
  };

  const updateOfflineData = async (entity: keyof OfflineData, data: any) => {
    try {
      const updatedData = {[entity]: data};
      dispatch({type: 'UPDATE_OFFLINE_DATA', payload: updatedData});
      
      if (user) {
        await OfflineService.saveOfflineData(user.id, {
          ...state.offlineData,
          ...updatedData,
        });
      }
    } catch (error) {
      console.error('Failed to update offline data:', error);
    }
  };

  const setAutoSync = async (enabled: boolean) => {
    try {
      dispatch({type: 'SET_AUTO_SYNC', payload: enabled});
      await AsyncStorage.setItem('auto_sync_enabled', JSON.stringify(enabled));
    } catch (error) {
      console.error('Failed to set auto sync preference:', error);
    }
  };

  const retryFailedActions = async () => {
    if (!state.isConnected) {
      return;
    }

    const failedActions = state.pendingActions.filter(action => action.retryCount > 0);
    if (failedActions.length === 0) {
      return;
    }

    try {
      dispatch({type: 'SET_SYNC_STATUS', payload: true});
      
      const retryResults = await SyncService.retryFailedActions(user?.id!, failedActions);
      
      retryResults.successful.forEach(actionId => {
        dispatch({type: 'REMOVE_PENDING_ACTION', payload: actionId});
        OfflineService.removePendingAction(user?.id!, actionId);
      });

      retryResults.failed.forEach(({actionId}) => {
        const action = state.pendingActions.find(a => a.id === actionId);
        if (action && action.retryCount >= 3) {
          // Remove actions that have failed too many times
          dispatch({type: 'REMOVE_PENDING_ACTION', payload: actionId});
          OfflineService.removePendingAction(user?.id!, actionId);
        }
      });
      
    } catch (error) {
      console.error('Failed to retry actions:', error);
    } finally {
      dispatch({type: 'SET_SYNC_STATUS', payload: false});
    }
  };

  const contextValue: OfflineContextType = {
    ...state,
    addPendingAction,
    syncData,
    clearOfflineData,
    getOfflineData,
    updateOfflineData,
    setAutoSync,
    retryFailedActions,
  };

  return (
    <OfflineContext.Provider value={contextValue}>
      {children}
    </OfflineContext.Provider>
  );
};