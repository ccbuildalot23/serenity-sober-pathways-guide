import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DailyQuoteCard } from '@/components/motivation/DailyQuoteCard';
import { PersonalMotivationLibrary } from '@/components/motivation/PersonalMotivationLibrary';
import { AchievementBadges } from '@/components/motivation/AchievementBadges';
import { ProgressVisualization } from '@/components/motivation/ProgressVisualization';
import { Sparkles, Heart, Trophy, TrendingUp } from 'lucide-react';

const Motivation: React.FC = () => {
  const [activeTab, setActiveTab] = useState('motivation');

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="p-4 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Motivation Center
          </h1>
          <p className="text-muted-foreground">
            Find inspiration, track achievements, and visualize your incredible journey
          </p>
        </div>

        {/* Daily Quote - Always visible */}
        <DailyQuoteCard />

        {/* Tabs for different sections */}
        <Tabs defaultValue="library" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="library" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              My Library
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Achievements
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Progress
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-6">
            <PersonalMotivationLibrary />
          </TabsContent>

          <TabsContent value="achievements" className="mt-6">
            <AchievementBadges />
          </TabsContent>

          <TabsContent value="progress" className="mt-6">
            <ProgressVisualization />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Motivation;