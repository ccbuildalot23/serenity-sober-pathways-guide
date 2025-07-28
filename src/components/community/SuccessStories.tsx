import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Trophy, 
  Plus, 
  Heart, 
  Eye, 
  Calendar,
  Star,
  Share2,
  Filter,
  Search,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SuccessStory {
  id: string;
  title: string;
  content: string;
  anonymous_name?: string;
  is_anonymous: boolean;
  recovery_duration_days?: number;
  story_category: string;
  is_featured: boolean;
  likes_count: number;
  views_count: number;
  created_at: string;
  user_liked?: boolean;
}

const SuccessStories = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('browse');
  
  // New story form
  const [showNewStory, setShowNewStory] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState('');
  const [newStoryContent, setNewStoryContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [anonymousName, setAnonymousName] = useState('');
  const [storyCategory, setStoryCategory] = useState('milestone');
  const [recoveryDays, setRecoveryDays] = useState('');

  const categories = [
    { value: 'milestone', label: 'Milestone Achievement', icon: '🏆' },
    { value: 'breakthrough', label: 'Personal Breakthrough', icon: '💡' },
    { value: 'daily_victory', label: 'Daily Victory', icon: '🌟' },
    { value: 'relationship', label: 'Relationship Healing', icon: '❤️' },
    { value: 'health', label: 'Health & Wellness', icon: '💪' },
    { value: 'career', label: 'Career & Goals', icon: '🎯' },
    { value: 'spiritual', label: 'Spiritual Growth', icon: '🕊️' },
    { value: 'family', label: 'Family Reconnection', icon: '👨‍👩‍👧‍👦' }
  ];

  useEffect(() => {
    loadStories();
  }, [categoryFilter]);

  const loadStories = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('success_stories')
        .select('*')
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false });

      if (categoryFilter !== 'all') {
        query = query.eq('story_category', categoryFilter);
      }

      const { data, error } = await query.limit(20);

      if (error) throw error;
      setStories(data || []);
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAnonymousName = () => {
    const prefixes = ['Hopeful', 'Brave', 'Strong', 'Peaceful', 'Determined', 'Resilient', 'Inspired', 'Grateful'];
    const suffixes = ['Survivor', 'Warrior', 'Journey', 'Phoenix', 'Spirit', 'Soul', 'Heart', 'Voice'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const number = Math.floor(Math.random() * 99) + 1;
    return `${prefix}${suffix}${number}`;
  };

  const handleNewStory = async () => {
    if (!user || !newStoryTitle.trim() || !newStoryContent.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in the title and story content.",
        variant: "destructive",
      });
      return;
    }

    try {
      const finalAnonymousName = isAnonymous ? (anonymousName.trim() || generateAnonymousName()) : null;
      const recoveryDuration = recoveryDays ? parseInt(recoveryDays) : null;
      
      const { error } = await supabase
        .from('success_stories')
        .insert([{
          user_id: user.id,
          title: newStoryTitle,
          content: newStoryContent,
          anonymous_name: finalAnonymousName,
          is_anonymous: isAnonymous,
          recovery_duration_days: recoveryDuration,
          story_category: storyCategory,
          moderation_status: 'pending'
        }]);

      if (error) throw error;

      toast({
        title: "Story Submitted! ✨",
        description: "Your success story is being reviewed and will be published shortly.",
      });

      setShowNewStory(false);
      resetForm();
      loadStories();
    } catch (error) {
      console.error('Error creating story:', error);
      toast({
        title: "Error",
        description: "Failed to submit story. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setNewStoryTitle('');
    setNewStoryContent('');
    setIsAnonymous(true);
    setAnonymousName('');
    setStoryCategory('milestone');
    setRecoveryDays('');
  };

  const handleLikeStory = async (storyId: string) => {
    if (!user) return;

    try {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from('story_interactions')
        .select('id')
        .eq('story_id', storyId)
        .eq('user_id', user.id)
        .eq('interaction_type', 'like')
        .single();

      if (existingLike) {
        // Unlike
        await supabase
          .from('story_interactions')
          .delete()
          .eq('story_id', storyId)
          .eq('user_id', user.id)
          .eq('interaction_type', 'like');
      } else {
        // Like
        await supabase
          .from('story_interactions')
          .insert([{
            story_id: storyId,
            user_id: user.id,
            interaction_type: 'like'
          }]);
      }

      loadStories();
    } catch (error) {
      console.error('Error liking story:', error);
    }
  };

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
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

  const getCategoryIcon = (category: string) => {
    const categoryData = categories.find(c => c.value === category);
    return categoryData?.icon || '🌟';
  };

  const filteredStories = stories.filter(story =>
    searchQuery === '' ||
    story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    story.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="browse">Browse Stories</TabsTrigger>
        <TabsTrigger value="share">Share Your Story</TabsTrigger>
      </TabsList>

      <TabsContent value="browse" className="space-y-6">
        {/* Filters and Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search success stories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.icon} {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stories Grid */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-serenity-teal mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading stories...</p>
          </div>
        ) : filteredStories.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No success stories found.</p>
            <Button onClick={() => setActiveTab('share')} className="bg-serenity-teal hover:bg-serenity-teal/90 text-white">
              Share Your Story
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredStories.map((story) => (
              <Card key={story.id} className={`transition-all hover:shadow-lg ${story.is_featured ? 'ring-2 ring-serenity-gold' : ''}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getCategoryIcon(story.story_category)}</span>
                      <Badge variant="outline" className="text-xs">
                        {categories.find(c => c.value === story.story_category)?.label}
                      </Badge>
                      {story.is_featured && (
                        <Badge className="bg-serenity-gold text-white">
                          <Star className="w-3 h-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-right text-xs text-muted-foreground">
                      {timeAgo(story.created_at)}
                    </div>
                  </div>
                  
                  <CardTitle className="text-lg text-serenity-navy">{story.title}</CardTitle>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      By {story.is_anonymous ? (story.anonymous_name || 'Anonymous') : 'Verified Member'}
                    </span>
                    {story.recovery_duration_days && (
                      <Badge variant="secondary" className="text-xs">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatRecoveryTime(story.recovery_duration_days)} sober
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <p className="text-sm text-gray-700 mb-4 line-clamp-4">{story.content}</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{story.views_count}</span>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLikeStory(story.id)}
                        className={`flex items-center gap-1 ${story.user_liked ? 'text-red-500' : 'text-muted-foreground'}`}
                      >
                        <Heart className={`w-4 h-4 ${story.user_liked ? 'fill-current' : ''}`} />
                        <span>{story.likes_count}</span>
                      </Button>
                    </div>
                    
                    <Button variant="ghost" size="sm" className="text-serenity-teal">
                      <BookOpen className="w-4 h-4 mr-1" />
                      Read More
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="share" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-serenity-navy">
              <Sparkles className="w-5 h-5 text-serenity-gold" />
              Share Your Success Story
            </CardTitle>
            <p className="text-muted-foreground">
              Inspire others by sharing your journey. Your story can provide hope and encouragement to someone who needs it.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="story-title">Story Title</Label>
                <Input
                  id="story-title"
                  placeholder="Give your story a meaningful title"
                  value={newStoryTitle}
                  onChange={(e) => setNewStoryTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="story-category">Category</Label>
                <Select value={storyCategory} onValueChange={setStoryCategory}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.icon} {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="recovery-days">Days in Recovery (Optional)</Label>
                <Input
                  id="recovery-days"
                  type="number"
                  placeholder="e.g., 365"
                  value={recoveryDays}
                  onChange={(e) => setRecoveryDays(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div className="flex items-center space-x-2 mt-6">
                <Switch
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={setIsAnonymous}
                />
                <Label htmlFor="anonymous">Share anonymously</Label>
              </div>
            </div>
            
            {isAnonymous && (
              <div>
                <Label htmlFor="anonymous-name">Anonymous Name (Optional)</Label>
                <Input
                  id="anonymous-name"
                  placeholder="Leave blank for auto-generated name"
                  value={anonymousName}
                  onChange={(e) => setAnonymousName(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Example: {generateAnonymousName()}
                </p>
              </div>
            )}
            
            <div>
              <Label htmlFor="story-content">Your Story</Label>
              <Textarea
                id="story-content"
                placeholder="Share your journey, what you've overcome, and what you've learned. Be honest, inspiring, and authentic..."
                value={newStoryContent}
                onChange={(e) => setNewStoryContent(e.target.value)}
                className="mt-1 min-h-48"
              />
            </div>
            
            <div className="bg-serenity-mint/10 p-4 rounded-lg">
              <h4 className="font-semibold text-serenity-navy mb-2">Story Guidelines</h4>
              <ul className="text-sm text-serenity-sage space-y-1">
                <li>• Be honest and authentic about your experience</li>
                <li>• Focus on hope, recovery, and positive outcomes</li>
                <li>• Avoid specific details about substance use methods</li>
                <li>• Don't include personal contact information</li>
                <li>• Respect others and their journeys</li>
              </ul>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm}>
                Clear Form
              </Button>
              <Button onClick={handleNewStory} className="bg-serenity-teal hover:bg-serenity-teal/90 text-white">
                <Sparkles className="w-4 h-4 mr-2" />
                Share Story
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default SuccessStories;