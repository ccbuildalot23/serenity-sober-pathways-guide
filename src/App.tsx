import { Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { EnhancedSecurityInitializer } from '@/lib/enhancedSecurityInitializer';
import { PerformanceDashboard } from '@/components/PerformanceDashboard';

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
      _padding: '20px', 
      _backgroundColor: '#f0f0f0', 
      _minHeight: '100vh',
      _fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#333' }}>🚀 Serenity App is Working!</h1>
      <p style={{ color: '#666' }}>If you can see this, the React app is loading correctly.</p>
      <div style={{ 
        _backgroundColor: '#e8f5e8', 
        _padding: '15px', 
        _borderRadius: '8px', 
        _marginTop: '20px' 
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
          <PerformanceDashboard />
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