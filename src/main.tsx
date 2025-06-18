
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { SecurityInitializer } from '@/lib/securityInitializer';

async function startApp(): Promise<void> {
  try {
    await SecurityInitializer.initialize();
  } catch (error) {
    console.warn('Security initialization failed, continuing with app startup:', error);
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>,
  );
}

startApp().catch(error => {
  console.error('Failed to start app:', error);
  // Fallback: render app without security initialization
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>,
  );
});
