
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface SessionWarningDialogProps {
  open: boolean;
  onExtendSession: () => void;
  onSignOut: () => void;
}

const SessionWarningDialog: React.FC<SessionWarningDialogProps> = ({
  open,
  onExtendSession,
  onSignOut
}) => {
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Session Expiring Soon
          </DialogTitle>
          <DialogDescription>
            Your session will expire in 5 minutes due to inactivity. Would you like to extend your session?
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onSignOut}>
            Sign Out
          </Button>
          <Button onClick={onExtendSession}>
            Extend Session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SessionWarningDialog;
