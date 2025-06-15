
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Users, MapPin, MessageSquare, Edit3 } from 'lucide-react';

interface AlertRecord {
  id: string;
  timestamp: Date;
  message: string;
  recipients: string[];
  location?: string;
  notes?: string;
  type: 'sms' | 'push';
}

interface AlertCardProps {
  alert: AlertRecord;
  editingNotes: string | null;
  notesText: string;
  onSetEditingNotes: (id: string) => void;
  onSetNotesText: (text: string) => void;
  onSaveNotes: (alertId: string) => void;
  onCancelEdit: () => void;
}

const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  editingNotes,
  notesText,
  onSetEditingNotes,
  onSetNotesText,
  onSaveNotes,
  onCancelEdit
}) => {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              {alert.timestamp.toLocaleDateString()} at {alert.timestamp.toLocaleTimeString()}
            </span>
            <Badge variant={alert.type === 'sms' ? 'default' : 'secondary'}>
              {alert.type.toUpperCase()}
            </Badge>
          </div>
          
          <p className="font-medium">{alert.message}</p>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{alert.recipients.join(', ')}</span>
            </div>
            
            {alert.location && (
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span className="truncate max-w-48">{alert.location}</span>
              </div>
            )}
          </div>
          
          {alert.notes && (
            <div className="bg-blue-50 border border-blue-200 rounded p-2">
              <div className="flex items-center space-x-1 mb-1">
                <MessageSquare className="w-3 h-3 text-blue-600" />
                <span className="text-xs font-medium text-blue-800">Notes</span>
              </div>
              <p className="text-sm text-blue-700">{alert.notes}</p>
            </div>
          )}
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onSetEditingNotes(alert.id);
                onSetNotesText(alert.notes || '');
              }}
              aria-label="Add or edit notes for this alert"
            >
              <Edit3 className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Notes</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="notes">What helped? What was the outcome?</Label>
                <Textarea
                  id="notes"
                  placeholder="Add your reflections about this alert..."
                  value={notesText}
                  onChange={(e) => onSetNotesText(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={onCancelEdit}>
                  Cancel
                </Button>
                <Button onClick={() => onSaveNotes(alert.id)}>
                  Save Notes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AlertCard;
