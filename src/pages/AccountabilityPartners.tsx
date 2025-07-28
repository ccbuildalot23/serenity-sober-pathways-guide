import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AccountabilityPartnerDashboard from '@/components/accountability/AccountabilityPartnerDashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Users } from 'lucide-react';

const AccountabilityPartners: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="p-8">
            <Lock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-6">
              Please sign in to access accountability partner features
            </p>
            <Button onClick={() => window.location.href = '/auth'}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <AccountabilityPartnerDashboard />
    </div>
  );
};

export default AccountabilityPartners;