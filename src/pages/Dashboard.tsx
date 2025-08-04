// MVP Dashboard - You're Not Alone

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Phone, Heart, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const { stats, profile, loading } = useDashboardData();
  const navigate = useNavigate();

  // Debug logging
  console.log('Dashboard - Current user:', { 
    id: user?.id, 
    email: user?.email,
    metadata: user?.user_metadata 
  });
  console.log('Dashboard - Data:', { stats, profile, loading });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 animate-spin mx-auto border-2 border-blue-400 border-t-transparent rounded-full" />
          <p className="text-gray-400">Loading your safe space...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-gray-900 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-4 py-12 text-center">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              You're Not Alone
            </h1>
            <p className="text-xl text-gray-300">
              Welcome back, warrior. Today is all that matters.
            </p>
            {stats.streak > 0 && (
              <div className="mt-6 inline-flex items-center gap-2 bg-green-900/30 text-green-400 px-6 py-3 rounded-full">
                <Sparkles className="w-5 h-5" />
                <span className="font-semibold">{stats.streak} days of courage</span>
              </div>
            )}
          {/* Three Big Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto px-4">
            {/* I NEED HELP NOW Button */}
            <Button
              onClick={() => navigate('/crisis-intervention')}
              className="h-32 md:h-40 bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <div className="flex flex-col items-center gap-3">
                <Phone className="w-12 h-12" />
                <span className="text-2xl font-bold">I NEED HELP NOW</span>
                <span className="text-sm opacity-90">Crisis support available 24/7</span>
              </div>
            </Button>

            {/* Just Checking In Button */}
            <Button
              onClick={() => navigate('/checkin')}
              className="h-32 md:h-40 bg-green-600 hover:bg-green-700 text-white rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <div className="flex flex-col items-center gap-3">
                <Heart className="w-12 h-12" />
                <span className="text-2xl font-bold">Just Checking In</span>
                <span className="text-sm opacity-90">How are you today?</span>
              </div>
            </Button>

            {/* Talk to Someone Button */}
            <Button
              onClick={() => navigate('/support')}
              className="h-32 md:h-40 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <div className="flex flex-col items-center gap-3">
                <Users className="w-12 h-12" />
                <span className="text-2xl font-bold">Talk to Someone</span>
                <span className="text-sm opacity-90">Connect with peers who understand</span>
              </div>
            </Button>
          </div>

          {/* Recovery Wisdom */}
          <div className="mt-16 max-w-2xl mx-auto px-4 text-center">
            <div className="bg-gray-800/50 backdrop-blur p-8 rounded-2xl border border-gray-700">
              <p className="text-lg text-gray-300 italic mb-4">
                "Just for today, I will have faith in someone who believes in me and wants to help me in my recovery."
              </p>
              <p className="text-sm text-gray-500">- Just for Today</p>
            </div>
          </div>

          {/* Quick Resources */}
          <div className="mt-12 max-w-4xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/crisis-toolkit')}
                className="h-20 bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300"
              >
                <div className="text-center">
                  <div className="text-lg">🧘</div>
                  <span className="text-sm">Grounding</span>
                </div>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => navigate('/contact')}
                className="h-20 bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300"
              >
                <div className="text-center">
                  <div className="text-lg">📞</div>
                  <span className="text-sm">Help Lines</span>
                </div>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => window.location.href = 'tel:988'}
                className="h-20 bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300"
              >
                <div className="text-center">
                  <div className="text-lg">🆘</div>
                  <span className="text-sm">Call 988</span>
                </div>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => window.open('sms:741741?body=HOME', '_self')}
                className="h-20 bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300"
              >
                <div className="text-center">
                  <div className="text-lg">💬</div>
                  <span className="text-sm">Text HOME</span>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Message */}
      <div className="mt-auto py-8 text-center text-gray-500">
        <p className="text-sm">You matter. Recovery is possible. We're here for you 24/7.</p>
      </div>
    </div>
  );
};

export default Dashboard;