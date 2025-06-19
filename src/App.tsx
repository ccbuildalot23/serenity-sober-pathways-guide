import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import Home from '@/pages/Home';
import CheckIn from '@/pages/CheckIn';
import EnhancedCalendarPage from '@/pages/EnhancedCalendar';
import Progress from '@/pages/Progress';
import Support from '@/pages/Support';
import CrisisToolkit from '@/pages/CrisisToolkit';
import Settings from '@/pages/Settings';
import Login from '@/pages/Login';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } />
            <Route path="/checkin" element={
              <ProtectedRoute>
                <CheckIn />
              </ProtectedRoute>
            } />
            <Route path="/calendar" element={
              <ProtectedRoute>
                <EnhancedCalendarPage />
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
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
