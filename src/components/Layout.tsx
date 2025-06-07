
import React from 'react';
import { Bell, Heart, User, Calendar, BookOpen } from 'lucide-react';
import FloatingHelpButton from './FloatingHelpButton';

interface LayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const Layout = ({ children, activeTab = 'dashboard', onTabChange }: LayoutProps) => {
  const tabs = [
    { id: 'dashboard', icon: Heart, label: 'Dashboard' },
    { id: 'checkin', icon: Calendar, label: 'Check-in' },
    { id: 'support', icon: User, label: 'Support' },
    { id: 'resources', icon: BookOpen, label: 'Learn' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold serenity-navy">Serenity</h1>
          <Bell className="w-6 h-6 text-gray-600" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20">
        <div className="max-w-md mx-auto">
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-md mx-auto px-2 py-2">
          <div className="flex justify-around">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Floating Help Button - Always Visible */}
      <FloatingHelpButton />
    </div>
  );
};

export default Layout;
