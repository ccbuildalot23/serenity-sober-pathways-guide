import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { Phone, MessageCircle, Users, Wind, MapPin, ArrowLeft, AlertCircle, Heart, CheckCircle } from 'lucide-react';

const CrisisSupport = () => {
  const navigate = useNavigate();
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathCount, setBreathCount] = useState(0);
  const [showSupporterModal, setShowSupporterModal] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [crisisMessage, setCrisisMessage] = useState('');
  const [sendLocation, setSendLocation] = useState(false);
  const [alertSent, setAlertSent] = useState(false);

  // Breathing timer
  useEffect(() => {
    if (breathingActive) {
      const interval = setInterval(() => {
        setBreathCount(prev => {
          if (prev >= 60) {
            setBreathingActive(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [breathingActive]);

  const handleSendCrisisAlert = () => {
    // Simulate sending crisis alert
    setAlertSent(true);
    setTimeout(() => {
      setAlertSent(false);
      setShowSupporterModal(false);
    }, 3000);
  };

  const getBreathingPhase = () => {
    if (breathCount <= 4) return "Breathe In";
    if (breathCount <= 8) return "Hold";
    if (breathCount <= 12) return "Breathe Out";
    return "Repeat...";
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Back Button */}
        <Button
          onClick={() => navigate('/patient/dashboard')}
          variant="ghost"
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Header */}
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="text-4xl font-bold">Crisis Support</h1>
          <p className="text-xl text-gray-300">
            You're not alone. Help is available 24/7.
          </p>
        </div>

        {/* Immediate Crisis Resources */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Immediate Help</h2>
          
          <Button
            onClick={() => window.open('tel:988', '_self')}
            data-testid="crisis-hotline-988"
            className="w-full h-16 bg-red-600 hover:bg-red-700 text-white rounded-xl"
          >
            <Phone className="w-6 h-6 mr-3" />
            <span className="text-xl">Call 988 - Suicide & Crisis Lifeline</span>
          </Button>

          <Button
            onClick={() => window.open('sms:988', '_self')}
            data-testid="text-crisis-line"
            className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          >
            <MessageCircle className="w-6 h-6 mr-3" />
            <span className="text-xl">Text 988 - Crisis Text Line</span>
          </Button>

          <Button
            onClick={() => setShowSupporterModal(true)}
            data-testid="emergency-contacts"
            className="w-full h-16 bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
          >
            <Users className="w-6 h-6 mr-3" />
            <span className="text-xl">Contact Your Support Team</span>
          </Button>
        </div>

        {/* Breathing Exercise */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Grounding Tools</h2>
          
          {!breathingActive ? (
            <Button
              onClick={() => setBreathingActive(true)}
              data-testid="start-breathing-exercise"
              className="w-full h-16 bg-green-600 hover:bg-green-700 text-white rounded-xl"
            >
              <Wind className="w-6 h-6 mr-3" />
              <span className="text-xl">Start 60-Second Breathing Exercise</span>
            </Button>
          ) : (
            <div 
              data-testid="breathing-guide"
              className="bg-green-900/30 rounded-xl p-6 text-center"
            >
              <div className="text-3xl font-bold text-green-400 mb-2">
                {getBreathingPhase()}
              </div>
              <div 
                data-testid="breathing-timer"
                className="text-lg text-gray-300"
              >
                {60 - breathCount}s left
              </div>
            </div>
          )}

          <Button
            onClick={() => navigate('/breathing-exercises')}
            data-testid="breathing-exercises"
            className="w-full h-16 bg-teal-600 hover:bg-teal-700 text-white rounded-xl"
          >
            <Wind className="w-6 h-6 mr-3" />
            <span className="text-xl">More Breathing Exercises</span>
          </Button>
        </div>

        {/* Additional Resources */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Additional Resources</h2>
          
          <Button
            onClick={() => navigate('/crisis-intervention')}
            className="w-full h-16 bg-orange-600 hover:bg-orange-700 text-white rounded-xl"
          >
            <AlertCircle className="w-6 h-6 mr-3" />
            <span className="text-xl">Crisis Intervention Tools</span>
          </Button>

          <Button
            onClick={() => navigate('/mobile-crisis')}
            className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
          >
            <MapPin className="w-6 h-6 mr-3" />
            <span className="text-xl">Mobile Crisis Support</span>
          </Button>

          <Button
            onClick={() => navigate('/peer-support')}
            className="w-full h-16 bg-pink-600 hover:bg-pink-700 text-white rounded-xl"
          >
            <Heart className="w-6 h-6 mr-3" />
            <span className="text-xl">Connect with Peers</span>
          </Button>
        </div>

        {/* Support Team Contact Modal */}
        {showSupporterModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full space-y-6" data-testid="supporter-contact-modal">
              <div className="text-center space-y-4">
                <Users className="w-12 h-12 text-purple-500 mx-auto" />
                <h3 className="text-xl font-semibold">Contact Support Team</h3>
                <p className="text-gray-300">
                  Send a message to your support team. They'll respond as soon as possible.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="send-location"
                    checked={sendLocation}
                    onCheckedChange={(checked) => setSendLocation(checked as boolean)}
                    data-testid="send-location-toggle"
                  />
                  <label htmlFor="send-location" className="text-sm font-medium text-gray-300">
                    Share my location with support team
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Message (optional)
                  </label>
                  <Textarea
                    data-testid="crisis-message"
                    placeholder="Describe what you're going through..."
                    value={crisisMessage}
                    onChange={(e) => setCrisisMessage(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={() => setShowSupporterModal(false)}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendCrisisAlert}
                  data-testid="send-crisis-alert"
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  Send Alert
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Alert Sent Confirmation */}
        {alertSent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-green-900/30 rounded-xl p-6 max-w-md w-full text-center" data-testid="alert-sent-confirmation">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Alert Sent</h3>
              <p className="text-gray-300">
                Support team has been notified and will respond as soon as possible.
              </p>
            </div>
          </div>
        )}

        {/* Community Guidelines Modal */}
        {showGuidelines && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full space-y-6" data-testid="guidelines-modal">
              <div className="text-center space-y-4">
                <h3 className="text-xl font-semibold">Community Guidelines</h3>
                <div className="text-left space-y-3 text-sm text-gray-300" data-testid="guidelines-content">
                  <p><strong>Community Guidelines</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Be kind and supportive to others</li>
                    <li>Respect everyone's privacy and confidentiality</li>
                    <li>No judgment or criticism</li>
                    <li>Share from your own experience</li>
                    <li>If you're in crisis, contact emergency services</li>
                  </ul>
                </div>
              </div>

              <Button
                onClick={() => setShowGuidelines(false)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                I Understand
              </Button>
            </div>
          </div>
        )}

        {/* Emergency Reminder */}
        <div className="bg-red-900/20 border border-red-600 rounded-xl p-4 text-center">
          <p className="text-red-400 font-medium">
            If you're in immediate danger, call 911 or go to the nearest emergency room.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CrisisSupport;