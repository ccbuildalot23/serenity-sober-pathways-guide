
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Layout from '@/components/Layout';
import Index from '@/pages/Index';
import Support from '@/pages/Support';
import CrisisToolkit from '@/pages/CrisisToolkit';
import Settings from '@/pages/Settings';
import Auth from '@/pages/Auth';
import CheckIn from '@/pages/CheckIn';
import EnhancedCrisisSystem from '@/components/crisis/EnhancedCrisisSystem';
import RealtimeNotifications from '@/components/RealtimeNotifications';
import ProductionMonitor from '@/components/ProductionMonitor';
import RealtimeConnectionTest from '@/components/RealtimeConnectionTest';
import MinimalRealtimeExample from '@/components/MinimalRealtimeExample';
import RealtimeDebugPanel from '@/components/RealtimeDebugPanel';

// Calendar page placeholder (create this if it doesn't exist)
const Calendar = () => {
  const [activeTab, setActiveTab] = useState('calendar');
  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="p-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
          Calendar
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Calendar feature coming soon...
        </p>
      </div>
    </Layout>
  );
};

function App() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 10, // 10 minutes (replaced cacheTime)
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProductionMonitor>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/auth" element={<Auth />} />
              
              {/* Test routes */}
              <Route path="/test-realtime" element={<RealtimeConnectionTest />} />
              <Route path="/test-minimal" element={<MinimalRealtimeExample />} />
              
              {/* Protected routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
              
              <Route path="/calendar" element={
                <ProtectedRoute>
                  <Calendar />
                </ProtectedRoute>
              } />
              
              <Route path="/checkin" element={
                <ProtectedRoute>
                  <CheckIn />
                </ProtectedRoute>
              } />
              
              <Route path="/support" element={
                <ProtectedRoute>
                  <Support />
                </ProtectedRoute>
              } />
              
              <Route path="/crisis-toolkit" element={
                <ProtectedRoute>
                  <CrisisToolkit />
                </ProtectedRoute>
              } />
              
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              
              {/* Catch all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            
            {/* Global components */}
            <Toaster position="top-center" />
            <RealtimeNotifications />
            <EnhancedCrisisSystem />
            <RealtimeDebugPanel />
          </BrowserRouter>
        </ProductionMonitor>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
