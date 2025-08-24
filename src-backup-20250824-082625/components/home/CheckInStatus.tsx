import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Heart } from 'lucide-react';

interface CheckInStatusProps {
  checkedIn: boolean;
}

export const CheckInStatus: React.FC<CheckInStatusProps> = ({ checkedIn }) => {
  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
      <CardContent className="p-4 text-center space-y-2">
        {checkedIn ? (
          <>
            <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <p className="text-gray-600 dark:text-gray-300">You've checked in for today</p>
          </>
        ) : (
          <>
            <p className="text-gray-600 dark:text-gray-300">You haven't checked in yet</p>
            <Button asChild>
              <Link to="/checkin">
                <Heart className="w-4 h-4 mr-2" />
                Start Check-In
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CheckInStatus;
