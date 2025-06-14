
import React from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="w-4 h-4 animate-pulse-subtle" />;
      case 'dark':
        return <Moon className="w-4 h-4 animate-pulse-subtle" />;
      case 'system':
        return <Monitor className="w-4 h-4 animate-pulse-subtle" />;
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="w-10 h-10 p-0 hover:scale-105 transition-all duration-300 dark:border-gray-600 dark:hover:bg-gray-800"
    >
      {getIcon()}
    </Button>
  );
};
