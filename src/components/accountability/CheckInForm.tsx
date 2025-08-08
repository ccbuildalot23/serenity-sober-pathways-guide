import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Heart, TrendingUp, MessageCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { AccountabilityService, AccountabilityPartnership } from '@/services/accountabilityService';
import { toast } from 'sonner';

interface CheckInFormProps {
  partnership: AccountabilityPartnership;
  onCheckInComplete: () => void;
}

const CheckInForm: React.FC<CheckInFormProps> = ({ partnership, onCheckInComplete }) => {
  const [moodLevel, setMoodLevel] = useState([7]);
  const [energyLevel, setEnergyLevel] = useState([7]);
  const [challengesToday, setChallengesToday] = useState('');
  const [accomplishments, setAccomplishments] = useState('');
  const [needsSupport, setNeedsSupport] = useState(_false);
  const [supportMessage, setSupportMessage] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [loading, setLoading] = useState(_false);
  const [showPreview, setShowPreview] = useState(_false);

  const getMoodLabel = (value: number) => {
    if (value <= 2) return 'Very Low';
    if (value <= 4) return 'Low';
    if (value <= 6) return 'Moderate';
    if (value <= 8) return 'Good';
    return 'Excellent';
  };

  const getEnergyLabel = (value: number) => {
    if (value <= 2) return 'Exhausted';
    if (value <= 4) return 'Low';
    if (value <= 6) return 'Moderate';
    if (value <= 8) return 'High';
    return 'Energized';
  };

  const generateSharedSummary = () => {
    const summary: unknown = {};
    
    // Only include data based on privacy settings
    if (partnership.privacy_settings.share_mood) {
      summary.mood_level = getMoodLabel(moodLevel[0]);
    }
    
    if (partnership.privacy_settings.share_progress) {
      if (accomplishments.trim()) {
        // Create a privacy-safe version of accomplishments
        summary.progress_summary = accomplishments.length > 50 
          ? 'Made good progress today'
          : accomplishments;
      }
      
      if (challengesToday.trim()) {
        summary.had_challenges = _true;
      }
    }

    if (needsSupport && supportMessage.trim()) {
      summary.support_requested = _true;
      summary.support_type = 'general'; // Don't share specific details
    }

    summary.energy_level = partnership.privacy_settings.share_progress 
      ? getEnergyLabel(energyLevel[0])
      : undefined;

    return summary;
  };

  const generateSensitiveData = () => {
    return {
      mood_rating: moodLevel[0],
      energy_rating: energyLevel[0],
      challenges_detailed: challengesToday,
      accomplishments_detailed: accomplishments,
      needs_support: needsSupport,
      support_message_full: supportMessage,
      private_notes: privateNotes,
      timestamp: new Date().toISOString()
    };
  };

  const handleSubmit = async () => {
    setLoading(_true);
    
    try {
      const _sensitiveData = generateSensitiveData();
      const _sharedSummary = generateSharedSummary();

      await AccountabilityService.submitCheckIn(
        partnership.id,
        _sensitiveData,
        _sharedSummary
      );

      toast.success('Check-in submitted successfully!');
      
      // Reset form
      setMoodLevel([7]);
      setEnergyLevel([7]);
      setChallengesToday('');
      setAccomplishments('');
      setNeedsSupport(_false);
      setSupportMessage('');
      setPrivateNotes('');
      
      onCheckInComplete();
    } catch (error) {
      console.error('Error submitting check-in:', error);
      toast.error('Failed to submit check-in');
    } finally {
      setLoading(_false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Heart className="w-5 h-5 mr-2 text-red-500" />
              Daily Check-In
            </span>
            <Badge variant="outline" className="flex items-center">
              <Lock className="w-3 h-3 mr-1" />
              Encrypted
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mood Rating */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">How are you feeling today?</Label>
              <Badge variant="secondary">{getMoodLabel(moodLevel[0])}</Badge>
            </div>
            <Slider
              value={moodLevel}
              onValueChange={setMoodLevel}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>Very Low</span>
              <span>Excellent</span>
            </div>
          </div>

          {/* Energy Level */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Energy Level</Label>
              <Badge variant="secondary">{getEnergyLabel(energyLevel[0])}</Badge>
            </div>
            <Slider
              value={energyLevel}
              onValueChange={setEnergyLevel}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
          </div>

          {/* Accomplishments */}
          <div className="space-y-2">
            <Label className="text-base font-medium flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
              What went well today?
            </Label>
            <Textarea
              value={accomplishments}
              onChange={(e) => setAccomplishments(e.target.value)}
              placeholder="Share your wins, no matter how small..."
              className="min-h-[80px]"
            />
          </div>

          {/* Challenges */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Any challenges today?</Label>
            <Textarea
              value={challengesToday}
              onChange={(e) => setChallengesToday(e.target.value)}
              placeholder="It's okay to share difficulties..."
              className="min-h-[80px]"
            />
          </div>

          {/* Support Request */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="needs-support"
                checked={needsSupport}
                onChange={(e) => setNeedsSupport(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="needs-support" className="flex items-center">
                <MessageCircle className="w-4 h-4 mr-2 text-blue-600" />
                I could use some extra support today
              </Label>
            </div>
            
            {needsSupport && (
              <Textarea
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                placeholder="Let your partner know how they can support you..."
                className="min-h-[80px]"
              />
            )}
          </div>

          {/* Private Notes */}
          <div className="space-y-2">
            <Label className="text-base font-medium flex items-center">
              <Lock className="w-4 h-4 mr-2 text-gray-600" />
              Private Notes (Only for you)
            </Label>
            <Textarea
              value={privateNotes}
              onChange={(e) => setPrivateNotes(e.target.value)}
              placeholder="Private thoughts, patterns you notice, etc..."
              className="min-h-[80px] border-dashed"
            />
            <p className="text-xs text-gray-500">
              These notes are encrypted and only visible to you
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Preview */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center">
              <Eye className="w-4 h-4 mr-2" />
              What Your Partner Will See
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </CardTitle>
        </CardHeader>
        {showPreview && (
          <CardContent>
            <div className="space-y-2 text-sm">
              {partnership.privacy_settings.share_mood && (
                <div className="flex justify-between">
                  <span>Mood:</span>
                  <Badge variant="outline">{getMoodLabel(moodLevel[0])}</Badge>
                </div>
              )}
              
              {partnership.privacy_settings.share_progress && (
                <>
                  {accomplishments.trim() && (
                    <div>
                      <span className="font-medium">Progress: </span>
                      <span>{accomplishments.length > 50 ? 'Made good progress today' : accomplishments}</span>
                    </div>
                  )}
                  
                  {challengesToday.trim() && (
                    <div>
                      <span className="font-medium">Challenges: </span>
                      <span>Had some challenges today</span>
                    </div>
                  )}
                </>
              )}

              {needsSupport && (
                <div>
                  <span className="font-medium">Support: </span>
                  <span>Requested extra support today</span>
                </div>
              )}

              {!partnership.privacy_settings.share_mood && 
               !partnership.privacy_settings.share_progress && 
               !needsSupport && (
                <p className="text-gray-600 italic">
                  "Your accountability partner completed their check-in"
                </p>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Submit Button */}
      <Button 
        onClick={handleSubmit}
        disabled={loading}
        className="w-full"
        size="lg"
      >
        {loading ? (
          'Submitting...'
        ) : (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            Complete Check-In
          </>
        )}
      </Button>
    </div>
  );
};

export default CheckInForm;