// Quick Actions - One tap to what you need most
// Big buttons for shaking hands, clear purpose

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Heart, MessageSquare, Sparkles, Phone } from 'lucide-react';

export const QuickActions: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Primary Actions - What they need most */}
      <div className="grid grid-cols-1 gap-3">
        <Button 
          variant="default" 
          className="h-20 bg-red-600 hover:bg-red-700 text-white text-lg font-bold shadow-lg transform hover:scale-105 transition-all"
          asChild
        >
          <Link 
            to="/crisis-intervention"
            aria-label="Get immediate help and support"
          >
            <Heart className="mr-3 h-6 w-6" />
            I Need Help Now
          </Link>
        </Button>
        
        <Button 
          variant="default" 
          className="h-16 bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-md"
          asChild
        >
          <Link 
            to="/checkin"
            aria-label="Quick mood check-in"
          >
            <Sparkles className="mr-3 h-5 w-5" />
            How Am I Today?
          </Link>
        </Button>
      </div>

      {/* Secondary Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          className="h-14 border-gray-700 text-gray-300 hover:bg-gray-800"
          asChild
        >
          <Link 
            to="/support"
            aria-label="Connect with peers who understand"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Peer Chat
          </Link>
        </Button>
        
        <Button 
          variant="outline" 
          className="h-14 border-gray-700 text-gray-300 hover:bg-gray-800"
          asChild
        >
          <Link 
            to="/contact"
            aria-label="Emergency contacts and support lines"
          >
            <Phone className="mr-2 h-4 w-4" />
            Get Support
          </Link>
        </Button>
      </div>
    </div>
  );
};