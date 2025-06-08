
import React from 'react';

interface AssessmentsSectionProps {
  phq2Q1: number | null;
  phq2Q2: number | null;
  gad2Q1: number | null;
  gad2Q2: number | null;
  onPhq2Q1Change: (value: number) => void;
  onPhq2Q2Change: (value: number) => void;
  onGad2Q1Change: (value: number) => void;
  onGad2Q2Change: (value: number) => void;
}

export const AssessmentsSection: React.FC<AssessmentsSectionProps> = ({
  phq2Q1,
  phq2Q2,
  gad2Q1,
  gad2Q2,
  onPhq2Q1Change,
  onPhq2Q2Change,
  onGad2Q1Change,
  onGad2Q2Change
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Quick Assessments</h3>
      <p className="text-gray-600">Answer these quick questions to track your mental well-being.</p>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Over the past 2 weeks, how often have you been bothered by little interest or pleasure in doing things?
        </label>
        <select
          value={phq2Q1 || 0}
          onChange={(e) => onPhq2Q1Change(parseInt(e.target.value))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value={0}>Not at all</option>
          <option value={1}>Several days</option>
          <option value={2}>More than half the days</option>
          <option value={3}>Nearly every day</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Over the past 2 weeks, how often have you been bothered by feeling down, depressed, or hopeless?
        </label>
        <select
          value={phq2Q2 || 0}
          onChange={(e) => onPhq2Q2Change(parseInt(e.target.value))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value={0}>Not at all</option>
          <option value={1}>Several days</option>
          <option value={2}>More than half the days</option>
          <option value={3}>Nearly every day</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Over the last 2 weeks, how often have you been bothered by feeling nervous, anxious, or on edge?
        </label>
        <select
          value={gad2Q1 || 0}
          onChange={(e) => onGad2Q1Change(parseInt(e.target.value))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value={0}>Not at all</option>
          <option value={1}>Several days</option>
          <option value={2}>More than half the days</option>
          <option value={3}>Nearly every day</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Over the last 2 weeks, how often have you been bothered by not being able to stop or control worrying?
        </label>
        <select
          value={gad2Q2 || 0}
          onChange={(e) => onGad2Q2Change(parseInt(e.target.value))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value={0}>Not at all</option>
          <option value={1}>Several days</option>
          <option value={2}>More than half the days</option>
          <option value={3}>Nearly every day</option>
        </select>
      </div>
    </div>
  );
};
