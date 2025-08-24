import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, Heart, Zap, Edit, Save } from 'lucide-react';
import { MoodEntry } from '@/types/calendar';
import { formatDate } from './utils/calendarHelpers';

interface DayDetailSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | undefined;
  selectedDayData: MoodEntry | undefined;
  onUpdate: (updates: Partial<MoodEntry>) => void;
}

const DayDetailSheet: React.FC<DayDetailSheetProps> = ({
  isOpen,
  onOpenChange,
  selectedDate,
  selectedDayData,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedData, setEditedData] = React.useState<Partial<MoodEntry>>({});

  React.useEffect(() => {
    if (selectedDayData) {
      setEditedData(selectedDayData);
    }
  }, [selectedDayData]);

  const handleSave = () => {
    onUpdate(editedData);
    setIsEditing(false);
  };

  const getMoodEmoji = (mood: number) => {
    if (mood >= 8) return '✨';
    if (mood >= 6) return '💪';
    if (mood >= 4) return '🌱';
    return '🌅';
  };

  if (!selectedDate || !selectedDayData) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {formatDate(selectedDate, 'EEEE, MMMM d, yyyy')}
          </SheetTitle>
          <SheetDescription>
            Your recovery journey for this day
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Mood and Energy */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Mood Rating
              </Label>
              {isEditing ? (
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={editedData.mood_rating || selectedDayData.mood_rating}
                  onChange={(e) => setEditedData({ ...editedData, mood_rating: parseInt(e.target.value) })}
                  className="w-full"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-lg">
                    {getMoodEmoji(selectedDayData.mood_rating)} {selectedDayData.mood_rating}/10
                  </Badge>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Energy Level
              </Label>
              {isEditing ? (
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={editedData.energy_rating || selectedDayData.energy_rating || 5}
                  onChange={(e) => setEditedData({ ...editedData, energy_rating: parseInt(e.target.value) })}
                  className="w-full"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-lg">
                    ⚡ {selectedDayData.energy_rating || 'N/A'}/10
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Triggers */}
          {selectedDayData.triggers && selectedDayData.triggers.length > 0 && (
            <div className="space-y-2">
              <Label>Triggers</Label>
              <div className="flex flex-wrap gap-2">
                {selectedDayData.triggers.map((trigger, index) => (
                  <Badge key={index} variant="secondary">
                    {trigger}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Gratitude */}
          {selectedDayData.gratitude && selectedDayData.gratitude.length > 0 && (
            <div className="space-y-2">
              <Label>Gratitude</Label>
              <div className="space-y-1">
                {selectedDayData.gratitude.map((item, index) => (
                  <div key={index} className="text-sm text-muted-foreground">
                    • {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            {isEditing ? (
              <Textarea
                value={editedData.notes || selectedDayData.notes || ''}
                onChange={(e) => setEditedData({ ...editedData, notes: e.target.value })}
                placeholder="Add your thoughts for this day..."
                rows={4}
              />
            ) : (
              <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                {selectedDayData.notes || 'No notes for this day'}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button onClick={handleSave} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)} className="flex-1">
                <Edit className="h-4 w-4 mr-2" />
                Edit Entry
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default DayDetailSheet;
