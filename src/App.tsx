
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
          <Router>
            <EnhancedCrisisSystem />
            <SessionTimeoutManager>
              <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center">
                  <LoadingState message="Loading your support tools..." />
                </div>
              }>
                <Routes>
                {/* Critical Crisis Help - No Auth Required */}
                <Route path="/crisis-help" element={<CrisisHelp />} />
                
                {/* Legal Pages - No Auth Required */}
                <Route path="/privacy" element={
                  <Suspense fallback={<LoadingState message="Loading privacy policy..." />}>
                    <PrivacyPolicy />
                  </Suspense>
                } />
                <Route path="/terms" element={
                  <Suspense fallback={<LoadingState message="Loading terms of service..." />}>
                    <TermsOfService />
                  </Suspense>
                } />
                
                {/* Public Landing Pages */}
                <Route path="/" element={<HomePage />} />
                <Route path="/platform" element={
                  <Suspense fallback={<LoadingState message="Loading platform information..." />}>
                    <Platform />
                  </Suspense>
                } />
                <Route path="/providers" element={
                  <Suspense fallback={<LoadingState message="Loading provider information..." />}>
                    <Providers />
                  </Suspense>
                } />
                <Route path="/pilot" element={
                  <Suspense fallback={<LoadingState message="Loading pilot program details..." />}>
                    <Pilot />
                  </Suspense>
                } />
                <Route path="/contact" element={
                  <Suspense fallback={<LoadingState message="Loading contact information..." />}>
                    <Contact />
                  </Suspense>
                } />
                <Route path="/provider-signup" element={
                  <Suspense fallback={<LoadingState message="Preparing provider registration..." />}>
                    <ProviderSignup />
                  </Suspense>
                } />
                <Route path="/supporter-signup" element={
                  <Suspense fallback={<LoadingState message="Preparing supporter registration..." />}>
                    <SupporterSignup />
                  </Suspense>
                } />
                
                {/* Auth and Dashboard Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={
                  <Suspense fallback={<LoadingState />}>
                    <ResetPassword />
                  </Suspense>
                } />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingState message="Loading your dashboard..." />}>
                      <DashboardRouter />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/patient" element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingState message="Loading your recovery dashboard..." />}>
                      <PatientDashboard />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/support" element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingState message="Loading support dashboard..." />}>
                      <SupportDashboard />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/provider" element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingState message="Loading provider dashboard..." />}>
                      <ProviderDashboard />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/checkin" element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingState message="Preparing your daily check-in..." />}>
                      <CheckIn />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/peer-support" element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingState message="Connecting you with peer support..." />}>
                      <PeerSupport />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/motivation" element={
                  <ProtectedRoute>
                    <Motivation />
                  </ProtectedRoute>
                } />
                <Route path="/accountability" element={
                  <ProtectedRoute>
                    <AccountabilityPartners />
                  </ProtectedRoute>
                } />
                <Route path="/planning" element={
                  <ProtectedRoute>
                    <RecoveryPlanning />
                  </ProtectedRoute>
                } />
                <Route path="/relapse-prevention" element={
                  <ProtectedRoute>
                    <RelapsePreventionPage />
                  </ProtectedRoute>
                } />
                <Route path="/clinical-protocols" element={
                  <ProtectedRoute>
                    <ClinicalProtocols />
                  </ProtectedRoute>
                } />
                <Route path="/regulatory-compliance" element={
                  <ProtectedRoute>
                    <RegulatoryCompliance />
                  </ProtectedRoute>
                } />
                <Route path="/peer-supervision" element={
                  <ProtectedRoute>
                    <PeerSupervision />
                  </ProtectedRoute>
                } />
                <Route path="/practice-management" element={
                  <ProtectedRoute>
                    <PracticeManagement />
                  </ProtectedRoute>
                } />
                <Route path="/role-management" element={
                  <ProtectedRoute>
                    <RoleManagement />
                  </ProtectedRoute>
                } />
                <Route path="/crisis-intervention" element={
                  <ProtectedRoute>
                    <CrisisIntervention />
                  </ProtectedRoute>
                } />
                <Route path="/mobile-crisis" element={
                  <ProtectedRoute>
                    <MobileCrisis />
                  </ProtectedRoute>
                } />
                <Route path="/data-export" element={
                  <ProtectedRoute>
                    <DataExport />
                  </ProtectedRoute>
                } />
                {/* Commented out - MobileCrisisDemo component missing
                <Route path="/demo/mobile-crisis" element={
                  <ProtectedRoute>
                    <div className="min-h-screen bg-background">
                      <MobileCrisisDemo />
                    </div>
                  </ProtectedRoute>
                } /> */}
                <Route path="/hipaa-security" element={
                  <ProtectedRoute>
                    <HIPAASecurityDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/community" element={
                  <ProtectedRoute>
                    <Community />
                  </ProtectedRoute>
                } />
                <Route path="/moderation" element={
                  <ProtectedRoute>
                    <Moderation />
                  </ProtectedRoute>
                } />
                <Route path="/voice-support" element={
                  <ProtectedRoute>
                    <VoiceSupport />
                  </ProtectedRoute>
                } />
                {/* Commented out - TestDashboard component missing
                <Route path="/test-dashboard" element={
                  <ProtectedRoute>
                    <TestDashboard />
                  </ProtectedRoute>
                } /> */}
                <Route path="/progress" element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingState message="Calculating your progress..." />}>
                      <Progress />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/analytics" element={
                  <ProtectedRoute>
                    <Analytics />
                  </ProtectedRoute>
                } />
                <Route path="/notification-management" element={
                  <ProtectedRoute>
                    <NotificationManagement />
                  </ProtectedRoute>
                } />
                {/* Commented out - IntegrationTesting component missing
                <Route path="/integration-testing" element={
                  <ProtectedRoute>
                    <IntegrationTesting />
                  </ProtectedRoute>
                } /> */}
                <Route path="/compliance-management" element={
                  <ProtectedRoute>
                    <ComplianceManagement />
                  </ProtectedRoute>
                } />
                <Route path="/pilot-readiness" element={
                  <ProtectedRoute>
                    <PilotReadinessAssessment />
                  </ProtectedRoute>
                } />
                <Route path="/security-fixes" element={
                  <ProtectedRoute>
                    <SecurityFixesStatus />
                  </ProtectedRoute>
                } />
                <Route path="/crisis-support" element={
                  <ProtectedRoute>
                    <CrisisSupport />
                  </ProtectedRoute>
                } />
                <Route path="/comprehensive-support" element={
                  <ProtectedRoute>
                    <ComprehensiveSupportPage />
                  </ProtectedRoute>
                } />
                <Route path="/security-audit" element={
                  <ProtectedRoute>
                    <SecurityAudit />
                  </ProtectedRoute>
                } />
                <Route path="/infrastructure-monitoring" element={
                  <ProtectedRoute>
                    <InfrastructureMonitoringDashboard />
                  </ProtectedRoute>
                } />
                {/* Critical routes that are being navigated to */}
                <Route path="/calendar" element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingState message="Loading your recovery calendar..." />}>
                      <Calendar />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/crisis-toolkit" element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingState message="Loading your crisis support toolkit..." showEncouragement={true} />}>
                      <CrisisSupport />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <div className="p-4 max-w-4xl mx-auto">
                      <h1 className="text-2xl font-bold mb-4">Settings</h1>
                      <p className="text-muted-foreground">Settings page coming soon...</p>
                    </div>
                  </ProtectedRoute>
                } />
                </Routes>
              </Suspense>
            </SessionTimeoutManager>
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </HealthcareErrorBoundary>
  );
}

export default App;
