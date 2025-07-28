
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { SecurityInitializer } from '@/lib/securityInitializer';
import { EnhancedSecurityAuditService } from '@/services/enhancedSecurityAuditService';
// MVP Core Pages
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Auth from '@/pages/Auth';
import DashboardRouter from '@/components/DashboardRouter';
import PatientDashboard from '@/pages/PatientDashboard';
import SupportDashboard from '@/pages/SupportDashboard';
import ProviderDashboard from '@/pages/ProviderDashboard';
import CheckIn from '@/pages/CheckIn';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Commented out for MVP - keeping functionality but focusing on core features
// import Calendar from '@/pages/Calendar';
// import Progress from '@/pages/Progress';
// import Support from '@/pages/Support';
// import CrisisToolkit from '@/pages/CrisisToolkit';
// import Settings from '@/pages/Settings';
// import ManageTriggers from '@/pages/ManageTriggers';
// import ClinicalDirectory from '@/pages/ClinicalDirectory';

const queryClient = new QueryClient();

function App() {
  // Initialize security on app start
  useEffect(() => {
    const initializeSecurity = async () => {
      await SecurityInitializer.initialize();
      await EnhancedSecurityAuditService.logSecurityHardening();
    };
    
    initializeSecurity();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* MVP Core Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            } />
            <Route path="/patient" element={
              <ProtectedRoute>
                <PatientDashboard />
              </ProtectedRoute>
            } />
            <Route path="/support" element={
              <ProtectedRoute>
                <SupportDashboard />
              </ProtectedRoute>
            } />
            <Route path="/provider" element={
              <ProtectedRoute>
                <ProviderDashboard />
              </ProtectedRoute>
            } />
            <Route path="/checkin" element={
              <ProtectedRoute>
                <CheckIn />
              </ProtectedRoute>
            } />
            
            {/* Commented out non-MVP routes - keeping for future use
            <Route path="/calendar" element={
              <ProtectedRoute>
                <Calendar />
              </ProtectedRoute>
            } />
            <Route path="/progress" element={
              <ProtectedRoute>
                <Progress />
              </ProtectedRoute>
            } />
            <Route path="/support" element={
              <ProtectedRoute>
                <Support />
              </ProtectedRoute>
            } />
            <Route path="/triggers/manage" element={
              <ProtectedRoute>
                <ManageTriggers />
              </ProtectedRoute>
            } />
            <Route path="/crisis-toolkit" element={
              <ProtectedRoute>
                <CrisisToolkit />
              </ProtectedRoute>
            } />
            <Route path="/clinical-resources" element={
              <ProtectedRoute>
                <ClinicalDirectory />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            */}
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
