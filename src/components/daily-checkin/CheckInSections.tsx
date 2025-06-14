
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, CheckCircle, Calendar, TrendingUp } from 'lucide-react';
import { MoodSection } from './MoodSection';
import { WellnessSection } from './WellnessSection';
import { AssessmentsSection } from './AssessmentsSection';
import { CheckinResponses } from '@/types/dailyCheckIn';

interface CheckInSectionsProps {
  responses: CheckinResponses;
  setResponses: React.Dispatch<React.SetStateAction<CheckinResponses>>;
  completedSections: Set<string>;
  markSectionComplete: (section: string) => void;
  canComplete: () => boolean;
  checkWellnessCompletion: () => void;
}

export const CheckInSections: React.FC<CheckInSectionsProps> = ({
  responses,
  setResponses,
  completedSections,
  markSectionComplete,
  canComplete,
  checkWellnessCompletion
}) => {
  const handleMoodChange = (value: number) => {
    setResponses(prev => ({ ...prev, mood: value }));
    markSectionComplete('mood');
  };

  return (
    <div className="space-y-6">
      {/* Mood Section */}
      <Card 
        id="mood"
        className={`transition-all duration-300 ${
          completedSections.has('mood') 
            ? 'border-green-200 bg-green-50' 
            : !canComplete() && completedSections.size > 0 && !completedSections.has('mood')
              ? 'border-yellow-200 bg-yellow-50 ring-2 ring-yellow-300' 
              : ''
        }`}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            Mood Check
            {completedSections.has('mood') && <CheckCircle className="w-4 h-4 text-green-600" />}
            {!completedSections.has('mood') && !canComplete() && completedSections.size > 0 && (
              <Badge variant="outline" className="ml-auto text-yellow-600 border-yellow-600">Required</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MoodSection
            mood={responses.mood}
            onMoodChange={handleMoodChange}
          />
        </CardContent>
      </Card>

      {/* Wellness Section */}
      <Card 
        id="wellness"
        className={`transition-all duration-300 ${
          completedSections.has('wellness') 
            ? 'border-green-200 bg-green-50' 
            : !canComplete() && completedSections.size > 0 && !completedSections.has('wellness')
              ? 'border-yellow-200 bg-yellow-50 ring-2 ring-yellow-300' 
              : ''
        }`}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Wellness Check
            {completedSections.has('wellness') && <CheckCircle className="w-4 h-4 text-green-600" />}
            {!completedSections.has('wellness') && !canComplete() && completedSections.size > 0 && (
              <Badge variant="outline" className="ml-auto text-yellow-600 border-yellow-600">Required</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WellnessSection
            energy={responses.energy}
            hope={responses.hope}
            sobrietyConfidence={responses.sobriety_confidence}
            recoveryImportance={responses.recovery_importance}
            recoveryStrength={responses.recovery_strength}
            supportNeeded={responses.support_needed}
            onEnergyChange={(value) => {
              setResponses(prev => ({ ...prev, energy: value }));
              checkWellnessCompletion();
            }}
            onHopeChange={(value) => {
              setResponses(prev => ({ ...prev, hope: value }));
              checkWellnessCompletion();
            }}
            onSobrietyConfidenceChange={(value) => {
              setResponses(prev => ({ ...prev, sobriety_confidence: value }));
              checkWellnessCompletion();
            }}
            onRecoveryImportanceChange={(value) => {
              setResponses(prev => ({ ...prev, recovery_importance: value }));
              checkWellnessCompletion();
            }}
            onRecoveryStrengthChange={(value) => {
              setResponses(prev => ({ ...prev, recovery_strength: value }));
              checkWellnessCompletion();
            }}
            onSupportNeededChange={(checked) => {
              setResponses(prev => ({ ...prev, support_needed: checked }));
            }}
            onSectionComplete={checkWellnessCompletion}
          />
        </CardContent>
      </Card>

      {/* Assessments Section */}
      <Card 
        id="assessments"
        className={`transition-all duration-300 ${
          completedSections.has('assessments') 
            ? 'border-green-200 bg-green-50' 
            : !canComplete() && completedSections.size > 0 && !completedSections.has('assessments')
              ? 'border-yellow-200 bg-yellow-50 ring-2 ring-yellow-300' 
              : ''
        }`}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            Mental Health Screening
            {completedSections.has('assessments') && <CheckCircle className="w-4 h-4 text-green-600" />}
            {!completedSections.has('assessments') && !canComplete() && completedSections.size > 0 && (
              <Badge variant="outline" className="ml-auto text-yellow-600 border-yellow-600">Required</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AssessmentsSection
            phq2Q1={responses.phq2_q1}
            phq2Q2={responses.phq2_q2}
            gad2Q1={responses.gad2_q1}
            gad2Q2={responses.gad2_q2}
            onPhq2Q1Change={(value) => setResponses(prev => ({ ...prev, phq2_q1: value }))}
            onPhq2Q2Change={(value) => setResponses(prev => ({ ...prev, phq2_q2: value }))}
            onGad2Q1Change={(value) => setResponses(prev => ({ ...prev, gad2_q1: value }))}
            onGad2Q2Change={(value) => setResponses(prev => ({ ...prev, gad2_q2: value }))}
            onSectionComplete={() => markSectionComplete('assessments')}
          />
        </CardContent>
      </Card>
    </div>
  );
};
