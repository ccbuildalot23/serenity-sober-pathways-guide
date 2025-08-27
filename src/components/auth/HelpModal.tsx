import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  HelpCircle, 
  Mail, 
  Lock, 
  Shield, 
  Phone, 
  MessageCircle,
  X
} from 'lucide-react';

interface HelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md bg-white/95 backdrop-blur-sm border-sage-200"
        data-testid="help-modal"
      >
        <div data-testid="modal-content">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-sage-800">
              <HelpCircle className="w-5 h-5 text-emerald-600" />
              <span>Need Help?</span>
            </DialogTitle>
            <DialogDescription className="text-sage-600">
              Get assistance with signing in to your Serenity account
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            {/* Common Issues */}
            <div>
              <h3 className="text-sm font-medium text-sage-700 mb-3 flex items-center space-x-2">
                <Lock className="w-4 h-4" />
                <span>Common Sign-in Issues</span>
              </h3>
              <div className="space-y-2 text-sm text-sage-600">
                <div className="flex items-start space-x-2">
                  <div className="w-1 h-1 bg-sage-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Make sure your email address is correct</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1 h-1 bg-sage-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Check that Caps Lock is not enabled</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1 h-1 bg-sage-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Try clearing your browser cache and cookies</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1 h-1 bg-sage-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Disable browser extensions that might interfere</span>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div>
              <h3 className="text-sm font-medium text-sage-700 mb-3 flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Security & Privacy</span>
              </h3>
              <div className="text-sm text-sage-600 space-y-2">
                <p>Your account is protected with industry-standard security measures:</p>
                <div className="space-y-1">
                  <div className="flex items-start space-x-2">
                    <div className="w-1 h-1 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>HIPAA-compliant data encryption</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-1 h-1 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Secure password requirements</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-1 h-1 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Session timeout for your protection</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Support */}
            <div>
              <h3 className="text-sm font-medium text-sage-700 mb-3">Still need help?</h3>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start text-left border-sage-200 hover:bg-sage-50"
                  onClick={() => window.open('mailto:support@serenity-pathways.com')}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email Support: support@serenity-pathways.com
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left border-sage-200 hover:bg-sage-50"
                  onClick={() => window.open('tel:1-800-SERENITY')}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call: 1-800-SERENITY (24/7)
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left border-sage-200 hover:bg-sage-50"
                  onClick={() => window.open('/contact')}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Live Chat Support
                </Button>
              </div>
            </div>
          </div>

          <DialogClose asChild>
            <Button
              variant="outline"
              className="w-full mt-6 border-sage-200 hover:bg-sage-50"
              data-testid="close-modal"
              aria-label="Close help modal"
            >
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};