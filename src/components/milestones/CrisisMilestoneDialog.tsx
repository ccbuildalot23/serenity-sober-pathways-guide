
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSecureAuditLogger } from '@/hooks/useSecureAuditLogger';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

interface CrisisData {
  id: string;
  crisis_start_time: string;
}

interface CrisisMilestoneDialogProps {
  isOpen: boolean;
  onClose: () => void;
  milestone: number;
  crisisData: CrisisData[];
}

const interventionOptions = [
  'Support network calls',
  'CBT techniques',
  'Meditation/breathing',
  'Physical exercise',
  'Medication adherence',
  'Therapy sessions'
];

const CrisisMilestoneDialog: React.FC<CrisisMilestoneDialogProps> = ({ 
  isOpen, 
  onClose, 
  milestone, 
  crisisData 
}) => {
  const { user } = useAuth();
  const { log } = useSecureAuditLogger();
  const [helpfulInterventions, setHelpfulInterventions] = useState<string[]>([]);
  const [crisisMessage, setCrisisMessage] = useState('');

  const lastCrisisDate = crisisData[0]?.crisis_start_time;
  const daysSinceLastCrisis = lastCrisisDate 
    ? Math.floor((Date.now() - new Date(lastCrisisDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const handleInterventionChange = (intervention: string, checked: boolean) => {
    if (checked) {
      setHelpfulInterventions(prev => [...prev, intervention]);
    } else {
      setHelpfulInterventions(prev => prev.filter(item => item !== intervention));
    }
  };

  const handleSaveAndCelebrate = async () => {
    try {
      // Save milestone with crisis-specific data
      await supabase.from('user_achievements').insert({
        user_id: user?.id,
        badge_name: `${milestone} Days Recovery`,
        badge_type: 'milestone'
      });

      // Log achievement
      await log('MILESTONE_ACHIEVED', {
        milestone_days: milestone,
        crisis_free_days: daysSinceLastCrisis,
        interventions: helpfulInterventions,
        crisis_message: crisisMessage
      });

      // Trigger confetti celebration
      confetti({
        colors: ['#1E3A8A', '#10B981', '#F59E0B'],
        spread: 100,
        particleCount: 200
      });

      toast.success('Milestone celebrated and saved!');
      onClose();
    } catch (error) {
      console.error('Error saving milestone:', error);
      toast.error('Failed to save milestone');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">
            🎉 {milestone} Days of Recovery! 🎉
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {daysSinceLastCrisis && (
            <Alert className="bg-green-50 border-green-200">
              <Trophy className="h-4 w-4 text-green-600" />
              <AlertDescription>
                {daysSinceLastCrisis} days crisis-free! Your coping strategies are working.
              </AlertDescription>
            </Alert>
          )}
          
          <div>
            <Label className="text-base font-medium mb-3 block">
              What interventions helped most?
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {interventionOptions.map((intervention) => (
                <div key={intervention} className="flex items-center space-x-2">
                  <Checkbox
                    id={intervention}
                    checked={helpfulInterventions.includes(intervention)}
                    onCheckedChange={(checked) => 
                      handleInterventionChange(intervention, checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={intervention}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {intervention}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <Label htmlFor="crisis-message" className="text-base font-medium">
              Message to future self in crisis:
            </Label>
            <Textarea
              id="crisis-message"
              placeholder="What would you tell yourself during a difficult moment?"
              value={crisisMessage}
              onChange={(e) => setCrisisMessage(e.target.value)}
              rows={3}
              className="mt-2"
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleSaveAndCelebrate}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Save & Celebrate
            </Button>
            <Button 
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CrisisMilestoneDialog;
