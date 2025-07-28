import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface AssessmentTypeFilterProps {
  value: string[];
  onChange: (assessmentTypes: string[]) => void;
}

export const AssessmentTypeFilter: React.FC<AssessmentTypeFilterProps> = ({ 
  value, 
  onChange 
}) => {
  const assessmentTypes = [
    { id: 'mood', label: 'Mood & Wellness', description: 'Mood, energy, hope ratings' },
    { id: 'phq2', label: 'PHQ-2', description: 'Depression screening' },
    { id: 'gad2', label: 'GAD-2', description: 'Anxiety screening' }
  ];

  const handleToggle = (assessmentId: string, checked: boolean) => {
    if (checked) {
      onChange([...value, assessmentId]);
    } else {
      onChange(value.filter(id => id !== assessmentId));
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Assessment Types</Label>
      <div className="space-y-3">
        {assessmentTypes.map(({ id, label, description }) => (
          <div key={id} className="flex items-start space-x-2">
            <Checkbox
              id={id}
              checked={value.includes(id)}
              onCheckedChange={(checked) => handleToggle(id, checked as boolean)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor={id}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {label}
              </Label>
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};