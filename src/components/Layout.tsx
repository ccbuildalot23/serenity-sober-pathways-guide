
import React from 'react';
import { Home, Calendar, Users, BookOpen, User, Settings } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onProfileClick?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, onProfileClick }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, path: '/calendar' },
    { id: 'checkin', label: 'Check-in', icon: Calendar, path: '/checkin' },
    { id: 'support', label: 'Support', icon: Users, path: '/support' },
    { id: 'resources', label: 'Resources', icon: BookOpen, path: '/resources' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  ];

  const handleTabClick = (tab: any) => {
    if (tab.path && tab.path !== window.location.pathname) {
      window.location.href = tab.path;
    } else {
      onTabChange(tab.id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-blue-900">Serenity</h1>
          {onProfileClick && (
            <button
              onClick={onProfileClick}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <User className="h-6 w-6 text-gray-600" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-around">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id || window.location.pathname === tab.path;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  className={`flex flex-col items-center py-3 px-2 text-xs font-medium transition-colors ${
                    isActive 
                      ? 'text-indigo-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className={`h-6 w-6 mb-1 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Layout;
