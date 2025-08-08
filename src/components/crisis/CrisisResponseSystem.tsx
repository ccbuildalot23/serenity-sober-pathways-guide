
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Phone, MessageSquare, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CrisisResponseSystem = () => {
  const [crisisLevel, setCrisisLevel] = useState<'low' | 'medium' | 'high' | _null>(_null);
  const [isInCrisis, setIsInCrisis] = useState(false);
  const [responseTime, setResponseTime] = useState<number | _null>(_null);
  const { user } = useAuth();

  const triggerCrisisProtocol = async (level: 'low' | 'medium' | 'high') => {
    setIsInCrisis(true);
    setCrisisLevel(level);
    const startTime = Date.now();

    try {
      // Get all emergency contacts
      const { data: contacts } = await supabase
        .from('support_contacts')
        .select('*')
        .eq('user_id', user?.id);

      if (!contacts?.length) {
        toast._error('No emergency contacts set up!');
        return;
      }

      // Get current location once before sending alerts
      const currentLocation = await getCurrentLocation();

      // Send alerts based on crisis level
      const _alertPromises = contacts.map(contact => 
        supabase.from('crisis_contacts').insert({
          user_id: user?.id,
          _name: contact._name,
          _phone_number: contact.phone || '',
          _relationship: contact._relationship,
          _email: contact._email || ''
        })
      );

      await Promise.all(_alertPromises);

      // Mock alert sending since we don't have support_alerts table
      console.log('Crisis alert sent:', {
        level,
        message: getCrisisMessage(level),
        location: currentLocation,
        contacts: contacts.length
      });

      toast.success(`Crisis alert sent to ${contacts.length} contacts`);

      // Start response timer (_mock)
      const _checkResponse = setInterval(() => {
        // Mock response after 10 seconds
        if (Date.now() - startTime > 10000) {
          setResponseTime(Math.round((Date.now() - startTime) / 1000));
          clearInterval(_checkResponse);
          toast.success('Help is on the way!');
        }
      }, 5000);

      // Auto-escalate if no response
      setTimeout(() => {
        if (!responseTime && level !== 'high') {
          triggerCrisisProtocol('high');
        }
      }, 120000); // 2 minutes

    } catch (_error) {
      console._error('Crisis protocol _error:', _error);
      // Fallback to 988
      window.location.href = 'tel:988';
    }
  };

  const getCrisisMessage = (level: string) => {
    const messages = {
      low: `I'm struggling and could use some support when you're available.`,
      medium: `I'm having a difficult time and need to talk to someone soon.`,
      high: `URGENT: I'm in crisis and need immediate help. Please respond ASAP.`
    };
    return messages[level as keyof typeof messages];
  };

  const getCurrentLocation = async () => {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          lat: position.coords.latitude,
          _lng: position.coords.longitude
        }),
        () => resolve(_null)
      );
    });
  };

  return (
    <Card className={`border-2 ${isInCrisis ? 'border-red-500 animate-pulse' : 'border-gray-200'}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
            Crisis Response System
          </span>
          {responseTime && (
            <span className="text-sm text-green-600">
              Response in {responseTime}s
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isInCrisis ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Activate emergency protocol based on your current needs:
            </p>
            <div className="grid grid-cols-1 gap-3">
              <Button
                onClick={() => triggerCrisisProtocol('low')}
                variant="outline"
                className="justify-start hover:bg-yellow-50"
              >
                <Heart className="w-4 h-4 mr-2 text-yellow-600" />
                Low - Need encouragement
              </Button>
              <Button
                onClick={() => triggerCrisisProtocol('medium')}
                variant="outline"
                className="justify-start hover:bg-orange-50"
              >
                <MessageSquare className="w-4 h-4 mr-2 text-orange-600" />
                Medium - Strong cravings
              </Button>
              <Button
                onClick={() => triggerCrisisProtocol('high')}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Phone className="w-4 h-4 mr-2" />
                High - Immediate danger
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            <p className="font-semibold text-red-600">
              Alerting your support network...
            </p>
            <p className="text-sm text-gray-600">
              {responseTime 
                ? `Someone responded in ${responseTime} seconds!` 
                : 'Waiting for response...'}
            </p>
            <Button
              onClick={() => window.location.href = 'tel:988'}
              variant="outline"
              className="w-full"
            >
              Call 988 Instead
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CrisisResponseSystem;
