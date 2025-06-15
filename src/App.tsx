import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AuthProvider from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Profile from '@/pages/Profile';
import Support from '@/pages/Support';
import CrisisToolkit from '@/pages/CrisisToolkit';
import Settings from '@/pages/Settings';
import Login from '@/pages/Login';
import SignUp from '@/pages/SignUp';
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
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/" element={<Layout><Home /></Layout>} />
              <Route path="/profile" element={<Layout><Profile /></Layout>} />
              <Route path="/support" element={<Layout><Support /></Layout>} />
              <Route path="/crisis-toolkit" element={<Layout><CrisisToolkit /></Layout>} />
              <Route path="/settings" element={<Layout><Settings /></Layout>} />
              <Route path="/check-in" element={<Layout><CheckIn /></Layout>} />
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
