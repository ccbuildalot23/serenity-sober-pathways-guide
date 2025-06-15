
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

function App() {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProductionMonitor>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={
                <Layout activeTab="dashboard" onTabChange={() => {}}>
                  <Index />
                </Layout>
              } />
              <Route path="/support" element={
                <Layout activeTab="support" onTabChange={() => {}}>
                  <Support />
                </Layout>
              } />
              <Route path="/crisis-toolkit" element={
                <Layout activeTab="resources" onTabChange={() => {}}>
                  <CrisisToolkit />
                </Layout>
              } />
              <Route path="/settings" element={
                <Layout activeTab="settings" onTabChange={() => {}}>
                  <Settings />
                </Layout>
              } />
              <Route path="/check-in" element={
                <Layout activeTab="checkin" onTabChange={() => {}}>
                  <CheckIn />
                </Layout>
              } />
            </Routes>
            <Toaster />
            <RealtimeNotifications />
            <EnhancedCrisisSystem />
          </BrowserRouter>
        </ProductionMonitor>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
