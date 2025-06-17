
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
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

function App() {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProductionMonitor>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/test-realtime" element={<RealtimeConnectionTest />} />
              <Route path="/test-minimal" element={<MinimalRealtimeExample />} />
              <Route path="/" element={<Index />} />
              <Route path="/support" element={<Support />} />
              <Route path="/crisis-toolkit" element={<CrisisToolkit />} />
              <Route path="/settings" element={<Settings />} />
              {/* Check-in route should match navigation path */}
              <Route path="/checkin" element={<CheckIn />} />
            </Routes>
            <Toaster />
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
