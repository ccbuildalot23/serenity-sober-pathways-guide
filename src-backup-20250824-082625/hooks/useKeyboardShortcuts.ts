
import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  callback: () => void;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    shortcuts.forEach(({ key, ctrlKey = false, metaKey = false, callback }) => {
      const isCtrlOrCmd = ctrlKey && (event.ctrlKey || event.metaKey);
      const isMetaKey = metaKey && event.metaKey;
      
      if (event.key.toLowerCase() === key.toLowerCase() && 
          (isCtrlOrCmd || isMetaKey || (!ctrlKey && !metaKey))) {
        event.preventDefault();
        callback();
      }
    });
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};
