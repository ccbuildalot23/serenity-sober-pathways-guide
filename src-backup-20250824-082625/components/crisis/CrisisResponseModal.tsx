
import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Phone, MessageSquare, Users, Heart, CheckCircle } from 'lucide-react';
import InterventionToolbox from './interventions/InterventionToolbox';
import SafetyConfirmation from './SafetyConfirmation';

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
  const [currentView, setCurrentView] = useState<'response' | 'tools' | 'safety'>('response');
  const [interventionsUsed, setInterventionsUsed] = useState<string[]>([]);
  const [crisisStartTime] = useState(new Date());

  const handleCall911 = () => {
    window.location.href = 'tel:911';
  };

  const handleCall988 = () => {
    window.location.href = 'tel:988';
  };

  const handleTextCrisis = () => {
    window.location.href = 'sms:741741&body=HOME';
  };

  const handleToolsComplete = (toolName: string) => {
    setInterventionsUsed(prev => [...prev, toolName]);
    setCurrentView('safety');
  };

  const handleSafetyConfirmation = () => {
    setCurrentView('response');
    onClose();
  };

  const getRiskInfo = () => {
    switch (riskLevel) {
      case 'low':
        return {
          title: 'Low Risk Detected',
          message: 'You\'re going through a difficult time. Let\'s use some tools to help you feel better.',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
      case 'moderate':
        return {
          title: 'Moderate Risk Detected', 
          message: 'You\'re experiencing significant distress. Let\'s get you some immediate support.',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      case 'high':
        return {
          title: 'High Risk Detected',
          message: 'You\'re in serious distress. Please use these crisis resources immediately.',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'severe':
        return {
          title: 'Immediate Danger Detected',
          message: 'You\'re in immediate danger. Please call 911 or the crisis line right now.',
          color: 'text-red-800',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-300'
        };
      default:
        return {
          title: 'Crisis Support',
          message: 'You\'re taking a brave step by reaching out.',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const riskInfo = getRiskInfo();

  // Safety confirmation screen
  if (currentView === 'safety') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md mx-auto p-0">
          <SafetyConfirmation
            onSafetyConfirmed={handleSafetyConfirmation}
            interventionsUsed={interventionsUsed}
            crisisStartTime={crisisStartTime}
          />
        </DialogContent>
      </Dialog>
    );
  }

  // Intervention tools screen
  if (currentView === 'tools') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md mx-auto p-0">
          <InterventionToolbox 
            onBack={() => setCurrentView('response')}
            onComplete={handleToolsComplete}
          />
        </DialogContent>
      </Dialog>
    );
  }

  // Main crisis response screen
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto p-0">
        <Card className="border-0 shadow-none">
          <CardHeader className={`${riskInfo.bgColor} ${riskInfo.borderColor} border-b`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${riskInfo.color}`} />
              <CardTitle className={riskInfo.color}>{riskInfo.title}</CardTitle>
            </div>
            <p className="text-sm text-gray-700">{riskInfo.message}</p>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-6">
            {/* Immediate Crisis Support */}
            {(riskLevel === 'high' || riskLevel === 'severe') && (
              <div className="space-y-3">
                <h3 className="font-semibold text-red-700">Immediate Help</h3>
                <Button 
                  onClick={handleCall911}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call 911 - Emergency Services
                </Button>
              </div>
            )}

            {/* Crisis Resources */}
            <div className="space-y-3">
              <h3 className="font-semibold">Crisis Support</h3>
              
              <Button 
                onClick={handleCall988}
                variant="outline"
                className="w-full border-blue-200 hover:bg-blue-50 py-3"
              >
                <Phone className="w-4 h-4 mr-2" />
                988 - Crisis Lifeline (24/7)
              </Button>
              
              <Button 
                onClick={handleTextCrisis}
                variant="outline"
                className="w-full border-green-200 hover:bg-green-50 py-3"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Text HOME to 741741
              </Button>
            </div>

            {/* Intervention Tools */}
            {(riskLevel === 'low' || riskLevel === 'moderate') && (
              <div className="space-y-3">
                <h3 className="font-semibold">Coping Tools</h3>
                <Button 
                  onClick={() => setCurrentView('tools')}
                  variant="outline"
                  className="w-full border-purple-200 hover:bg-purple-50 py-3"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Try Calming Exercises
                </Button>
              </div>
            )}

            {/* Safety Confirmation */}
            <div className="pt-4 border-t">
              <Button 
                onClick={() => setCurrentView('safety')}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
              >
                <Heart className="w-4 h-4 mr-2" />
                I'm Safe Now
              </Button>
            </div>

            <div className="text-center text-sm text-gray-600">
              <p>You are not alone. Help is available 24/7.</p>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default CrisisResponseModal;
