import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  Trophy, 
  Users, 
  Heart,
  Plus,
  Search,
  Filter,
  Shield,
  MapPin
} from 'lucide-react';
import AnonymousForums from './AnonymousForums';
import SuccessStories from './SuccessStories';
import SponsorMatching from './SponsorMatching';
import { CommunityChallenge } from './CommunityChallenge';
import { useAuth } from '@/contexts/AuthContext';

const CommunitySupport = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('forums');

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-serenity-mint/20 to-serenity-sage/20 border-serenity-sage/30">
        <CardContent className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-serenity-navy mb-2">Community Support</h2>
            <p className="text-serenity-sage mb-4">
              Connect anonymously with others on similar journeys in a safe, moderated space
            </p>
            
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              <div className="text-center">
                <MessageSquare className="w-6 h-6 mx-auto text-serenity-teal mb-1" />
                <div className="text-lg font-bold text-serenity-navy">24/7</div>
                <div className="text-xs text-muted-foreground">Anonymous Forums</div>
              </div>
              
              <div className="text-center">
                <Trophy className="w-6 h-6 mx-auto text-serenity-gold mb-1" />
                <div className="text-lg font-bold text-serenity-navy">Stories</div>
                <div className="text-xs text-muted-foreground">Success & Hope</div>
              </div>
              
              <div className="text-center">
                <Heart className="w-6 h-6 mx-auto text-serenity-coral mb-1" />
                <div className="text-lg font-bold text-serenity-navy">Sponsors</div>
                <div className="text-xs text-muted-foreground">Mentor Matching</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Card className="border-serenity-mint/30 bg-serenity-mint/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-serenity-teal flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-serenity-navy mb-1">Privacy & Safety First</h4>
              <p className="text-sm text-serenity-sage">
                All interactions are anonymous and AI-moderated for safety. Your identity is protected, 
                and you control what you share. Community guidelines ensure a supportive environment for everyone.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="forums" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Forums
          </TabsTrigger>
          <TabsTrigger value="stories" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Stories
          </TabsTrigger>
          <TabsTrigger value="challenges" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Challenges
          </TabsTrigger>
          <TabsTrigger value="sponsors" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Sponsors
          </TabsTrigger>
        </TabsList>

        <TabsContent value="forums">
          <AnonymousForums />
        </TabsContent>

        <TabsContent value="stories">
          <SuccessStories />
        </TabsContent>

        <TabsContent value="challenges">
          <CommunityChallenge />
        </TabsContent>

        <TabsContent value="sponsors">
          <SponsorMatching />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommunitySupport;