import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Trophy, 
  Sparkles,
  TrendingUp,
  Users,
  Heart,
  BookOpen,
  Award
} from 'lucide-react';
import StorySubmissionFlow from './StorySubmissionFlow';
import StoryDiscovery from './StoryDiscovery';
import StoryEngagement from './StoryEngagement';

const EnhancedSuccessStories = () => {
  const [activeTab, setActiveTab] = useState('discover');
  const [showSubmissionFlow, setShowSubmissionFlow] = useState(false);

  const communityStats = {
    totalStories: 1247,
    thisMonth: 89,
    featuredStories: 24,
    activeReaders: 3456
  };

  const featuredAwards = [
    { type: 'most_helpful', story: 'Finding Light in the Darkness', author: 'HopefulWarrior42' },
    { type: 'inspiring', story: 'From Rock Bottom to Mountain Top', author: 'BraveJourney88' },
    { type: 'courage', story: 'Speaking My Truth', author: 'AnonymousVoice' }
  ];

  if (showSubmissionFlow) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-serenity-navy">Share Your Success Story</h2>
          <Button 
            variant="outline" 
            onClick={() => setShowSubmissionFlow(false)}
          >
            Back to Stories
          </Button>
        </div>
        <StorySubmissionFlow />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Community Stats */}
      <Card className="bg-gradient-to-r from-serenity-navy/5 to-serenity-teal/5">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h1 className="text-2xl font-bold text-serenity-navy mb-2">Success Stories</h1>
              <p className="text-muted-foreground">
                Real stories of hope, resilience, and recovery from our community
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-lg font-bold text-serenity-navy">{communityStats.totalStories}</div>
                <div className="text-xs text-muted-foreground">Total Stories</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-lg font-bold text-serenity-teal">{communityStats.thisMonth}</div>
                <div className="text-xs text-muted-foreground">This Month</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-lg font-bold text-serenity-gold">{communityStats.featuredStories}</div>
                <div className="text-xs text-muted-foreground">Featured</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-lg font-bold text-serenity-sage">{communityStats.activeReaders}</div>
                <div className="text-xs text-muted-foreground">Active Readers</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <TabsList className="grid w-full lg:w-auto grid-cols-4">
            <TabsTrigger value="discover" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Discover
            </TabsTrigger>
            <TabsTrigger value="featured" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Featured
            </TabsTrigger>
            <TabsTrigger value="awards" className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              Awards
            </TabsTrigger>
            <TabsTrigger value="community" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Community
            </TabsTrigger>
          </TabsList>

          <Button 
            onClick={() => setShowSubmissionFlow(true)}
            className="bg-serenity-navy hover:bg-serenity-navy/90 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Share Your Story
          </Button>
        </div>

        {/* Tab Contents */}
        <TabsContent value="discover" className="space-y-6">
          <StoryDiscovery />
        </TabsContent>

        <TabsContent value="featured" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-serenity-gold" />
                Featured Success Stories
              </CardTitle>
              <p className="text-muted-foreground">
                Stories selected by our community for their exceptional impact and inspiration
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="hover:shadow-lg transition-shadow ring-2 ring-serenity-gold/20">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Badge className="bg-serenity-gold text-white">Featured</Badge>
                        <span className="text-xs text-muted-foreground">2 days ago</span>
                      </div>
                      <CardTitle className="text-lg">Sample Featured Story {i}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        By BraveWarrior{i} • 365 days sober
                      </p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700 mb-4">
                        This is a sample excerpt from a featured success story that would 
                        showcase the user's journey and inspire others...
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Heart className="w-4 h-4" />
                            {15 + i * 3}
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-4 h-4" />
                            {150 + i * 20}
                          </span>
                        </div>
                        <Button size="sm" variant="outline">Read Story</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="awards" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-serenity-gold" />
                Story Awards & Recognition
              </CardTitle>
              <p className="text-muted-foreground">
                Celebrating the most impactful stories in our community
              </p>
            </CardHeader>
            <CardContent>
              {/* Monthly Awards */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-serenity-navy mb-4">January 2024 Awards</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {featuredAwards.map((award, index) => (
                      <Card key={index} className="bg-gradient-to-br from-serenity-gold/10 to-serenity-teal/10">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-serenity-gold/20 flex items-center justify-center">
                              <Trophy className="w-5 h-5 text-serenity-gold" />
                            </div>
                            <div>
                              <h4 className="font-semibold capitalize">
                                {award.type.replace('_', ' ')} Story
                              </h4>
                              <p className="text-xs text-muted-foreground">January Winner</p>
                            </div>
                          </div>
                          <h5 className="font-medium text-sm mb-1">{award.story}</h5>
                          <p className="text-xs text-muted-foreground">By {award.author}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Award Categories */}
                <div>
                  <h3 className="text-lg font-semibold text-serenity-navy mb-4">Award Categories</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { name: 'Most Helpful', description: 'Stories that provide practical guidance and support', icon: '🤝' },
                      { name: 'Most Inspiring', description: 'Stories that motivate and uplift the community', icon: '⭐' },
                      { name: 'Courage Award', description: 'Stories showing exceptional bravery in sharing', icon: '🦁' },
                      { name: 'Hope Bringer', description: 'Stories that bring hope to those struggling', icon: '🌅' },
                      { name: 'Community Choice', description: 'Selected by community votes and engagement', icon: '👥' },
                      { name: 'Breakthrough Moment', description: 'Stories highlighting pivotal recovery moments', icon: '💡' }
                    ].map((category, index) => (
                      <Card key={index} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="text-2xl mb-2">{category.icon}</div>
                          <h4 className="font-semibold text-serenity-navy mb-1">{category.name}</h4>
                          <p className="text-sm text-muted-foreground">{category.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="community" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Community Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-serenity-teal" />
                  Community Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-serenity-teal/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-serenity-teal">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Be Authentic & Honest</h4>
                      <p className="text-xs text-muted-foreground">Share genuine experiences and truthful accounts of your journey</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-serenity-teal/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-serenity-teal">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Focus on Hope & Recovery</h4>
                      <p className="text-xs text-muted-foreground">Emphasize positive outcomes, growth, and lessons learned</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-serenity-teal/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-serenity-teal">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Respect Privacy</h4>
                      <p className="text-xs text-muted-foreground">Use privacy controls and respect others' anonymity choices</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-serenity-teal/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-serenity-teal">4</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Support Others</h4>
                      <p className="text-xs text-muted-foreground">Engage thoughtfully and provide encouragement to fellow community members</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-serenity-sage" />
                  Community Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Stories Shared This Month</span>
                    <Badge variant="secondary">{communityStats.thisMonth}</Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Community Engagement</span>
                    <Badge variant="secondary">2.3k interactions</Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Lives Touched</span>
                    <Badge className="bg-serenity-gold text-white">5.7k</Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Story Rating</span>
                    <Badge className="bg-serenity-teal text-white">4.8/5</Badge>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-serenity-mint/10 rounded-lg">
                  <h4 className="font-semibold text-serenity-navy mb-2">This Month's Highlights</h4>
                  <ul className="text-sm text-serenity-sage space-y-1">
                    <li>• 15 first-time story authors</li>
                    <li>• 89% positive community feedback</li>
                    <li>• 3 stories reached 100+ "helped me" votes</li>
                    <li>• 24 hours average review time</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedSuccessStories;