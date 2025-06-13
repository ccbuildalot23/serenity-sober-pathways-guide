
import React, { useEffect } from 'react';

interface WellnessSectionProps {
  energy: number | null;
  hope: number | null;
  sobrietyConfidence: number | null;
  recoveryImportance: number | null;
  recoveryStrength: number | null;
  supportNeeded: boolean;
  onEnergyChange: (value: number) => void;
  onHopeChange: (value: number) => void;
  onSobrietyConfidenceChange: (value: number) => void;
  onRecoveryImportanceChange: (value: number) => void;
  onRecoveryStrengthChange: (value: number) => void;
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
  // Check if section is complete whenever values change - support checkbox is optional
  useEffect(() => {
    if (energy !== null && 
        hope !== null && 
        sobrietyConfidence !== null && 
        recoveryImportance !== null && 
        recoveryStrength !== null) {
      onSectionComplete?.();
    }
  }, [energy, hope, sobrietyConfidence, recoveryImportance, recoveryStrength, onSectionComplete]);

  const getFieldLabel = (value: number | null, fieldName: string) => {
    if (value === null) return '';
    return `${fieldName}: ${value}/10`;
  };

  const isFieldRequired = (value: number | null) => value === null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">Wellness Check</h3>
        <p className="text-gray-600 mb-4">Rate these aspects of your well-being today.</p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Energy Level {isFieldRequired(energy) && <span className="text-red-500">*</span>}
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={energy || 5}
            onChange={(e) => onEnergyChange(parseInt(e.target.value))}
            className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer"
            aria-label="Energy level from 1 to 10"
          />
          <div className="text-sm text-gray-500 text-center">
            {energy ? getFieldLabel(energy, 'Energy') : 'Select your energy level'}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Level of Hope {isFieldRequired(hope) && <span className="text-red-500">*</span>}
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={hope || 5}
            onChange={(e) => onHopeChange(parseInt(e.target.value))}
            className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer"
            aria-label="Hope level from 1 to 10"
          />
          <div className="text-sm text-gray-500 text-center">
            {hope ? getFieldLabel(hope, 'Hope') : 'Select your hope level'}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Sobriety Confidence {isFieldRequired(sobrietyConfidence) && <span className="text-red-500">*</span>}
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={sobrietyConfidence || 5}
            onChange={(e) => onSobrietyConfidenceChange(parseInt(e.target.value))}
            className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer"
            aria-label="Sobriety confidence from 1 to 10"
          />
          <div className="text-sm text-gray-500 text-center">
            {sobrietyConfidence ? getFieldLabel(sobrietyConfidence, 'Sobriety Confidence') : 'Rate your confidence in staying sober'}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Importance of Recovery {isFieldRequired(recoveryImportance) && <span className="text-red-500">*</span>}
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={recoveryImportance || 5}
            onChange={(e) => onRecoveryImportanceChange(parseInt(e.target.value))}
            className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer"
            aria-label="Recovery importance from 1 to 10"
          />
          <div className="text-sm text-gray-500 text-center">
            {recoveryImportance ? getFieldLabel(recoveryImportance, 'Recovery Importance') : 'How important is recovery to you today?'}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Personal Recovery Strength {isFieldRequired(recoveryStrength) && <span className="text-red-500">*</span>}
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={recoveryStrength || 5}
            onChange={(e) => onRecoveryStrengthChange(parseInt(e.target.value))}
            className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer"
            aria-label="Recovery strength from 1 to 10"
          />
          <div className="text-sm text-gray-500 text-center">
            {recoveryStrength ? getFieldLabel(recoveryStrength, 'Recovery Strength') : 'How strong do you feel in your recovery today?'}
          </div>
        </div>

        <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            id="supportNeeded"
            checked={supportNeeded || false}
            onChange={(e) => onSupportNeededChange(e.target.checked)}
            className="h-5 w-5 rounded text-blue-500 focus:ring-blue-500 mt-1"
            aria-describedby="support-help"
          />
          <div className="flex-1">
            <label htmlFor="supportNeeded" className="text-sm font-medium text-gray-700 cursor-pointer">
              I need extra support today
            </label>
            <p id="support-help" className="text-xs text-gray-500 mt-1">
              Check this if you're feeling like you could use additional help or someone to talk to today.
            </p>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        <span className="text-red-500">*</span> Required fields
      </div>
    </div>
  );
};
