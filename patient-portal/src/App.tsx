import React, {useEffect} from 'react';
import {StatusBar, AppState, Platform} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {Provider as PaperProvider} from 'react-native-paper';
import {Provider as ReduxProvider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';

import {AuthProvider} from '@contexts/AuthContext';
import {ThemeProvider} from '@contexts/ThemeContext';
import {OfflineProvider} from '@contexts/OfflineContext';
import {SecurityProvider} from '@contexts/SecurityContext';
import {VoiceProvider} from '@contexts/VoiceContext';

import AppNavigator from '@navigation/AppNavigator';
import {store, persistor} from '@store/index';
import {initializePushNotifications} from '@services/notifications';
import {initializeVoiceCommands} from '@services/voice';
import {initializeSecurity} from '@services/security';
import {theme} from '@utils/theme';
import LoadingScreen from '@components/common/LoadingScreen';
import ErrorBoundary from '@components/common/ErrorBoundary';

const App: React.FC = () => {
  useEffect(() => {
    // Initialize app services
    const initializeApp = async () => {
      try {
        await initializePushNotifications();
        await initializeVoiceCommands();
        await initializeSecurity();
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();

    // Handle app state changes for security
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background') {
        // Start security timer when app goes to background
        // Implementation in SecurityContext
      } else if (nextAppState === 'active') {
        // Check if security timeout exceeded
        // Implementation in SecurityContext
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{flex: 1}}>
        <ReduxProvider store={store}>
          <PersistGate loading={<LoadingScreen />} persistor={persistor}>
            <ThemeProvider>
              <PaperProvider theme={theme}>
                <SecurityProvider>
                  <AuthProvider>
                    <OfflineProvider>
                      <VoiceProvider>
                        <StatusBar
                          barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
                          backgroundColor="transparent"
                          translucent
                        />
                        <NavigationContainer>
                          <AppNavigator />
                        </NavigationContainer>
                      </VoiceProvider>
                    </OfflineProvider>
                  </AuthProvider>
                </SecurityProvider>
              </PaperProvider>
            </ThemeProvider>
          </PersistGate>
        </ReduxProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

export default App;