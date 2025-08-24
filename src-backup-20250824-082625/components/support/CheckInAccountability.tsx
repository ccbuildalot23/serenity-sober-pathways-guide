import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Bell } from 'lucide-react';
import { toast } from 'sonner';

const CheckInAccountability: React.FC = () => {
  const handleSetupAccountability = () => {
    toast.info('Accountability partners feature coming soon');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Check-In Accountability
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          Set up regular check-ins with accountability partners
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={handleSetupAccountability} variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule
          </Button>
          <Button onClick={handleSetupAccountability} variant="outline">
            <Bell className="w-4 h-4 mr-2" />
            Reminders
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CheckInAccountability;
