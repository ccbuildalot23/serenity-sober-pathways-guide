
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Users, BookOpen, User, Settings, Heart } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onProfileClick?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, onProfileClick }) => {
  const location = useLocation();
  
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, path: '/calendar' },
    { id: 'checkin', label: 'Check-in', icon: Heart, path: '/checkin' },
    { id: 'support', label: 'Support', icon: Users, path: '/support' },
    { id: 'resources', label: 'Resources', icon: BookOpen, path: '/resources' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-blue-700 dark:text-blue-400">Serenity</h1>
          {onProfileClick && (
            <button
              onClick={onProfileClick}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <User className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 shadow-lg">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-around">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = location.pathname === tab.path;
              
              return (
                <Link
                  key={tab.id}
                  to={tab.path}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex flex-col items-center py-3 px-2 text-xs font-medium transition-colors ${
                    isActive 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className={`h-6 w-6 mb-1 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Layout;
