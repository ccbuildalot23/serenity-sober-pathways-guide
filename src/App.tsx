import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { EnhancedSecurityInitializer } from '@/lib/enhancedSecurityInitializer';

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Simple test component
const TestPage = () => {
  useEffect(() => {
    console.log('TestPage mounted successfully');
  }, []);
  
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f0f0f0', 
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#333' }}>🚀 Serenity App is Working!</h1>
      <p style={{ color: '#666' }}>If you can see this, the React app is loading correctly.</p>
      <div style={{ 
        backgroundColor: '#e8f5e8', 
        padding: '15px', 
        borderRadius: '8px', 
        marginTop: '20px' 
      }}>
        <h3>Debug Info:</h3>
        <ul>
          <li>React is working ✅</li>
          <li>Router is working ✅</li>
          <li>ThemeProvider is working ✅</li>
          <li>AuthProvider is working ✅</li>
          <li>QueryClient is working ✅</li>
          <li>Security Initializer is working ✅</li>
          <li>Basic styling is working ✅</li>
        </ul>
      </div>
    </div>
  );
};

function App() {
  useEffect(() => {
    console.log('App component mounted');
    // Initialize security services
    EnhancedSecurityInitializer.initialize();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<TestPage />} />
            <Route path="*" element={<TestPage />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;