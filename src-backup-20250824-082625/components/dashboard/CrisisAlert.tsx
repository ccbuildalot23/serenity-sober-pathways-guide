
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface CrisisAlertProps {
  riskLevel: string | null;
}

export const CrisisAlert: React.FC<CrisisAlertProps> = ({ riskLevel }) => {
  // Only render if riskLevel exists
  if (!riskLevel) return null;

  return (
    <Card className="border-orange-500 bg-orange-50 dark:border-orange-600 dark:bg-orange-950">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          <div>
            <h3 className="font-semibold text-orange-800 dark:text-orange-200">Crisis Support Active</h3>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Risk level: {riskLevel}. Support resources are available.
            </p>
          </div>
          <Button 
            size="sm" 
            className="bg-orange-600 hover:bg-orange-700 text-white"
            asChild
          >
            <Link to="/crisis-toolkit" aria-label="Access crisis support tools">View Tools</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
