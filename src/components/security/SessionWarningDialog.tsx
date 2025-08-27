
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, Shield } from 'lucide-react';

interface SessionWarningDialogProps {
  open: boolean;
  timeRemaining?: string;
  onExtendSession: () => void;
  onSignOut: () => void;
}

const SessionWarningDialog: React.FC<SessionWarningDialogProps> = ({
  open,
  timeRemaining = '2:00',
  onExtendSession,
  onSignOut
}) => {
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md border-amber-200 bg-amber-50/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-800">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            Session Timeout Warning
          </DialogTitle>
          <DialogDescription className="space-y-3 text-amber-700">
            <div className="flex items-center gap-2 p-3 rounded-md bg-white/50 border border-amber-200">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="font-medium">
                Your session will expire in {timeRemaining}
              </span>
            </div>
            
            <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 border border-blue-200">
              <Shield className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">HIPAA Security Notice:</p>
                <p>
                  To protect your health information, your session will automatically 
                  end after 15 minutes of inactivity. All data will be securely cleared.
                </p>
              </div>
            </div>
            
            <p className="text-sm">
              Would you like to extend your session for another 15 minutes?
            </p>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-3 justify-end mt-4">
          <Button 
            variant="outline" 
            onClick={onSignOut}
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            Sign Out Now
          </Button>
          <Button 
            onClick={onExtendSession}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Extend Session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SessionWarningDialog;
