
import React from 'react';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getMoodColorClass } from '@/utils/calendarUtils';
import type { DayData } from '@/types/calendar';

interface DayDetailSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  selectedDayData?: DayData;
}

const DayDetailSheet: React.FC<DayDetailSheetProps> = ({
  isOpen,
  onOpenChange,
  selectedDate,
  selectedDayData
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>
            {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </SheetTitle>
        </SheetHeader>
        
        {selectedDayData && (
          <div className="mt-6 space-y-4">
            {/* Mood Timeline */}
            <div>
              <h3 className="font-medium mb-2">Mood Timeline</h3>
              <div className="space-y-2">
                {selectedDayData.entries.map((entry, index) => (
                  <div key={entry.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-full", getMoodColorClass(entry.mood_rating))} />
                      <span className="text-sm font-medium">{entry.mood_rating}/10</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {format(entry.created_at, 'h:mm a')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Triggers */}
            {selectedDayData.entries.some(e => e.triggers?.length) && (
              <div>
                <h3 className="font-medium mb-2">Triggers</h3>
                <div className="flex flex-wrap gap-1">
                  {selectedDayData.entries.flatMap(e => e.triggers || []).map((trigger, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {trigger}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Gratitude */}
            {selectedDayData.entries.some(e => e.gratitude?.length) && (
              <div>
                <h3 className="font-medium mb-2">Gratitude</h3>
                <ul className="space-y-1">
                  {selectedDayData.entries.flatMap(e => e.gratitude || []).map((item, index) => (
                    <li key={index} className="text-sm text-gray-600">• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Notes */}
            {selectedDayData.entries.some(e => e.notes) && (
              <div>
                <h3 className="font-medium mb-2">Notes</h3>
                <div className="space-y-2">
                  {selectedDayData.entries.filter(e => e.notes).map((entry, index) => (
                    <p key={index} className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                      {entry.notes}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default DayDetailSheet;
