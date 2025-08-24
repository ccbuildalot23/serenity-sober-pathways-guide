
import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface AlertResultsProps {
  results: { success: string[]; failed: string[] } | null;
}

const AlertResults = ({ results }: AlertResultsProps) => {
  if (!results) return null;

  return (
    <div className="space-y-2">
      {results.success.length > 0 && (
        <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-md">
          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
          <div>
            <p className="text-sm font-medium text-green-800">
              Alert sent to {results.success.join(', ')}
            </p>
          </div>
        </div>
      )}
      
      {results.failed.length > 0 && (
        <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md">
          <XCircle className="w-5 h-5 text-red-600 mr-2" />
          <div>
            <p className="text-sm font-medium text-red-800">
              Failed to send to {results.failed.join(', ')}
            </p>
            <p className="text-xs text-red-600">Please try again</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertResults;
