
import React from 'react';
import { CheckinResponses } from '@/types/dailyCheckIn';

interface CheckInResponseHandlersProps {
  responses: CheckinResponses;
  setResponses: React.Dispatch<React.SetStateAction<CheckinResponses>>;
  markSectionComplete: (section: string) => void;
  children: (handlers: any) => React.ReactNode;
}

export const CheckInResponseHandlers: React.FC<CheckInResponseHandlersProps> = ({
  responses,
  setResponses,
  markSectionComplete,
  children
}) => {
  const handleMoodChange = (value: number) => {
    setResponses(prev => ({ ...prev, mood: value }));
    markSectionComplete('mood');
  };

  const handleEnergyChange = (value: number) => {
    setResponses(prev => ({ ...prev, energy: value }));
    markSectionComplete('wellness');
  };

  const handleHopeChange = (value: number) => {
    setResponses(prev => ({ ...prev, hope: value }));
    markSectionComplete('wellness');
  };

  const handleSobrietyConfidenceChange = (value: number) => {
    setResponses(prev => ({ ...prev, sobriety_confidence: value }));
    markSectionComplete('wellness');
  };

  const handleRecoveryImportanceChange = (value: number) => {
    setResponses(prev => ({ ...prev, recovery_importance: value }));
    markSectionComplete('wellness');
  };

  const handleRecoveryStrengthChange = (value: string) => {
    setResponses(prev => ({ ...prev, recovery_strength: value }));
    markSectionComplete('wellness');
  };

  const handleSupportNeededChange = (checked: boolean) => {
    setResponses(prev => ({ ...prev, support_needed: checked }));
    markSectionComplete('wellness');
  };

  const handlePhq2Q1Change = (value: number) => {
    setResponses(prev => ({ ...prev, phq2_q1: value }));
    markSectionComplete('assessments');
  };

  const handlePhq2Q2Change = (value: number) => {
    setResponses(prev => ({ ...prev, phq2_q2: value }));
    markSectionComplete('assessments');
  };

  const handleGad2Q1Change = (value: number) => {
    setResponses(prev => ({ ...prev, gad2_q1: value }));
    markSectionComplete('assessments');
  };

  const handleGad2Q2Change = (value: number) => {
    setResponses(prev => ({ ...prev, gad2_q2: value }));
    markSectionComplete('assessments');
  };

  const handlers = {
    handleMoodChange,
    handleEnergyChange,
    handleHopeChange,
    handleSobrietyConfidenceChange,
    handleRecoveryImportanceChange,
    handleRecoveryStrengthChange,
    handleSupportNeededChange,
    handlePhq2Q1Change,
    handlePhq2Q2Change,
    handleGad2Q1Change,
    handleGad2Q2Change
  };

  return <>{children(handlers)}</>;
};
