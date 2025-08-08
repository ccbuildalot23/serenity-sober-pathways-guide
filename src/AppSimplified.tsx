import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { useEffect, Suspense, lazy } from 'react';
import { EnhancedSecurityInitializer } from '@/lib/enhancedSecurityInitializer';
import { EnhancedSecurityAuditService } from '@/services/EnhancedSecurityAuditService';
import RealtimeNotifications from '@/components/RealtimeNotifications';
import { Toaster } from '@/components/ui/sonner';
import { HealthcareErrorBoundary } from '@/components/HealthcareErrorBoundary';
import { SessionTimeoutManager } from '@/components/SessionTimeoutManager';
import LoadingState from '@/components/LoadingState';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// CRITICAL ROUTES - Load immediately
import HomePage from '@/pages/HomePage';
import Auth from '@/pages/Auth';
import CrisisHelp from '@/pages/CrisisHelp';

// LAZY LOADED ROUTES - Load on demand
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const DashboardRouter = lazy(() => import('@/components/DashboardRouter'));
const CheckIn = lazy(() => import('@/pages/CheckIn'));
const Calendar = lazy(() => import('@/pages/Calendar'));
const Progress = lazy(() => import('@/pages/Progress'));

// ROUTER COMPONENTS - Consolidated routes
const ToolsRouter = lazy(() => import('@/components/routers/ToolsRouter'));
const SupportRouter = lazy(() => import('@/components/routers/SupportRouter'));
const ClinicalRouter = lazy(() => import('@/components/routers/ClinicalRouter'));
const AdminRouter = lazy(() => import('@/components/routers/AdminRouter'));
const LegalRouter = lazy(() => import('@/components/routers/LegalRouter'));

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
      retry: 3,
      _retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

function App() {
  useEffect(() => {
    // Initialize security services
    EnhancedSecurityInitializer.initialize();
    
    // Log application startup
    EnhancedSecurityAuditService.logDataAccessEvent('system', 'STARTUP', 1)
      .catch(console.error);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <HealthcareErrorBoundary>
            <SessionTimeoutManager>
              <RealtimeNotifications />
              <Toaster />
              
              <Suspense fallback={<LoadingState />}>
                <Routes>
                  {/* ========== PUBLIC ROUTES (4) ========== */}
                  
                  {/* Landing Page */}
                  <Route path="/" element={<HomePage />} />
                  
                  {/* Authentication */}
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  
                  {/* Crisis Help (_Public) */}
                  <Route path="/crisis-help" element={<CrisisHelp />} />
                  
                  {/* Legal Pages */}
                  <Route path="/legal/:page" element={
                    <Suspense fallback={<LoadingState />}>
                      <LegalRouter />
                    </Suspense>
                  } />
                  
                  {/* ========== AUTHENTICATED ROUTES (7) ========== */}
                  
                  {/* Dashboard - Role Based */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Suspense fallback={<LoadingState message="Loading your dashboard..." />}>
                        <DashboardRouter />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                  
                  {/* Recovery Tools */}
                  <Route path="/tools/*" element={
                    <ProtectedRoute>
                      <Suspense fallback={<LoadingState message="Loading recovery tools..." />}>
                        <ToolsRouter />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                  
                  {/* Support Services */}
                  <Route path="/support/*" element={
                    <ProtectedRoute>
                      <Suspense fallback={<LoadingState message="Loading support services..." />}>
                        <SupportRouter />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                  
                  {/* Check-In */}
                  <Route path="/checkin" element={
                    <ProtectedRoute>
                      <Suspense fallback={<LoadingState message="Loading check-in..." />}>
                        <CheckIn />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                  
                  {/* Calendar */}
                  <Route path="/calendar" element={
                    <ProtectedRoute>
                      <Suspense fallback={<LoadingState message="Loading calendar..." />}>
                        <Calendar />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                  
                  {/* Progress Tracking */}
                  <Route path="/progress" element={
                    <ProtectedRoute>
                      <Suspense fallback={<LoadingState message="Loading progress..." />}>
                        <Progress />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                  
                  {/* ========== PROVIDER/ADMIN ROUTES (2) ========== */}
                  
                  {/* Clinical Tools */}
                  <Route path="/clinical/*" element={
                    <ProtectedRoute>
                      <Suspense fallback={<LoadingState message="Loading clinical tools..." />}>
                        <ClinicalRouter />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                  
                  {/* Admin Tools */}
                  <Route path="/admin/*" element={
                    <ProtectedRoute>
                      <Suspense fallback={<LoadingState message="Loading admin tools..." />}>
                        <AdminRouter />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                  
                  {/* ========== REDIRECT ROUTES (Backward Compatibility) ========== */}
                  
                  {/* Auth redirects */}
                  <Route path="/login" element={<Navigate to="/auth" replace />} />
                  <Route path="/privacy" element={<Navigate to="/legal/privacy" replace />} />
                  <Route path="/terms" element={<Navigate to="/legal/terms" replace />} />
                  
                  {/* Tool redirects */}
                  <Route path="/motivation" element={<Navigate to="/tools/motivation" replace />} />
                  <Route path="/accountability" element={<Navigate to="/tools/accountability" replace />} />
                  <Route path="/planning" element={<Navigate to="/tools/planning" replace />} />
                  <Route path="/relapse-prevention" element={<Navigate to="/tools/relapse-prevention" replace />} />
                  
                  {/* Support redirects */}
                  <Route path="/peer-support" element={<Navigate to="/support/peer" replace />} />
                  <Route path="/crisis-support" element={<Navigate to="/support/crisis" replace />} />
                  <Route path="/voice-support" element={<Navigate to="/support/voice" replace />} />
                  <Route path="/community" element={<Navigate to="/support/community" replace />} />
                  
                  {/* Clinical redirects */}
                  <Route path="/clinical-protocols" element={<Navigate to="/clinical/protocols" replace />} />
                  <Route path="/crisis-intervention" element={<Navigate to="/clinical/intervention" replace />} />
                  <Route path="/mobile-crisis" element={<Navigate to="/clinical/mobile-crisis" replace />} />
                  <Route path="/peer-supervision" element={<Navigate to="/clinical/supervision" replace />} />
                  <Route path="/practice-management" element={<Navigate to="/clinical/practice" replace />} />
                  
                  {/* Admin redirects */}
                  <Route path="/role-management" element={<Navigate to="/admin/roles" replace />} />
                  <Route path="/regulatory-compliance" element={<Navigate to="/admin/compliance" replace />} />
                  <Route path="/data-export" element={<Navigate to="/admin/data" replace />} />
                  <Route path="/hipaa-security" element={<Navigate to="/admin/security" replace />} />
                  <Route path="/infrastructure-monitoring" element={<Navigate to="/admin/monitoring" replace />} />
                  
                  {/* Dashboard redirects */}
                  <Route path="/patient" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/provider" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/support" element={<Navigate to="/dashboard" replace />} />
                  
                  {/* Catch all - redirect to home */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </SessionTimeoutManager>
          </HealthcareErrorBoundary>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;