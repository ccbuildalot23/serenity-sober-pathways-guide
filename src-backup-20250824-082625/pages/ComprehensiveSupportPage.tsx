import React from 'react';
import { ComprehensiveSupportDashboard } from '@/components/support/ComprehensiveSupportDashboard';
import { SupportSystemSettings } from '@/components/support/SupportSystemSettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Settings, BarChart3, Users } from 'lucide-react';

export const ComprehensiveSupportPage: React.FC = () => {
  return (
    <div className="min-h-screen">
      <Tabs defaultValue="dashboard" className="w-full">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-6xl mx-auto">
            <TabsList className="grid w-full grid-cols-4 max-w-md mx-auto">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Support
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Stats
              </TabsTrigger>
              <TabsTrigger value="community" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Community
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="dashboard" className="mt-0">
          <ComprehensiveSupportDashboard />
        </TabsContent>

        <TabsContent value="settings" className="mt-0">
          <SupportSystemSettings />
        </TabsContent>

        <TabsContent value="stats" className="mt-0">
          <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Your Recovery Stats</h1>
                <p className="text-muted-foreground">
                  Track your journey and celebrate your progress
                </p>
              </div>
              {/* Stats dashboard would go here */}
              <div className="text-center p-12 text-muted-foreground">
                Personal recovery statistics and progress tracking coming soon...
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="community" className="mt-0">
          <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Community Support</h1>
                <p className="text-muted-foreground">
                  Anonymous community insights and mutual aid
                </p>
              </div>
              {/* Community features would go here */}
              <div className="text-center p-12 text-muted-foreground">
                Community features and mutual aid network coming soon...
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};