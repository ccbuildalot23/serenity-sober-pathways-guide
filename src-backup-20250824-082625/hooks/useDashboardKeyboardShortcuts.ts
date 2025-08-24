
import { useEffect } from 'react';

export const useDashboardKeyboardShortcuts = () => {
  useEffect(() => {
    const _handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'h':
            e.preventDefault();
            window.location.href = '/';
            break;
          case 'c':
            e.preventDefault();
            window.location.href = '/calendar';
            break;
          case 't':
            e.preventDefault();
            window.location.href = '/crisis-support';
            break;
          case 's':
            e.preventDefault();
            window.location.href = '/settings';
            break;
        }
      }
    };

    window.addEventListener('keydown', _handleKeyPress);
    return () => window.removeEventListener('keydown', _handleKeyPress);
  }, []);
};
