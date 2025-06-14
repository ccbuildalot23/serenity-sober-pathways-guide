import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface WellnessSectionProps {
  energy: number | null;
  hope: number | null;
  sobrietyConfidence: number | null;
  recoveryImportance: number | null;
  recoveryStrength: string | null;
  supportNeeded: boolean;
  onEnergyChange: (value: number) => void;
  onHopeChange: (value: number) => void;
  onSobrietyConfidenceChange: (value: number) => void;
  onRecoveryImportanceChange: (value: number) => void;
  onRecoveryStrengthChange: (value: string) => void;
  onSupportNeededChange: (checked: boolean) => void;
  onSectionComplete?: () => void;
}

export const WellnessSection: React.FC<WellnessSectionProps> = ({
  energy,
  hope,
  sobrietyConfidence,
  recoveryImportance,
  recoveryStrength,
  supportNeeded,
  onEnergyChange,
  onHopeChange,
  onSobrietyConfidenceChange,
  onRecoveryImportanceChange,
  onRecoveryStrengthChange,
  onSupportNeededChange,
  onSectionComplete
}) => {
  const handleRecoveryStrengthChange = (value: string) => {
    onRecoveryStrengthChange(value);
    if (onSectionComplete) {
      onSectionComplete();
    }
  };

  return (
    
    <div className="space-y-6">
      {/* Energy Slider */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Energy Level ({energy}/10)</Label>
        <Slider
          value={energy ? [energy] : [5]}
          onValueChange={(value) => onEnergyChange(value[0])}
          max={10}
          min={1}
          step={1}
          className="w-full"
        />
      </div>

      {/* Hope Slider */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Hope Level ({hope}/10)</Label>
        <Slider
          value={hope ? [hope] : [5]}
          onValueChange={(value) => onHopeChange(value[0])}
          max={10}
          min={1}
          step={1}
          className="w-full"
        />
      </div>

      {/* Sobriety Confidence Slider */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Sobriety Confidence ({sobrietyConfidence}/10)</Label>
        <Slider
          value={sobrietyConfidence ? [sobrietyConfidence] : [5]}
          onValueChange={(value) => onSobrietyConfidenceChange(value[0])}
          max={10}
          min={1}
          step={1}
          className="w-full"
        />
      </div>

      {/* Recovery Importance Slider */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Recovery Importance ({recoveryImportance}/10)</Label>
        <Slider
          value={recoveryImportance ? [recoveryImportance] : [5]}
          onValueChange={(value) => onRecoveryImportanceChange(value[0])}
          max={10}
          min={1}
          step={1}
          className="w-full"
        />
      </div>

      {/* Recovery Strength Select */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Current Recovery Strength</Label>
        <Select value={recoveryStrength || undefined} onValueChange={handleRecoveryStrengthChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select your current strength level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 - Very Low</SelectItem>
            <SelectItem value="2">2 - Low</SelectItem>
            <SelectItem value="3">3 - Below Average</SelectItem>
            <SelectItem value="4">4 - Somewhat Low</SelectItem>
            <SelectItem value="5">5 - Average</SelectItem>
            <SelectItem value="6">6 - Somewhat High</SelectItem>
            <SelectItem value="7">7 - Above Average</SelectItem>
            <SelectItem value="8">8 - High</SelectItem>
            <SelectItem value="9">9 - Very High</SelectItem>
            <SelectItem value="10">10 - Excellent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Support Needed Checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="support-needed"
          checked={supportNeeded}
          onCheckedChange={onSupportNeededChange}
        />
        <Label htmlFor="support-needed" className="text-sm font-medium">
          I need additional support today
        </Label>
      </div>
    </div>
  );
};
