
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, User } from 'lucide-react';

const UserProfile: React.FC = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  if (!user) return null;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-gray-600">Email</p>
          <p className="font-medium">{user.email}</p>
        </div>
        {user.user_metadata?.full_name && (
          <div>
            <p className="text-sm text-gray-600">Name</p>
            <p className="font-medium">{user.user_metadata.full_name}</p>
          </div>
        )}
        {user.user_metadata?.recovery_start_date && (
          <div>
            <p className="text-sm text-gray-600">Recovery Start Date</p>
            <p className="font-medium">{user.user_metadata.recovery_start_date}</p>
          </div>
        )}
        <Button 
          onClick={handleSignOut}
          variant="outline"
          className="w-full flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </CardContent>
    </Card>
  );
};

export default UserProfile;
