
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Hand, AlertTriangle } from 'lucide-react';

const FloatingHelpButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleHelpClick = () => {
    console.log('Emergency help button clicked');
    setIsModalOpen(true);
  };

  const handleSendAlert = () => {
    console.log('Emergency alert sent!');
    setIsModalOpen(false);
    // TODO: Implement actual alert sending logic in future steps
  };

  return (
    <>
      {/* Floating Help Button */}
      <div className="fixed bottom-20 right-4 z-50">
        <Button
          onClick={handleHelpClick}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-lg animate-pulse"
          size="lg"
        >
          <div className="flex flex-col items-center">
            <Hand className="w-6 h-6 text-white" />
            <span className="text-xs text-white font-bold mt-1">HELP</span>
          </div>
        </Button>
      </div>

      {/* Emergency Support Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="w-6 h-6 mr-2" />
              Emergency Support
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-center text-gray-700 font-medium">
              I'm having an urge and need support
            </p>
            
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                This will alert your support network that you need immediate help.
              </p>
              
              <div className="space-y-3">
                <Button
                  onClick={handleSendAlert}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3"
                  size="lg"
                >
                  SEND ALERT NOW
                </Button>
                
                <Button
                  onClick={() => setIsModalOpen(false)}
                  variant="outline"
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FloatingHelpButton;
