
import React, { useEffect } from 'react';

interface AssessmentsSectionProps {
  phq2Q1: number | null;
  phq2Q2: number | null;
  gad2Q1: number | null;
  gad2Q2: number | null;
  onPhq2Q1Change: (value: number) => void;
  onPhq2Q2Change: (value: number) => void;
  onGad2Q1Change: (value: number) => void;
  onGad2Q2Change: (value: number) => void;
  onSectionComplete?: () => void;
}

const assessmentOptions = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' }
];

export const AssessmentsSection: React.FC<AssessmentsSectionProps> = ({
  phq2Q1,
  phq2Q2,
  gad2Q1,
  gad2Q2,
  onPhq2Q1Change,
  onPhq2Q2Change,
  onGad2Q1Change,
  onGad2Q2Change,
  onSectionComplete
}) => {
  // Check if section is complete whenever values change
  useEffect(() => {
    if (phq2Q1 !== null && phq2Q2 !== null && gad2Q1 !== null && gad2Q2 !== null) {
      onSectionComplete?.();
    }
  }, [phq2Q1, phq2Q2, gad2Q1, gad2Q2, onSectionComplete]);

  const isFieldRequired = (value: number | null) => value === null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">Quick Assessments</h3>
        <p className="text-gray-600 mb-4">
          Answer these questions to help track your mental well-being over time.
        </p>
      </div>

      <div className="space-y-6">
        {/* PHQ-2 Questions */}
        <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900">Depression Screening (PHQ-2)</h4>
          <p className="text-sm text-blue-700 mb-4">Over the past 2 weeks, how often have you been bothered by...</p>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Little interest or pleasure in doing things? {isFieldRequired(phq2Q1) && <span className="text-red-500">*</span>}
              </label>
              <div className="space-y-2">
                {assessmentOptions.map((option) => (
                  <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="phq2q1"
                      value={option.value}
                      checked={phq2Q1 === option.value}
                      onChange={() => onPhq2Q1Change(option.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Feeling down, depressed, or hopeless? {isFieldRequired(phq2Q2) && <span className="text-red-500">*</span>}
              </label>
              <div className="space-y-2">
                {assessmentOptions.map((option) => (
                  <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="phq2q2"
                      value={option.value}
                      checked={phq2Q2 === option.value}
                      onChange={() => onPhq2Q2Change(option.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* GAD-2 Questions */}
        <div className="space-y-4 p-4 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-900">Anxiety Screening (GAD-2)</h4>
          <p className="text-sm text-green-700 mb-4">Over the last 2 weeks, how often have you been bothered by...</p>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Feeling nervous, anxious, or on edge? {isFieldRequired(gad2Q1) && <span className="text-red-500">*</span>}
              </label>
              <div className="space-y-2">
                {assessmentOptions.map((option) => (
                  <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gad2q1"
                      value={option.value}
                      checked={gad2Q1 === option.value}
                      onChange={() => onGad2Q1Change(option.value)}
                      className="h-4 w-4 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Not being able to stop or control worrying? {isFieldRequired(gad2Q2) && <span className="text-red-500">*</span>}
              </label>
              <div className="space-y-2">
                {assessmentOptions.map((option) => (
                  <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gad2q2"
                      value={option.value}
                      checked={gad2Q2 === option.value}
                      onChange={() => onGad2Q2Change(option.value)}
                      className="h-4 w-4 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        <span className="text-red-500">*</span> All questions are required to complete this section
      </div>
    </div>
  );
};
