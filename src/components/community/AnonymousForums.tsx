import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Clock, 
  MessageCircle,
  Flag,
  ChevronRight,
  Users,
  Heart
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Forum {
  id: string;
  category: string;
  title: string;
  description: string;
  is_active: boolean;
}

interface ForumPost {
  id: string;
  forum_id: string;
  anonymous_name: string;
  title: string;
  content: string;
  reply_count: number;
  last_activity: string;
  created_at: string;
  moderation_status: string;
}

const AnonymousForums = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [forums, setForums] = useState<Forum[]>([]);
  const [selectedForum, setSelectedForum] = useState<Forum | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  
  // New post form
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [anonymousName, setAnonymousName] = useState('');

  useEffect(() => {
    loadForums();
  }, []);

  useEffect(() => {
    if (selectedForum) {
      loadPosts(selectedForum.id);
    }
  }, [selectedForum]);

  const loadForums = async () => {
    try {
      const { data, error } = await supabase
        .from('community_forums')
        .select('*')
        .eq('is_active', true)
        .order('category');

      if (error) throw error;
      setForums(data || []);
      
      // Select first forum by default
      if (data && data.length > 0) {
        setSelectedForum(data[0]);
      }
    } catch (error) {
      console.error('Error loading forums:', error);
    }
  };

  const loadPosts = async (forumId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('forum_posts')
        .select('*')
        .eq('forum_id', forumId)
        .eq('moderation_status', 'approved')
        .order('last_activity', { ascending: false })
        .limit(20);

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAnonymousName = () => {
    const adjectives = ['Hopeful', 'Strong', 'Brave', 'Peaceful', 'Determined', 'Resilient', 'Caring', 'Wise'];
    const nouns = ['Warrior', 'Journey', 'Soul', 'Spirit', 'Heart', 'Path', 'Light', 'Voice'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 99) + 1;
    return `${adj}${noun}${number}`;
  };

  const handleNewPost = async () => {
    if (!user || !selectedForum || !newPostTitle.trim() || !newPostContent.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const finalAnonymousName = anonymousName.trim() || generateAnonymousName();
      
      const { error } = await supabase
        .from('forum_posts')
        .insert([{
          forum_id: selectedForum.id,
          user_id: user.id,
          anonymous_name: finalAnonymousName,
          title: newPostTitle,
          content: newPostContent,
          moderation_status: 'pending'
        }]);

      if (error) throw error;

      toast({
        title: "Post Submitted! 📝",
        description: "Your post is being reviewed and will appear shortly.",
      });

      setShowNewPost(false);
      setNewPostTitle('');
      setNewPostContent('');
      setAnonymousName('');
      
      // Reload posts
      loadPosts(selectedForum.id);
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "Failed to submit post. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getForumIcon = (category: string) => {
    switch (category) {
      case 'newcomers': return '🌱';
      case 'milestones': return '🎉';
      case 'challenges': return '💪';
      case 'daily_life': return '🌅';
      case 'family_friends': return '👨‍👩‍👧‍👦';
      case 'spirituality': return '🕊️';
      case 'mental_health': return '🧠';
      default: return '💬';
    }
  };

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Forum Categories */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-serenity-navy">
            <MessageSquare className="w-5 h-5" />
            Forum Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {forums.map((forum) => (
            <Button
              key={forum.id}
              variant={selectedForum?.id === forum.id ? "default" : "ghost"}
              className={`w-full justify-start h-auto p-3 ${
                selectedForum?.id === forum.id 
                  ? 'bg-serenity-teal hover:bg-serenity-teal/90 text-white' 
                  : 'hover:bg-serenity-mint/10'
              }`}
              onClick={() => setSelectedForum(forum)}
            >
              <div className="flex items-center gap-3 w-full">
                <span className="text-lg">{getForumIcon(forum.category)}</span>
                <div className="text-left flex-1">
                  <div className="font-semibold">{forum.title}</div>
                  <div className="text-xs opacity-75">{forum.description}</div>
                </div>
                <ChevronRight className="w-4 h-4" />
              </div>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Posts List */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-serenity-navy">
              <span className="text-lg">{selectedForum ? getForumIcon(selectedForum.category) : '💬'}</span>
              {selectedForum?.title || 'Select a Forum'}
            </CardTitle>
            <Dialog open={showNewPost} onOpenChange={setShowNewPost}>
              <DialogTrigger asChild>
                <Button className="bg-serenity-teal hover:bg-serenity-teal/90 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  New Post
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Post</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Anonymous Name (Optional)</label>
                    <Input
                      placeholder="Leave blank for auto-generated name"
                      value={anonymousName}
                      onChange={(e) => setAnonymousName(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Example: {generateAnonymousName()}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Post Title</label>
                    <Input
                      placeholder="What's on your mind?"
                      value={newPostTitle}
                      onChange={(e) => setNewPostTitle(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Content</label>
                    <Textarea
                      placeholder="Share your thoughts, ask for support, or offer encouragement..."
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      className="mt-1 min-h-32"
                    />
                  </div>
                  
                  <div className="bg-serenity-mint/10 p-3 rounded-lg">
                    <p className="text-sm text-serenity-sage">
                      <strong>Community Guidelines:</strong> Be respectful, supportive, and honest. 
                      No personal information, harmful content, or medical advice. All posts are moderated for safety.
                    </p>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowNewPost(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleNewPost} className="bg-serenity-teal hover:bg-serenity-teal/90 text-white">
                      Submit Post
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          {selectedForum && (
            <div className="flex items-center gap-4 mt-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          {selectedForum ? (
            loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-serenity-teal mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No posts yet in this forum.</p>
                <Button onClick={() => setShowNewPost(true)} className="bg-serenity-teal hover:bg-serenity-teal/90 text-white">
                  Be the First to Post
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {posts
                  .filter(post => 
                    searchQuery === '' || 
                    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    post.content.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((post) => (
                    <div key={post.id} className="p-4 border border-serenity-sage/20 rounded-lg hover:bg-serenity-mint/5 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-serenity-teal/20 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-serenity-teal" />
                          </div>
                          <span className="font-medium text-serenity-navy">{post.anonymous_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {timeAgo(post.created_at)}
                          </Badge>
                        </div>
                        
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                          <Flag className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      <h4 className="font-semibold text-serenity-navy mb-2">{post.title}</h4>
                      <p className="text-sm text-gray-700 mb-3 line-clamp-3">{post.content}</p>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          <span>{post.reply_count} replies</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>Last activity {timeAgo(post.last_activity)}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="ml-auto text-serenity-teal hover:text-serenity-teal/80">
                          View Discussion
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-muted-foreground">Select a forum category to view posts</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AnonymousForums;