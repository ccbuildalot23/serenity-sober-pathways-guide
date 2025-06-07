
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, MessageSquare, MapPin, Users, Heart, Shield } from 'lucide-react';

interface CrisisResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  riskLevel: 'low' | 'moderate' | 'high' | 'severe';
}

const CrisisResponseModal: React.FC<CrisisResponseModalProps> = ({
  isOpen,
  onClose,
  riskLevel
}) => {
  const getResponseConfig = () => {
    switch (riskLevel) {
      case 'severe':
        return {
          title: 'Immediate Crisis Support',
          bgColor: 'bg-red-50 border-red-200',
          textColor: 'text-red-800',
          actions: [
            { icon: Phone, label: 'Call 911', action: () => window.open('tel:911', '_self'), primary: true },
            { icon: Phone, label: 'Crisis Hotline (988)', action: () => window.open('tel:988', '_self'), primary: true },
            { icon: MessageSquare, label: 'Text Crisis Line', action: () => window.open('sms:741741', '_self') },
            { icon: MapPin, label: 'Find Emergency Room', action: () => window.open('https://maps.google.com/search/emergency+room+near+me', '_blank') }
          ],
          message: 'You are in immediate danger. Please reach out for emergency help right now. You are not alone.'
        };
      case 'high':
        return {
          title: 'Urgent Support Needed',
          bgColor: 'bg-orange-50 border-orange-200',
          textColor: 'text-orange-800',
          actions: [
            { icon: Phone, label: 'Crisis Hotline (988)', action: () => window.open('tel:988', '_self'), primary: true },
            { icon: MessageSquare, label: 'Text Crisis Line', action: () => window.open('sms:741741', '_self') },
            { icon: Users, label: 'Contact Support Person', action: () => {}, primary: true },
            { icon: Shield, label: 'Safety Planning', action: () => {} }
          ],
          message: 'You need support right now. Please reach out to a crisis counselor or trusted person immediately.'
        };
      case 'moderate':
        return {
          title: 'Support & Coping Resources',
          bgColor: 'bg-yellow-50 border-yellow-200',
          textColor: 'text-yellow-800',
          actions: [
            { icon: Users, label: 'Contact Support Person', action: () => {}, primary: true },
            { icon: Phone, label: 'Crisis Hotline (988)', action: () => window.open('tel:988', '_self') },
            { icon: Heart, label: 'Coping Skills', action: () => {} },
            { icon: Shield, label: 'Review Safety Plan', action: () => {} }
          ],
          message: 'You are struggling but not in immediate danger. Let\'s connect you with support and coping resources.'
        };
      default: // low
        return {
          title: 'Wellness & Support Resources',
          bgColor: 'bg-green-50 border-green-200',
          textColor: 'text-green-800',
          actions: [
            { icon: Heart, label: 'Self-Care Activities', action: () => {} },
            { icon: Users, label: 'Reach Out to Friend', action: () => {} },
            { icon: Phone, label: 'Non-Emergency Support', action: () => window.open('tel:988', '_self') },
            { icon: Shield, label: 'Wellness Check-in', action: () => {} }
          ],
          message: 'You are managing well. Here are some resources to help maintain your emotional wellness.'
        };
    }
  };

  const config = getResponseConfig();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className={config.textColor}>
            {config.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Message */}
          <div className={`p-4 rounded-lg border ${config.bgColor}`}>
            <p className={`text-sm font-medium ${config.textColor}`}>
              {config.message}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Immediate Actions:</h3>
            <div className="grid grid-cols-1 gap-2">
              {config.actions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={index}
                    onClick={action.action}
                    variant={action.primary ? "default" : "outline"}
                    className={`justify-start h-12 ${
                      action.primary 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                    size="lg"
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Crisis Resources */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">24/7 Crisis Resources:</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div>• National Suicide Prevention Lifeline: <strong>988</strong></div>
              <div>• Crisis Text Line: Text HOME to <strong>741741</strong></div>
              <div>• SAMHSA National Helpline: <strong>1-800-662-4357</strong></div>
            </div>
          </div>

          {/* Close Button */}
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full"
          >
            I'm Safe Now - Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CrisisResponseModal;
