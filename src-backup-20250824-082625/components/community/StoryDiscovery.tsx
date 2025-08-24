import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Search, 
  Filter, 
  Heart, 
  Eye, 
  MessageCircle,
  Bookmark,
  Share2,
  Trophy,
  Clock,
  Users,
  Sparkles,
  ThumbsUp,
  Calendar,
  User
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SuccessStory {
  id: string;
  title: string;
  content: string;
  story_category: string;
  anonymous_name?: string;
  is_anonymous: boolean;
  recovery_duration_days?: number;
  likes_count: number;
  views_count: number;
  is_featured: boolean;
  created_at: string;
  _user_liked?: boolean;
  user_saved?: boolean;
}

interface StoryFilters {
  _search: string;
  _category: string;
  _substance: string;
  _recoveryLength: string;
  _sort: 'recent' | 'popular' | 'helpful';
}

const StoryDiscovery = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [loading, setLoading] = useState(false);
  const [_selectedStory, setSelectedStory] = useState<SuccessStory | null>(null);
  const [filters, setFilters] = useState<StoryFilters>({
    _search: '',
    _category: 'all',
    _substance: 'all',
    _recoveryLength: 'all',
    _sort: 'recent'
  });

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'milestone', label: '🏆 Milestone Achievement' },
    { value: 'breakthrough', label: '💡 Personal Breakthrough' },
    { value: 'daily_victory', label: '🌟 Daily Victory' },
    { value: 'relationship', label: '❤️ Relationship Healing' },
    { value: 'health', label: '💪 Health & Wellness' },
    { value: 'career', label: '🎯 Career & Goals' },
    { value: 'spiritual', label: '🕊️ Spiritual Growth' },
    { value: 'family', label: '👨‍👩‍👧‍👦 Family Reconnection' }
  ];

  const substances = [
    { value: 'all', label: 'All Substances' },
    { value: 'alcohol', label: 'Alcohol' },
    { value: 'cocaine', label: 'Cocaine' },
    { value: 'heroin', label: 'Heroin' },
    { value: 'prescription', label: 'Prescription Drugs' },
    { value: 'marijuana', label: 'Marijuana' },
    { value: 'methamphetamine', label: 'Methamphetamine' },
    { value: 'multiple', label: 'Multiple Substances' },
    { value: 'other', label: 'Other' }
  ];

  const recoveryLengths = [
    { value: 'all', label: 'Any Length' },
    { value: '0-30', label: '0-30 days' },
    { value: '31-90', label: '31-90 days' },
    { value: '91-365', label: '3-12 months' },
    { value: '366-730', label: '1-2 years' },
    { value: '731+', label: '2+ years' }
  ];

  const inspirationalPrompts = [
    "Find stories similar to your journey",
    "Discover breakthrough moments",
    "Read about overcoming specific challenges",
    "Explore different recovery paths"
  ];

  useEffect(() => {
    loadStories();
  }, [filters]);

  const loadStories = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('success_stories')
        .select('*')
        .eq('moderation_status', 'approved')
        .order(getOrderByColumn(), { ascending: false });

      // Apply filters
      if (filters._category !== 'all') {
        query = query.eq('story_category', filters._category);
      }

      if (filters._search) {
        query = query.or(`title.ilike.%${filters._search}%,content.ilike.%${filters._search}%`);
      }

      const { data, _error } = await query.limit(50);

      if (_error) throw _error;

      // Get user interactions for authenticated users
      let _storiesWithInteractions = data || [];
      if (user && data) {
        const _storyIds = data.map(_story => _story.id);
        const { data: interactions } = await supabase
          .from('story_interactions')
          .select('_story_id, _interaction_type')
          .eq('user_id', user.id)
          .in('_story_id', _storyIds);

        _storiesWithInteractions = data.map(_story => ({
          ..._story,
          _user_liked: interactions?.some(i => i._story_id === _story.id && i._interaction_type === 'like') || false,
          user_saved: interactions?.some(i => i._story_id === _story.id && i._interaction_type === 'save') || false
        }));
      }

      setStories(_storiesWithInteractions);
    } catch (_error) {
      console._error('Error loading stories:', _error);
      toast({
        title: "Error",
        _description: "Failed to load stories. Please try again.",
        _variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getOrderByColumn = () => {
    switch (filters._sort) {
      case 'popular':
        return 'likes_count';
      case 'helpful':
        return 'views_count';
      default:
        return 'created_at';
    }
  };

  const handleInteraction = async (storyId: string, type: 'like' | 'save' | 'view' | 'share') => {
    if (!user) {
      toast({
        title: "Please log in",
        _description: "You need to be logged in to interact with stories.",
        _variant: "destructive",
      });
      return;
    }

    try {
      if (type === 'view' || type === 'share') {
        // Always insert for tracking
        await supabase
          .from('story_interactions')
          .insert({
            user_id: user.id,
            _story_id: storyId,
            _interaction_type: type
          });
      } else {
        // Toggle for like/save
        const { data: existing } = await supabase
          .from('story_interactions')
          .select('id')
          .eq('user_id', user.id)
          .eq('_story_id', storyId)
          .eq('_interaction_type', type)
          .single();

        if (existing) {
          await supabase
            .from('story_interactions')
            .delete()
            .eq('id', existing.id);
        } else {
          await supabase
            .from('story_interactions')
            .insert({
              user_id: user.id,
              _story_id: storyId,
              _interaction_type: type
            });
        }
      }

      if (type === 'share') {
        toast({
          title: "Story shared!",
          _description: "The _story link has been copied to your clipboard.",
        });
      }

      // Refresh stories to update counts
      await loadStories();
    } catch (_error) {
      console._error('Error handling interaction:', _error);
    }
  };

  const timeAgo = (_dateString: string) => {
    const date = new Date(_dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const formatRecoveryTime = (days?: number) => {
    if (!days) return null;
    
    if (days < 30) return `${days} days`;
    if (days < 365) return `${Math.floor(days / 30)} months`;
    
    const years = Math.floor(days / 365);
    const remainingMonths = Math.floor((days % 365) / 30);
    if (remainingMonths === 0) return `${years} ${years === 1 ? 'year' : 'years'}`;
    return `${years}y ${remainingMonths}m`;
  };

  const getCategoryIcon = (_category: string) => {
    const categoryData = categories.find(c => c.value === _category);
    return categoryData?.label.split(' ')[0] || '🌟';
  };

  const getSimilarStories = (_story: SuccessStory) => {
    return stories
      .filter(s => s.id !== _story.id && s.story_category === _story.story_category)
      .slice(0, 3);
  };

  return (
    <div className="space-y-6">
      {/* Discovery Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-serenity-navy">
            <Sparkles className="w-5 h-5 text-serenity-gold" />
            Discover Inspiring Stories
          </CardTitle>
          <p className="text-muted-foreground">
            Find hope, _inspiration, and connection through shared recovery experiences
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {inspirationalPrompts.map((prompt, index) => (
              <Button
                key={index}
                _variant="outline"
                className="text-left justify-start h-auto p-3"
                onClick={() => setFilters(prev => ({ ...prev, _search: prompt }))}
              >
                <Search className="w-4 h-4 mr-2 shrink-0" />
                <span className="text-sm">{prompt}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search stories, keywords, experiences..."
                value={filters._search}
                onChange={(e) => setFilters(prev => ({ ...prev, _search: e.target.value }))}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select value={filters._category} onValueChange={(value) => setFilters(prev => ({ ...prev, _category: value }))}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters._substance} onValueChange={(value) => setFilters(prev => ({ ...prev, _substance: value }))}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {substances.map((_substance) => (
                    <SelectItem key={_substance.value} value={_substance.value}>{_substance.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters._sort} onValueChange={(value) => setFilters(prev => ({ ...prev, _sort: value as any }))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recent</SelectItem>
                  <SelectItem value="popular">Popular</SelectItem>
                  <SelectItem value="helpful">Most Viewed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Featured Stories Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-serenity-gold" />
            Featured Stories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stories.filter(_story => _story.is_featured).slice(0, 3).map((_story) => (
              <Card key={_story.id} className="hover:shadow-lg transition-shadow cursor-pointer ring-2 ring-serenity-gold/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge className="bg-serenity-gold text-white">Featured</Badge>
                    <span className="text-xs text-muted-foreground">{timeAgo(_story.created_at)}</span>
                  </div>
                  <h3 className="font-semibold text-serenity-navy mb-2 line-clamp-2">{_story.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{_story.content}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Eye className="w-3 h-3" />
                      <span>{_story.views_count}</span>
                      <Heart className="w-3 h-3" />
                      <span>{_story.likes_count}</span>
                    </div>
                    <Button
                      size="sm"
                      _variant="ghost"
                      onClick={() => setSelectedStory(_story)}
                    >
                      Read More
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Stories Feed */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Stories</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="trending">Trending</TabsTrigger>
          <TabsTrigger value="saved">My Saved</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-serenity-teal mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading stories...</p>
            </div>
          ) : stories.length === 0 ? (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No stories found matching your criteria.</p>
              <Button onClick={() => setFilters({ _search: '', _category: 'all', _substance: 'all', _recoveryLength: 'all', _sort: 'recent' })}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {stories.map((_story) => (
                <Card key={_story.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getCategoryIcon(_story.story_category)}</span>
                        <Badge _variant="outline" className="text-xs">
                          {categories.find(c => c.value === _story.story_category)?.label?.split(' ').slice(1).join(' ')}
                        </Badge>
                        {_story.is_featured && (
                          <Badge className="bg-serenity-gold text-white">
                            <Trophy className="w-3 h-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{timeAgo(_story.created_at)}</span>
                    </div>
                    
                    <CardTitle className="text-lg text-serenity-navy line-clamp-2">{_story.title}</CardTitle>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {_story.is_anonymous ? (_story.anonymous_name || 'Anonymous') : 'Verified Member'}
                      </span>
                      {_story.recovery_duration_days && (
                        <Badge _variant="secondary" className="text-xs">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatRecoveryTime(_story.recovery_duration_days)} sober
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-sm text-gray-700 mb-4 line-clamp-4">{_story.content}</p>
                    
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-4">
                        <Button
                          _variant="ghost"
                          size="sm"
                          onClick={() => handleInteraction(_story.id, 'like')}
                          className={`flex items-center gap-1 ${_story._user_liked ? 'text-red-500' : 'text-muted-foreground'}`}
                        >
                          <Heart className={`w-4 h-4 ${_story._user_liked ? 'fill-current' : ''}`} />
                          <span>{_story.likes_count}</span>
                        </Button>

                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Eye className="w-4 h-4" />
                          <span>{_story.views_count}</span>
                        </div>

                        <Button
                          _variant="ghost"
                          size="sm"
                          onClick={() => handleInteraction(_story.id, 'save')}
                          className={`flex items-center gap-1 ${_story.user_saved ? 'text-serenity-teal' : 'text-muted-foreground'}`}
                        >
                          <Bookmark className={`w-4 h-4 ${_story.user_saved ? 'fill-current' : ''}`} />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          _variant="ghost"
                          size="sm"
                          onClick={() => handleInteraction(_story.id, 'share')}
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          _variant="ghost"
                          size="sm"
                          onClick={() => {
                            handleInteraction(_story.id, 'view');
                            setSelectedStory(_story);
                          }}
                          className="text-serenity-teal"
                        >
                          Read Full Story
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="recent">
          <p className="text-muted-foreground text-center py-8">Recent stories functionality coming soon!</p>
        </TabsContent>

        <TabsContent value="trending">
          <p className="text-muted-foreground text-center py-8">Trending stories functionality coming soon!</p>
        </TabsContent>

        <TabsContent value="saved">
          <p className="text-muted-foreground text-center py-8">Saved stories functionality coming soon!</p>
        </TabsContent>
      </Tabs>

      {/* Story Detail Modal */}
      <Dialog open={!!_selectedStory} onOpenChange={() => setSelectedStory(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {_selectedStory && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl text-serenity-navy">
                  {_selectedStory.title}
                </DialogTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge _variant="outline">
                    {getCategoryIcon(_selectedStory.story_category)} {categories.find(c => c.value === _selectedStory.story_category)?.label?.split(' ').slice(1).join(' ')}
                  </Badge>
                  {_selectedStory.is_featured && (
                    <Badge className="bg-serenity-gold text-white">
                      <Trophy className="w-3 h-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                  {_selectedStory.recovery_duration_days && (
                    <Badge _variant="secondary">
                      {formatRecoveryTime(_selectedStory.recovery_duration_days)} sober
                    </Badge>
                  )}
                </div>
              </DialogHeader>

              <div className="space-y-6">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    By {_selectedStory.is_anonymous ? (_selectedStory.anonymous_name || 'Anonymous') : 'Verified Member'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {timeAgo(_selectedStory.created_at)}
                  </span>
                </div>

                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap">{_selectedStory.content}</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-4">
                    <Button
                      _variant="ghost"
                      onClick={() => handleInteraction(_selectedStory.id, 'like')}
                      className={`flex items-center gap-2 ${_selectedStory._user_liked ? 'text-red-500' : 'text-muted-foreground'}`}
                    >
                      <Heart className={`w-5 h-5 ${_selectedStory._user_liked ? 'fill-current' : ''}`} />
                      <span>{_selectedStory.likes_count} likes</span>
                    </Button>

                    <Button
                      _variant="ghost"
                      onClick={() => handleInteraction(_selectedStory.id, 'save')}
                      className={`flex items-center gap-2 ${_selectedStory.user_saved ? 'text-serenity-teal' : 'text-muted-foreground'}`}
                    >
                      <Bookmark className={`w-5 h-5 ${_selectedStory.user_saved ? 'fill-current' : ''}`} />
                      Save Story
                    </Button>

                    <Button
                      _variant="ghost"
                      onClick={() => handleInteraction(_selectedStory.id, 'share')}
                      className="flex items-center gap-2"
                    >
                      <Share2 className="w-5 h-5" />
                      Share
                    </Button>
                  </div>

                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Eye className="w-4 h-4" />
                    <span>{_selectedStory.views_count} views</span>
                  </div>
                </div>

                {/* Similar Stories */}
                {getSimilarStories(_selectedStory).length > 0 && (
                  <div className="pt-6 border-t">
                    <h4 className="font-semibold text-serenity-navy mb-4">Similar Stories</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {getSimilarStories(_selectedStory).map((similarStory) => (
                        <Card key={similarStory.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedStory(similarStory)}>
                          <CardContent className="p-4">
                            <h5 className="font-medium text-sm line-clamp-2 mb-2">{similarStory.title}</h5>
                            <p className="text-xs text-muted-foreground line-clamp-2">{similarStory.content}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StoryDiscovery;