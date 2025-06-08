
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, Shield } from 'lucide-react';

interface SessionWarningDialogProps {
  open: boolean;
  onExtend: () => void;
  onLogout: () => void;
}

export const SessionWarningDialog: React.FC<SessionWarningDialogProps> = ({
  open,
  onExtend,
  onLogout
}) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
            <Clock className="w-5 h-5" />
            Session Expiring Soon
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 mt-0.5 text-amber-500" />
              <div>
                <p>Your session will expire in less than 5 minutes for security purposes.</p>
                <p className="text-sm text-gray-600 mt-1">
                  This helps protect your sensitive recovery data from unauthorized access.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onLogout}>
            Logout Now
          </AlertDialogCancel>
          <AlertDialogAction onClick={onExtend} className="bg-blue-600 hover:bg-blue-700">
            Extend Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
