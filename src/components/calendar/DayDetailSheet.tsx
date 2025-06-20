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
import { Card } from '@/components/ui/card';
import { Brain, Zap, Heart, Save, Sparkles, Trophy, MessageCircle } from 'lucide-react';
import { MoodEntry } from '@/types/calendar';

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
        energy_rating: selectedDayData.energy_rating || 5,
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

  const getMoodMessage = (rating: number) => {
    if (rating >= 8) return "You were thriving! \ud83c\udf1f Celebrate this victory!";
    if (rating >= 6) return "You showed great strength! \ud83d\udcaa Keep building on this.";
    if (rating >= 4) return "You kept moving forward! \ud83c\udf31 That takes courage.";
    return "You showed up! \ud83c\udf05 That's what matters most.";
  };

  const getMoodColor = (rating: number) => {
    if (rating >= 8) return "from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20";
    if (rating >= 6) return "from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20";
    if (rating >= 4) return "from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20";
    return "from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-800/20";
  };

  if (!selectedDate || !selectedDayData) return null;

  const energyRating = selectedDayData.energy_rating || 5;
  const moodColor = getMoodColor(selectedDayData.mood_rating);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl">{formatDate(selectedDate)}</SheetTitle>
          <SheetDescription className="text-base">
            Reflecting on your journey
          </SheetDescription>
        </SheetHeader>

        {/* Mood Celebration Card */}
        {!isEditing && (
          <Card className={`mb-6 bg-gradient-to-br ${moodColor} border-0`}>
            <div className="p-4 text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {getMoodMessage(selectedDayData.mood_rating)}
              </p>
            </div>
          </Card>
        )}

        <div className="space-y-6">
          {/* Mood Rating */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              <Label className="text-base">How You Felt</Label>
              {selectedDayData.mood_rating >= 7 && !isEditing && (
                <Trophy className="h-4 w-4 text-yellow-500 ml-auto" />
              )}
            </div>
            {isEditing ? (
              <div className="space-y-3">
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
                <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                  {editedData.mood_rating || 5}/10
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all"
                      style={{ width: `${(selectedDayData.mood_rating / 10) * 100}%` }}
                    />
                  </div>
                  <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {selectedDayData.mood_rating}/10
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Energy Rating */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <Label className="text-base">Your Energy</Label>
              {energyRating >= 7 && !isEditing && (
                <Sparkles className="h-4 w-4 text-amber-500 ml-auto" />
              )}
            </div>
            {isEditing ? (
              <div className="space-y-3">
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
                <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                  {editedData.energy_rating || 5}/10
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all"
                      style={{ width: `${(energyRating / 10) * 100}%` }}
                    />
                  </div>
                  <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {energyRating}/10
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Triggers - Reframed as Growth Opportunities */}
          {selectedDayData.triggers && selectedDayData.triggers.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base">Growth Opportunities Noticed</Label>
              <div className="flex flex-wrap gap-2">
                {selectedDayData.triggers.map((trigger, index) => (
                  <Badge key={index} variant="secondary" className="bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
                    {trigger}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Awareness is the first step to growth \ud83c\udf31
              </p>
            </div>
          )}

          {/* Gratitude */}
          {selectedDayData.gratitude && selectedDayData.gratitude.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-500" />
                <Label className="text-base">Gratitude Moments</Label>
              </div>
              <Card className="bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800">
                <ul className="p-3 space-y-1">
                  {selectedDayData.gratitude.map((item, index) => (
                    <li key={index} className="text-sm text-pink-700 dark:text-pink-300 flex items-start gap-2">
                      <span className="text-pink-500">\u2022</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-blue-500" />
              <Label className="text-base">Your Reflections</Label>
            </div>
            {isEditing ? (
              <Textarea
                value={editedData.notes || ''}
                onChange={(e) =>
                  setEditedData({ ...editedData, notes: e.target.value })
                }
                placeholder="Add any thoughts or reflections..."
                rows={4}
                className="resize-none"
              />
            ) : (
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <p className="p-3 text-sm text-blue-700 dark:text-blue-300">
                  {selectedDayData.notes || 'No reflections added for this day'}
                </p>
              </Card>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            {isEditing ? (
              <>
                <Button onClick={handleSave} className="flex-1 bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedData({
                      mood_rating: selectedDayData.mood_rating,
                      energy_rating: selectedDayData.energy_rating || 5,
                      notes: selectedDayData.notes,
                    });
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)} className="w-full" variant="outline">
                Edit This Entry
              </Button>
            )}
          </div>
        </div>

        {/* Motivational Footer */}
        {!isEditing && (
          <Card className="mt-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
            <div className="p-4 text-center text-sm">
              <p>Every entry is a victory. Keep going! \ud83d\udc9c</p>
            </div>
          </Card>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default DayDetailSheet;
