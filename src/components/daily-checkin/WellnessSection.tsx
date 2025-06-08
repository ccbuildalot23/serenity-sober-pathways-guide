
import React from 'react';

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
  onSupportNeededChange
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Wellness Check</h3>
      <p className="text-gray-600">Rate these aspects of your well-being.</p>

      <div>
        <label className="block text-sm font-medium text-gray-700">Energy Level</label>
        <input
          type="range"
          min="1"
          max="10"
          value={energy || 5}
          onChange={(e) => onEnergyChange(parseInt(e.target.value))}
          className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer"
        />
        {energy && <div className="text-sm text-gray-500">Energy: {energy}/10</div>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Level of Hope</label>
        <input
          type="range"
          min="1"
          max="10"
          value={hope || 5}
          onChange={(e) => onHopeChange(parseInt(e.target.value))}
          className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer"
        />
        {hope && <div className="text-sm text-gray-500">Hope: {hope}/10</div>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Sobriety Confidence</label>
        <input
          type="range"
          min="1"
          max="10"
          value={sobrietyConfidence || 5}
          onChange={(e) => onSobrietyConfidenceChange(parseInt(e.target.value))}
          className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer"
        />
        {sobrietyConfidence && <div className="text-sm text-gray-500">Sobriety Confidence: {sobrietyConfidence}/10</div>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Importance of Recovery</label>
        <input
          type="range"
          min="1"
          max="10"
          value={recoveryImportance || 5}
          onChange={(e) => onRecoveryImportanceChange(parseInt(e.target.value))}
          className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer"
        />
        {recoveryImportance && <div className="text-sm text-gray-500">Recovery Importance: {recoveryImportance}/10</div>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Personal Recovery Strength</label>
        <input
          type="range"
          min="1"
          max="10"
          value={recoveryStrength || 5}
          onChange={(e) => onRecoveryStrengthChange(parseInt(e.target.value))}
          className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer"
        />
        {recoveryStrength && <div className="text-sm text-gray-500">Recovery Strength: {recoveryStrength}/10</div>}
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="supportNeeded"
          checked={supportNeeded || false}
          onChange={(e) => onSupportNeededChange(e.target.checked)}
          className="h-5 w-5 rounded text-blue-500 focus:ring-blue-500"
        />
        <label htmlFor="supportNeeded" className="text-sm font-medium text-gray-700">
          I need extra support today
        </label>
      </div>
    </div>
  );
};
