
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { register } from './services/serviceWorkerRegistration'

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for offline functionality
register({
  onSuccess: () => {
    console.log('Service worker registered successfully');
  },
  onUpdate: () => {
    console.log('New content available, please refresh');
  }
});
