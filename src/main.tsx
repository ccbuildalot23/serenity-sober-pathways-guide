
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App';
import './index.css';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

// Initialize Capacitor for native platforms
if (Capacitor.isNativePlatform()) {
  console.log('Running on native platform:', Capacitor.getPlatform());
  // Initialize native plugins here if needed
}

// Add back ThemeProvider
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
