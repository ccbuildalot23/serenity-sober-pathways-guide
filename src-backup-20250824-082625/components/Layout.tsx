import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, Users, BookOpen, User, Heart, Target, MessageCircle } from 'lucide-react';
import { Header } from '@/components/navigation/Header';
import { useAuth } from '@/contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onProfileClick?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab: _activeTab, onTabChange, onProfileClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/' },
    { id: 'checkin', label: 'Check-in', icon: Heart, path: '/checkin' },
    { id: 'community', label: 'Community', icon: MessageCircle, path: '/community' },
    { id: 'planning', label: 'Planning', icon: Target, path: '/planning' },
    { id: 'support', label: 'Support', icon: Users, path: '/peer-support' },
    { id: 'motivation', label: 'Motivation', icon: BookOpen, path: '/motivation' },
  ];

  const handleNavClick = (tab: { id: string; path: string }) => {
    onTabChange(tab.id);
    navigate(tab.path);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Use responsive Header component */}
      <Header />

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
                <button
                  key={tab.id}
                  onClick={() => handleNavClick(tab)}
                  className={`flex flex-col items-center py-3 px-2 min-h-[56px] text-xs font-medium transition-colors ${
                    isActive 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  aria-label={tab.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={`h-6 w-6 mb-1 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
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
