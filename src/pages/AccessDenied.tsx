import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

const AccessDenied: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-destructive" />
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p data-testid="access-denied-message" className="text-sm text-muted-foreground mb-4">
            You do not have permission to access this area.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => (window.location.href = '/auth')} variant="outline">Sign In</Button>
            <Button onClick={() => (window.location.href = '/patient/dashboard')} variant="default" data-testid="return-to-dashboard">Return to Dashboard</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessDenied;

