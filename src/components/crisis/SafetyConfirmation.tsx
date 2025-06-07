
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { CheckCircle, Heart, Star, Calendar, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SafetyConfirmationProps {
  onSafetyConfirmed: () => void;
  interventionsUsed: string[];
  crisisStartTime: Date;
}

interface FollowUpTask {
  id: string;
  time: string;
  type: 'automated_check_in' | 'mood_assessment' | 'professional_follow_up';
  scheduled: Date;
  completed: boolean;
}

const SafetyConfirmation = ({
  onSafetyConfirmed,
  interventionsUsed,
  crisisStartTime
}: SafetyConfirmationProps) => {
  const [showEffectivenessRating, setShowEffectivenessRating] = useState(false);
  const [effectivenessRating, setEffectivenessRating] = useState([7]);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSafetyConfirmation = async () => {
    if (!showEffectivenessRating) {
      setShowEffectivenessRating(true);
      return;
    }

    setIsSubmitting(true);

    try {
      // Log crisis resolution
      const crisisResolution = {
        id: Date.now().toString(),
        userId: 'current-user', // Replace with actual user ID
        crisisStartTime,
        resolutionTime: new Date(),
        interventionsUsed,
        effectivenessRating: effectivenessRating[0],
        additionalNotes,
        safetyConfirmed: true
      };

      // Save to localStorage (in real app, this would be Supabase)
      const existingData = localStorage.getItem('crisisResolutions') || '[]';
      const resolutions = JSON.parse(existingData);
      resolutions.push(crisisResolution);
      localStorage.setItem('crisisResolutions', JSON.stringify(resolutions));

      // Schedule follow-up tasks
      const followUpTasks: FollowUpTask[] = [
        {
          id: `${crisisResolution.id}-4h`,
          time: '4_hours',
          type: 'automated_check_in',
          scheduled: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
          completed: false
        },
        {
          id: `${crisisResolution.id}-24h`,
          time: '24_hours',
          type: 'mood_assessment',
          scheduled: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          completed: false
        },
        {
          id: `${crisisResolution.id}-1w`,
          time: '1_week',
          type: 'professional_follow_up',
          scheduled: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
          completed: false
        }
      ];

      const existingTasks = localStorage.getItem('followUpTasks') || '[]';
      const tasks = JSON.parse(existingTasks);
      tasks.push(...followUpTasks);
      localStorage.setItem('followUpTasks', JSON.stringify(tasks));

      // Notify emergency contacts
      await notifyEmergencyContacts();

      // Show success message
      toast({
        title: "Safety Confirmed",
        description: "Your emergency contacts have been notified that you're safe. Follow-up check-ins have been scheduled.",
        duration: 5000
      });

      // Trigger haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

      setTimeout(() => {
        onSafetyConfirmed();
      }, 2000);

    } catch (error) {
      console.error('Error confirming safety:', error);
      toast({
        title: "Error",
        description: "There was an issue confirming your safety. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const notifyEmergencyContacts = async () => {
    // Get crisis contacts from localStorage
    const crisisContacts = JSON.parse(localStorage.getItem('crisisContacts') || '[]');
    const enabledContacts = crisisContacts.filter((contact: any) => 
      contact.notificationPreferences.crisis
    );

    const safetyMessage = "I wanted to let you know that I'm safe now. Thank you for being there for me. 💚";

    // Simulate sending messages (in real app, this would use SMS service)
    for (const contact of enabledContacts) {
      console.log(`Sending safety confirmation to ${contact.name}: ${safetyMessage}`);
      
      // In a real app, you would send actual SMS/email here
      if (contact.notificationPreferences.preferredMethod === 'text' || 
          contact.notificationPreferences.preferredMethod === 'both') {
        // window.open(`sms:${contact.phoneNumber}&body=${encodeURIComponent(safetyMessage)}`);
      }
    }
  };

  const getEffectivenessLabel = (rating: number) => {
    if (rating <= 3) return { text: "Not helpful", color: "text-red-600" };
    if (rating <= 5) return { text: "Somewhat helpful", color: "text-orange-600" };
    if (rating <= 7) return { text: "Helpful", color: "text-yellow-600" };
    if (rating <= 9) return { text: "Very helpful", color: "text-green-600" };
    return { text: "Extremely helpful", color: "text-emerald-600" };
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center pb-4">
        <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4 animate-scale-in">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <CardTitle className="text-green-600 text-xl">You're Doing Great</CardTitle>
        <p className="text-gray-600">
          You've taken positive steps to care for yourself
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {!showEffectivenessRating ? (
          <>
            <div className="text-center space-y-4">
              <p className="text-lg">
                How are you feeling now?
              </p>
              
              {interventionsUsed.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Tools you used:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {interventionsUsed.map((intervention, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        <Star className="w-3 h-3 mr-1" />
                        {intervention}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button 
              onClick={handleSafetyConfirmation}
              disabled={isSubmitting}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-xl transition-all duration-300 animate-scale-in"
              size="lg"
            >
              <Heart className="w-5 h-5 mr-3" />
              I'm Safe Now
            </Button>
          </>
        ) : (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Help us improve</h3>
              <p className="text-sm text-gray-600">
                How effective were the tools in helping you feel better?
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Not helpful</span>
                  <span className="text-sm text-gray-600">Extremely helpful</span>
                </div>
                <Slider
                  value={effectivenessRating}
                  onValueChange={setEffectivenessRating}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="text-center">
                  <span className={`text-lg font-semibold ${getEffectivenessLabel(effectivenessRating[0]).color}`}>
                    {effectivenessRating[0]}/10 - {getEffectivenessLabel(effectivenessRating[0]).text}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Any additional thoughts? (Optional)
                </label>
                <Textarea
                  placeholder="What helped most? What could be better?"
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleSafetyConfirmation}
                disabled={isSubmitting}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 font-semibold rounded-xl"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Confirming Safety...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm I'm Safe
                  </>
                )}
              </Button>

              <div className="text-center text-sm text-gray-600 space-y-1">
                <div className="flex items-center justify-center space-x-4">
                  <span className="flex items-center">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Emergency contacts notified
                  </span>
                  <span className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    Follow-ups scheduled
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-center text-sm text-gray-600 pt-4 border-t">
          <p>Remember: You are not alone. Help is always available.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SafetyConfirmation;
