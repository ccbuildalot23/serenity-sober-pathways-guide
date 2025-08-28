import {configureStore} from '@reduxjs/toolkit';
import {persistStore, persistReducer} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {combineReducers} from 'redux';

// Import reducers (these would be created as separate files)
import authReducer from './slices/authSlice';
import checkInReducer from './slices/checkInSlice';
import medicationReducer from './slices/medicationSlice';
import messagingReducer from './slices/messagingSlice';
import appointmentReducer from './slices/appointmentSlice';
import settingsReducer from './slices/settingsSlice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'settings'], // Only persist these reducers
};

const rootReducer = combineReducers({
  auth: authReducer,
  checkIn: checkInReducer,
  medication: medicationReducer,
  messaging: messagingReducer,
  appointment: appointmentReducer,
  settings: settingsReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: __DEV__,
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;