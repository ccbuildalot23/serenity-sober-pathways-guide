
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const CrisisSupport: React.FC = () => {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="p-4">
        <div className="text-center space-y-3">
          <h3 className="font-semibold text-red-800">Need Immediate Support?</h3>
          <p className="text-sm text-red-700">
            Crisis tools are always available. Say "Hey Serenity, I need help" or tap below.
          </p>
          <Button 
            className="bg-red-600 hover:bg-red-700"
            asChild
          >
            <Link to="/crisis-toolkit">Access Crisis Toolkit</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
