
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Download, Eye, EyeOff } from 'lucide-react';

interface AlertHistoryHeaderProps {
  historyEnabled: boolean;
  onToggleHistory: (enabled: boolean) => void;
  onExportCSV: () => void;
  error: string | null;
}

const AlertHistoryHeader: React.FC<AlertHistoryHeaderProps> = ({
  historyEnabled,
  onToggleHistory,
  onExportCSV,
  error
}) => {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alert History</h1>
          <p className="text-gray-600">Track and analyze your emergency alerts</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="history-toggle" className="text-sm">
              {historyEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Label>
            <Switch
              id="history-toggle"
              checked={historyEnabled}
              onCheckedChange={onToggleHistory}
              aria-label="Toggle alert history tracking"
            />
            <span className="text-sm text-gray-600">
              {historyEnabled ? 'Tracking enabled' : 'Tracking disabled'}
            </span>
          </div>
          
          <Button onClick={onExportCSV} variant="outline" size="sm" aria-label="Export alert history as CSV">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {!historyEnabled && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <EyeOff className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">Alert history tracking is disabled</p>
                <p className="text-sm text-yellow-700">Enable tracking to see new alerts and analytics.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default AlertHistoryHeader;
