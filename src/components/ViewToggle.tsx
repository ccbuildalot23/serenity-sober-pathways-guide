
import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Eye, User } from 'lucide-react';

interface ViewToggleProps {
  isSupporterView: boolean;
  onToggle: (enabled: boolean) => void;
}

const ViewToggle = ({ isSupporterView, onToggle }: ViewToggleProps) => {
  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white rounded-lg border shadow-lg p-3 flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          {isSupporterView ? (
            <Eye className="w-4 h-4 text-blue-600" />
          ) : (
            <User className="w-4 h-4 text-gray-600" />
          )}
          <span className="text-sm font-medium">
            {isSupporterView ? 'Supporter View' : 'User View'}
          </span>
        </div>
        
        <Switch
          checked={isSupporterView}
          onCheckedChange={onToggle}
          id="view-toggle"
        />
        
        {isSupporterView && (
          <Badge variant="secondary" className="text-xs">
            Preview Mode
          </Badge>
        )}
      </div>
    </div>
  );
};

export default ViewToggle;
