
import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { requestNotificationPermission } from "@/services/mockPushService";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import EnhancedCrisisSystem from "@/components/crisis/EnhancedCrisisSystem";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AlertHistory from "./pages/AlertHistory";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Request notification permission on app load
    const initNotifications = async () => {
      const granted = await requestNotificationPermission();
      if (granted) {
        console.log('Notification permission granted');
      } else {
        console.log('Notification permission denied or not supported');
      }
    };

    initNotifications();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="/alert-history" element={
                <ProtectedRoute>
                  <AlertHistory />
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            
            {/* Enhanced Crisis System - Available on all authenticated pages */}
            <EnhancedCrisisSystem />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
