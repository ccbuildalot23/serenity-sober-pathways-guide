
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const CrisisSupport: React.FC = () => {
  return (
    <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
      <CardContent className="p-4">
        <div className="text-center space-y-3">
          <h3 className="font-semibold text-red-800 dark:text-red-200">Need Immediate Support?</h3>
          <p className="text-sm text-red-700 dark:text-red-300">
            Crisis tools are always available. Say "Hey Serenity, I need help" or tap below.
          </p>
          <Button 
            className="btn-destructive"
            asChild
          >
            <Link 
              to="/crisis-toolkit"
              aria-label="Access crisis support toolkit with emergency resources"
            >
              Access Crisis Toolkit
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
