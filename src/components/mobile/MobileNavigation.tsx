import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Heart, Users, Shield, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  icon: React.ElementType;
  label: string;
  color: string;
}

const navItems: NavItem[] = [
  { path: '/', icon: Home, label: 'Home', color: 'text-blue-600' },
  { path: '/crisis', icon: Heart, label: 'Crisis', color: 'text-red-600' },
  { path: '/check-in', icon: Shield, label: 'Check-In', color: 'text-green-600' },
  { path: '/support-network', icon: Users, label: 'Support', color: 'text-purple-600' },
  { path: '/profile', icon: User, label: 'Profile', color: 'text-gray-600' }
];

export const MobileNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom z-50">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map(({ path, icon: Icon, label, color }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'flex flex-col items-center justify-center',
                'w-full h-full py-2 px-1',
                'touch-manipulation transition-all duration-200',
                'hover:bg-gray-50 active:bg-gray-100',
                isActive && 'bg-gray-50'
              )}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon 
                className={cn(
                  'w-6 h-6 mb-1 transition-colors',
                  isActive ? color : 'text-gray-400'
                )}
              />
              <span 
                className={cn(
                  'text-xs font-medium',
                  isActive ? 'text-gray-900' : 'text-gray-500'
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};