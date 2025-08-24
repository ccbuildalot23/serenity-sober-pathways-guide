
import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

export const KeyboardShortcutsInfo: React.FC = () => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            aria-label="View keyboard shortcuts"
          >
            <Info className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <h4 className="font-semibold">Keyboard Shortcuts</h4>
            <div className="space-y-1 text-sm">
              <div><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+H</kbd> Home</div>
              <div><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+C</kbd> Calendar</div>
              <div><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+T</kbd> Crisis Toolkit</div>
              <div><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+S</kbd> Settings</div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
