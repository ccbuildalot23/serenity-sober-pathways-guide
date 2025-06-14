
import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Brain, Zap, Heart, Save } from 'lucide-react';

interface MoodEntry {
  id: string;
  date: Date;
  mood_rating: number;
  energy_rating: number;
  triggers: string[];
  gratitude: string[];
  notes: string;
  created_at: Date;
}

interface DayDetailSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  selectedDayData?: MoodEntry;
  onUpdate: (updates: Partial<MoodEntry>) => void;
}

const DayDetailSheet: React.FC<DayDetailSheetProps> = ({
  isOpen,
  onOpenChange,
  selectedDate,
  selectedDayData,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<MoodEntry>>({});

  React.useEffect(() => {
    if (selectedDayData) {
      setEditedData({
        mood_rating: selectedDayData.mood_rating,
        energy_rating: selectedDayData.energy_rating,
        notes: selectedDayData.notes,
      });
    }
  }, [selectedDayData]);

  const handleSave = () => {
    onUpdate(editedData);
    setIsEditing(false);
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!selectedDate || !selectedDayData) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{formatDate(selectedDate)}</SheetTitle>
          <SheetDescription>
            View and edit your daily check-in
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Mood Rating */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              <Label>Mood Rating</Label>
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <Slider
                  value={[editedData.mood_rating || 5]}
                  onValueChange={([value]) =>
                    setEditedData({ ...editedData, mood_rating: value })
                  }
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <div className="text-center text-sm text-gray-600">
                  {editedData.mood_rating || 5}/10
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all"
                    style={{ width: `${(selectedDayData.mood_rating / 10) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{selectedDayData.mood_rating}/10</span>
              </div>
            )}
          </div>

          {/* Energy Rating */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <Label>Energy Level</Label>
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <Slider
                  value={[editedData.energy_rating || 5]}
                  onValueChange={([value]) =>
                    setEditedData({ ...editedData, energy_rating: value })
                  }
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <div className="text-center text-sm text-gray-600">
                  {editedData.energy_rating || 5}/10
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 transition-all"
                    style={{ width: `${(selectedDayData.energy_rating / 10) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{selectedDayData.energy_rating}/10</span>
              </div>
            )}
          </div>

          {/* Triggers */}
          {selectedDayData.triggers.length > 0 && (
            <div className="space-y-3">
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
          {selectedDayData.gratitude.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                <Label>Gratitude</Label>
              </div>
              <ul className="space-y-1">
                {selectedDayData.gratitude.map((item, index) => (
                  <li key={index} className="text-sm text-gray-600">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-3">
            <Label>Notes</Label>
            {isEditing ? (
              <Textarea
                value={editedData.notes || ''}
                onChange={(e) =>
                  setEditedData({ ...editedData, notes: e.target.value })
                }
                placeholder="Add any additional notes..."
                rows={4}
              />
            ) : (
              <p className="text-sm text-gray-600">
                {selectedDayData.notes || 'No notes added'}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            {isEditing ? (
              <>
                <Button onClick={handleSave} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedData({
                      mood_rating: selectedDayData.mood_rating,
                      energy_rating: selectedDayData.energy_rating,
                      notes: selectedDayData.notes,
                    });
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)} className="w-full">
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
