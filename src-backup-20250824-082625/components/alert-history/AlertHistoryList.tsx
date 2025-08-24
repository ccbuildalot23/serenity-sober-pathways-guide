
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AlertCard from './AlertCard';

interface AlertRecord {
  id: string;
  timestamp: Date;
  message: string;
  recipients: string[];
  location?: string;
  notes?: string;
  type: 'sms' | 'push';
}

interface AlertHistoryListProps {
  groupedAlerts: { [key: string]: AlertRecord[] };
  editingNotes: string | null;
  notesText: string;
  onSetEditingNotes: (id: string) => void;
  onSetNotesText: (text: string) => void;
  onSaveNotes: (alertId: string) => void;
  onCancelEdit: () => void;
}

const AlertHistoryList: React.FC<AlertHistoryListProps> = ({
  groupedAlerts,
  editingNotes,
  notesText,
  onSetEditingNotes,
  onSetNotesText,
  onSaveNotes,
  onCancelEdit
}) => {
  return (
    <div className="space-y-4">
      {Object.keys(groupedAlerts).length === 0 && (
        <p className="text-gray-500 text-center py-8">
          No alerts to display yet. Alerts you send will appear here!
        </p>
      )}
      {Object.entries(groupedAlerts).map(([groupName, alerts]) => (
        <Card key={groupName}>
          <CardHeader>
            <CardTitle className="text-lg">{groupName}</CardTitle>
            <CardDescription>{alerts.length} alert(s)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                editingNotes={editingNotes}
                notesText={notesText}
                onSetEditingNotes={onSetEditingNotes}
                onSetNotesText={onSetNotesText}
                onSaveNotes={onSaveNotes}
                onCancelEdit={onCancelEdit}
              />
            ))}
            
            {alerts.length === 0 && (
              <p className="text-gray-500 text-center py-4">No alerts in this group</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AlertHistoryList;
