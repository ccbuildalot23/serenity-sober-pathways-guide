
import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Eye, User, Home, Brain, UserCircle, BookOpen } from 'lucide-react';

interface ViewToggleProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

const ViewToggle = ({ currentView, onViewChange }: ViewToggleProps) => {
  const views = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'cbt-skills', label: 'CBT Skills', icon: Brain },
    { id: 'profile', label: 'Profile', icon: UserCircle },
    { id: 'resources', label: 'Resources', icon: BookOpen }
  ];

  return (
    <div className="flex items-center space-x-2">
      {views.map((view) => {
        const IconComponent = view.icon;
        return (
          <Button
            key={view.id}
            variant={currentView === view.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange(view.id)}
            className="flex items-center gap-2"
          >
            <IconComponent className="w-4 h-4" />
            <span className="hidden md:inline">{view.label}</span>
          </Button>
        );
      })}
    </div>
  );
};

export default ViewToggle;
