import { Routes, Route, BrowserRouter } from 'react-router-dom';
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
// CRITICAL ROUTES - Load immediately (crisis features and auth)
import CrisisHelp from '@/pages/CrisisHelp';
import EnhancedCrisisSystem from '@/components/crisis/EnhancedCrisisSystem';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Login from '@/pages/Login';
import Auth from '@/pages/Auth';
import HomePage from '@/pages/HomePage';

// LAZY LOADED ROUTES - Load on demand to reduce bundle size
// Auth Pages
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));

// Landing Pages
const Platform = lazy(() => import('@/pages/Platform'));
const Providers = lazy(() => import('@/pages/Providers'));
const Pilot = lazy(() => import('@/pages/Pilot'));
const Contact = lazy(() => import('@/pages/Contact'));
const ProviderSignup = lazy(() => import('@/pages/ProviderSignup'));
const SupporterSignup = lazy(() => import('@/pages/SupporterSignup'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('@/pages/TermsOfService'));

// Core Patient Features - Priority loading
const DashboardRouter = lazy(() => import('@/components/DashboardRouter'));
const PatientDashboard = lazy(() => import('@/pages/PatientDashboard'));
const CheckIn = lazy(() => import('@/pages/CheckIn'));
const PeerSupport = lazy(() => import('@/pages/PeerSupport'));
const Calendar = lazy(() => import('@/pages/Calendar'));
const Progress = lazy(() => import('@/pages/Progress'));

// Support & Provider Features
const SupportDashboard = lazy(() => import('@/pages/SupportDashboard'));
const ProviderDashboard = lazy(() => import('@/pages/ProviderDashboard'));

// Recovery Tools - Secondary priority
const Motivation = lazy(() => import('@/pages/Motivation'));
const AccountabilityPartners = lazy(() => import('@/pages/AccountabilityPartners'));
const RecoveryPlanning = lazy(() => import('@/pages/RecoveryPlanning'));
const RelapsePreventionPage = lazy(() => import('@/pages/RelapsePrevention'));
const CrisisSupport = lazy(() => import('@/pages/CrisisSupport'));

// Clinical & Admin Features - Lowest priority
const ClinicalProtocols = lazy(() => import('@/pages/ClinicalProtocols'));
const RegulatoryCompliance = lazy(() => import('@/pages/RegulatoryCompliance'));
const PeerSupervision = lazy(() => import('@/pages/PeerSupervision'));
const PracticeManagement = lazy(() => import('@/pages/PracticeManagement'));
const RoleManagement = lazy(() => import('@/components/admin/RoleManagement'));
const CrisisIntervention = lazy(() => import('@/pages/CrisisIntervention'));
const MobileCrisis = lazy(() => import('@/pages/MobileCrisis'));
const DataExport = lazy(() => import('@/pages/DataExport'));
const Analytics = lazy(() => import('@/pages/Analytics').then(module => ({ default: module.Analytics })));
const HIPAASecurityDashboard = lazy(() => import('@/pages/HIPAASecurityDashboard'));
const InfrastructureMonitoringDashboard = lazy(() => import('@/components/infrastructure/InfrastructureMonitoringDashboard').then(module => ({ default: module.InfrastructureMonitoringDashboard })));
const NotificationManagement = lazy(() => import('@/pages/NotificationManagement'));
const Community = lazy(() => import('@/pages/Community'));
const Moderation = lazy(() => import('@/pages/Moderation'));
const VoiceSupport = lazy(() => import('@/pages/VoiceSupport'));
const ComplianceManagement = lazy(() => import('@/pages/ComplianceManagement'));
const PilotReadinessAssessment = lazy(() => import('@/pages/PilotReadinessAssessment'));
const SecurityFixesStatus = lazy(() => import('@/pages/SecurityFixesStatus'));
const ComprehensiveSupportPage = lazy(() => import('@/pages/ComprehensiveSupportPage').then(module => ({ default: module.ComprehensiveSupportPage })));
const SecurityAudit = lazy(() => import('@/pages/SecurityAudit'));

const queryClient = new QueryClient();

function App() {
  // Initialize security on app start
  useEffect(() => {
    const initializeSecurity = async () => {
      await EnhancedSecurityInitializer.initialize();
      await EnhancedSecurityAuditService.logSecurityHardening();
    };
    
    initializeSecurity();
  }, []);

  return (
    <HealthcareErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RealtimeNotifications />
          <Toaster />
          <BrowserRouter>
            <SessionTimeoutManager />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/platform" element={<Platform />} />
              <Route path="/providers" element={<Providers />} />
              <Route path="/pilot" element={<Pilot />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/provider-signup" element={<ProviderSignup />} />
              <Route path="/supporter-signup" element={<SupporterSignup />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />

              {/* Crisis Routes - Always accessible */}
              <Route path="/crisis" element={<CrisisHelp />} />
              <Route path="/crisis-help" element={<CrisisHelp />} />
              <Route path="/crisis-support" element={<CrisisSupport />} />
              <Route path="/crisis-intervention" element={<CrisisIntervention />} />
              <Route path="/mobile-crisis" element={<MobileCrisis />} />
              <Route path="/enhanced-crisis-system" element={<EnhancedCrisisSystem />} />

              {/* Protected Patient Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingState />}>
                    <DashboardRouter />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/patient/dashboard" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingState />}>
                    <PatientDashboard />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/checkin" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingState />}>
                    <CheckIn />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/peer-support" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingState />}>
                    <PeerSupport />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/calendar" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingState />}>
                    <Calendar />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/progress" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingState />}>
                    <Progress />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/motivation" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingState />}>
                    <Motivation />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/accountability-partners" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingState />}>
                    <AccountabilityPartners />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/recovery-planning" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingState />}>
                    <RecoveryPlanning />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/relapse-prevention" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingState />}>
                    <RelapsePreventionPage />
                  </Suspense>
                </ProtectedRoute>
              } />

              {/* Protected Provider Routes */}
              <Route path="/provider/dashboard" element={
                <ProtectedRoute requiredRole="provider">
                  <Suspense fallback={<LoadingState />}>
                    <ProviderDashboard />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/clinical-protocols" element={
                <ProtectedRoute requiredRole="provider">
                  <Suspense fallback={<LoadingState />}>
                    <ClinicalProtocols />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/regulatory-compliance" element={
                <ProtectedRoute requiredRole="provider">
                  <Suspense fallback={<LoadingState />}>
                    <RegulatoryCompliance />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/peer-supervision" element={
                <ProtectedRoute requiredRole="provider">
                  <Suspense fallback={<LoadingState />}>
                    <PeerSupervision />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/practice-management" element={
                <ProtectedRoute requiredRole="provider">
                  <Suspense fallback={<LoadingState />}>
                    <PracticeManagement />
                  </Suspense>
                </ProtectedRoute>
              } />

              {/* Protected Supporter Routes */}
              <Route path="/supporter/dashboard" element={
                <ProtectedRoute requiredRole="support_member">
                  <Suspense fallback={<LoadingState />}>
                    <SupportDashboard />
                  </Suspense>
                </ProtectedRoute>
              } />

              {/* Admin Routes */}
              <Route path="/analytics" element={
                <ProtectedRoute requiredRole="admin">
                  <Suspense fallback={<LoadingState />}>
                    <Analytics />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/security-audit" element={
                <ProtectedRoute requiredRole="admin">
                  <Suspense fallback={<LoadingState />}>
                    <SecurityAudit />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/hipaa-security-dashboard" element={
                <ProtectedRoute requiredRole="admin">
                  <Suspense fallback={<LoadingState />}>
                    <HIPAASecurityDashboard />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/infrastructure-monitoring" element={
                <ProtectedRoute requiredRole="admin">
                  <Suspense fallback={<LoadingState />}>
                    <InfrastructureMonitoringDashboard />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/notification-management" element={
                <ProtectedRoute requiredRole="admin">
                  <Suspense fallback={<LoadingState />}>
                    <NotificationManagement />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/community" element={
                <ProtectedRoute requiredRole="admin">
                  <Suspense fallback={<LoadingState />}>
                    <Community />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/moderation" element={
                <ProtectedRoute requiredRole="admin">
                  <Suspense fallback={<LoadingState />}>
                    <Moderation />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/voice-support" element={
                <ProtectedRoute requiredRole="admin">
                  <Suspense fallback={<LoadingState />}>
                    <VoiceSupport />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/compliance-management" element={
                <ProtectedRoute requiredRole="admin">
                  <Suspense fallback={<LoadingState />}>
                    <ComplianceManagement />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/pilot-readiness-assessment" element={
                <ProtectedRoute requiredRole="admin">
                  <Suspense fallback={<LoadingState />}>
                    <PilotReadinessAssessment />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/security-fixes-status" element={
                <ProtectedRoute requiredRole="admin">
                  <Suspense fallback={<LoadingState />}>
                    <SecurityFixesStatus />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/comprehensive-support" element={
                <ProtectedRoute requiredRole="admin">
                  <Suspense fallback={<LoadingState />}>
                    <ComprehensiveSupportPage />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/role-management" element={
                <ProtectedRoute requiredRole="admin">
                  <Suspense fallback={<LoadingState />}>
                    <RoleManagement />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/data-export" element={
                <ProtectedRoute requiredRole="admin">
                  <Suspense fallback={<LoadingState />}>
                    <DataExport />
                  </Suspense>
                </ProtectedRoute>
              } />

              {/* Catch-all route */}
              <Route path="*" element={<HomePage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </HealthcareErrorBoundary>
  );
}

export default App;