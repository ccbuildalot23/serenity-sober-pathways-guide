import React, { lazy, Suspense } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import LoadingState from '@/components/LoadingState';

// Lazy load legal pages
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('@/pages/TermsOfService'));

// Main router component for legal pages
const LegalRouter = () => {
  const { page } = useParams<{ page: string }>();
  
  // Route to specific legal page
  const renderPage = () => {
    switch (page) {
      case 'privacy':
        return <PrivacyPolicy />;
      case 'terms':
        return <TermsOfService />;
      default:
        // Invalid page, redirect to privacy
        return <Navigate to="/legal/privacy" replace />;
    }
  };
  
  return (
    <Suspense fallback={<LoadingState message="Loading legal information..." />}>
      {renderPage()}
    </Suspense>
  );
};

export default LegalRouter;