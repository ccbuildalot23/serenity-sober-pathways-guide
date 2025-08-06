
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { EnhancedSecurityInitializer } from '@/lib/enhancedSecurityInitializer';
import { EnhancedSecurityAuditService } from '@/services/enhancedSecurityAuditService';
import RealtimeNotifications from '@/components/RealtimeNotifications';
import { Toaster } from '@/components/ui/sonner';
import { HealthcareErrorBoundary } from '@/components/HealthcareErrorBoundary';
import { SessionTimeoutManager } from '@/components/SessionTimeoutManager';
// New Landing Pages
import HomePage from '@/pages/HomePage';
import Platform from '@/pages/Platform';
import Providers from '@/pages/Providers';
import Pilot from '@/pages/Pilot';
import Contact from '@/pages/Contact';
import ProviderSignup from '@/pages/ProviderSignup';
import SupporterSignup from '@/pages/SupporterSignup';
// MVP Core Pages
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Auth from '@/pages/Auth';
import DashboardRouter from '@/components/DashboardRouter';
import PatientDashboard from '@/pages/PatientDashboard';
import SupportDashboard from '@/pages/SupportDashboard';
import ProviderDashboard from '@/pages/ProviderDashboard';
import CheckIn from '@/pages/CheckIn';
import PeerSupport from '@/pages/PeerSupport';
import Motivation from '@/pages/Motivation';
import AccountabilityPartners from '@/pages/AccountabilityPartners';
import RecoveryPlanning from '@/pages/RecoveryPlanning';
import RelapsePreventionPage from '@/pages/RelapsePrevention';
import ClinicalProtocols from '@/pages/ClinicalProtocols';
import RegulatoryCompliance from '@/pages/RegulatoryCompliance';
import PeerSupervision from '@/pages/PeerSupervision';
import PracticeManagement from '@/pages/PracticeManagement';
import RoleManagement from '@/components/admin/RoleManagement';
import CrisisIntervention from '@/pages/CrisisIntervention';
import MobileCrisis from '@/pages/MobileCrisis';
import MobileCrisisDemo from '@/components/demo/MobileCrisisDemo';
import DataExport from '@/pages/DataExport';
import { Analytics } from '@/pages/Analytics';
import { TestFeatures } from '@/pages/TestFeatures';
import HIPAASecurityDashboard from '@/pages/HIPAASecurityDashboard';
import { InfrastructureMonitoringDashboard } from '@/components/infrastructure/InfrastructureMonitoringDashboard';
import NotificationManagement from '@/pages/NotificationManagement';
import IntegrationTesting from '@/pages/IntegrationTesting';
import Community from '@/pages/Community';
import Moderation from '@/pages/Moderation';
import TestDashboard from '@/pages/TestDashboard';
import VoiceSupport from '@/pages/VoiceSupport';
import ComplianceManagement from '@/pages/ComplianceManagement';
import PilotReadinessAssessment from '@/pages/PilotReadinessAssessment';
import SecurityFixesStatus from '@/pages/SecurityFixesStatus';
import CrisisSupport from '@/pages/CrisisSupport';
import { ComprehensiveSupportPage } from '@/pages/ComprehensiveSupportPage';
import { TestCrisisPage } from '@/pages/TestCrisisPage';
import SecurityAudit from '@/pages/SecurityAudit';
import TestSupportDashboard from '@/pages/TestSupportDashboard';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Commented out for MVP - keeping functionality but focusing on core features
import Calendar from '@/pages/Calendar';
import Progress from '@/pages/Progress';
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
            <SessionTimeoutManager>
              <Routes>
                {/* Public Landing Pages */}
                <Route path="/" element={<HomePage />} />
                <Route path="/platform" element={<Platform />} />
                <Route path="/providers" element={<Providers />} />
                <Route path="/pilot" element={<Pilot />} />
                <Route path="/contact" element={<Contact />} />
            <Route path="/provider-signup" element={<ProviderSignup />} />
            <Route path="/supporter-signup" element={<SupporterSignup />} />
                
                {/* Auth and Dashboard Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={
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
                <Route path="/peer-support" element={
                  <ProtectedRoute>
                    <PeerSupport />
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
                <Route path="/demo/mobile-crisis" element={
                  <ProtectedRoute>
                    <div className="min-h-screen bg-background">
                      <MobileCrisisDemo />
                    </div>
                  </ProtectedRoute>
                } />
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
                <Route path="/test-dashboard" element={
                  <ProtectedRoute>
                    <TestDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/progress" element={
                  <ProtectedRoute>
                    <Progress />
                  </ProtectedRoute>
                } />
                <Route path="/analytics" element={
                  <ProtectedRoute>
                    <Analytics />
                  </ProtectedRoute>
                } />
                <Route path="/test-features" element={
                  <ProtectedRoute>
                    <TestFeatures />
                  </ProtectedRoute>
                } />
                <Route path="/notification-management" element={
                  <ProtectedRoute>
                    <NotificationManagement />
                  </ProtectedRoute>
                } />
                <Route path="/integration-testing" element={
                  <ProtectedRoute>
                    <IntegrationTesting />
                  </ProtectedRoute>
                } />
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
                <Route path="/test-crisis" element={
                  <ProtectedRoute>
                    <TestCrisisPage />
                  </ProtectedRoute>
                } />
                <Route path="/test-support" element={
                  <ProtectedRoute>
                    <TestSupportDashboard />
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
                    <Calendar />
                  </ProtectedRoute>
                } />
                <Route path="/crisis-toolkit" element={
                  <ProtectedRoute>
                    <CrisisSupport />
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
            </SessionTimeoutManager>
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </HealthcareErrorBoundary>
  );
}

export default App;
