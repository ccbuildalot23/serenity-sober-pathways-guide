import React, { useState, useEffect } from 'react';
import { MessageSquare, Users, Heart, Star, Flag, Pin, Eye, ThumbsUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CommunityService, ForumPost } from '@/services/communityService';
import { CreatePostDialog } from './CreatePostDialog';
import { ReportDialog } from './ReportDialog';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface CommunityForumProps {
  forumId?: string;
}

export const CommunityForum: React.FC<CommunityForumProps> = ({ forumId = 'general' }) => {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'pinned'>('recent');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [reportDialog, setReportDialog] = useState<{
    open: boolean;
    contentId: string;
    contentType: 'post' | 'reply' | 'story';
  }>({ open: false, contentId: '', contentType: 'post' });

  const categories = [
    { id: 'general', name: 'General Discussion', icon: MessageSquare, color: 'bg-blue-500' },
    { id: 'substance_specific', name: 'Substance-Specific', icon: Users, color: 'bg-green-500' },
    { id: 'family_support', name: 'Family Support', icon: Heart, color: 'bg-purple-500' },
    { id: 'success_stories', name: 'Success Stories', icon: Star, color: 'bg-yellow-500' }
  ];

  const commonTags = [
    'Support', 'Advice', 'Recovery', 'Relapse', 'Family', 'Work', 'Anxiety', 
    'Depression', 'Motivation', 'Gratitude', 'Milestones', 'Struggles'
  ];

  useEffect(() => {
    loadPosts();
  }, [forumId, sortBy, selectedTags, searchTerm]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await CommunityService.getForumPosts(forumId, {
        sort: sortBy,
        tags: selectedTags,
        search: searchTerm
      });
      setPosts(data);
    } catch (error) {
      console.error('Error loading posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async (postId: string, reactionType: 'helpful' | 'supportive' | 'inspiring' | 'understanding') => {
    try {
      await CommunityService.reactToPost(postId, reactionType);
      toast.success('Reaction added');
      loadPosts(); // Refresh to show updated counts
    } catch (error) {
      toast.error('Failed to add reaction');
    }
  };

  const handleReport = async (reason: string, details?: string) => {
    try {
      await CommunityService.reportContent(
        reportDialog.contentType,
        reportDialog.contentId,
        reason,
        details
      );
      toast.success('Content reported successfully');
      setReportDialog({ open: false, contentId: '', contentType: 'post' });
    } catch (error) {
      toast.error('Failed to report content');
    }
  };

  const renderPost = (post: ForumPost) => (
    <Card key={post.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {post.anonymous_name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{post.anonymous_name}</span>
                {post.is_pinned && <Pin className="h-3 w-3 text-blue-500" />}
                {post.crisis_flagged && (
                  <Badge variant="destructive" className="text-xs">Crisis Support</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span>{post.view_count}</span>
                </div>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReportDialog({
              open: true,
              contentId: post.id,
              contentType: 'post'
            })}
          >
            <Flag className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div>
          <h3 className="font-semibold mb-2">{post.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-3">{post.content}</p>
        </div>

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReaction(post.id, 'helpful')}
              className="text-xs"
            >
              <ThumbsUp className="h-3 w-3 mr-1" />
              Helpful
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReaction(post.id, 'supportive')}
              className="text-xs"
            >
              <Heart className="h-3 w-3 mr-1" />
              Supportive
            </Button>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{post.reply_count} replies</span>
          </div>
        </div>

        {post.crisis_flagged && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
            <p className="font-medium text-red-800">Crisis Resources Available</p>
            <p className="text-red-700">
              If you're in crisis, please call 988 (Suicide & Crisis Lifeline) or visit your nearest emergency room.
              You're not alone.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Community Forum</h1>
          <p className="text-muted-foreground">Connect with others on your recovery journey</p>
        </div>
        <Button onClick={() => setShowCreatePost(true)}>
          <MessageSquare className="h-4 w-4 mr-2" />
          New Post
        </Button>
      </div>

      {/* Categories */}
      <Tabs value={forumId} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          {categories.map((category) => (
            <TabsTrigger key={category.id} value={category.id}>
              <category.icon className="h-4 w-4 mr-2" />
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="Search posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="pinned">Pinned First</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tag filters */}
            <div className="flex flex-wrap gap-2 mt-4">
              {commonTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedTags(prev =>
                      prev.includes(tag)
                        ? prev.filter(t => t !== tag)
                        : [...prev, tag]
                    );
                  }}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Posts */}
        <TabsContent value={forumId} className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : posts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No posts found</p>
              </CardContent>
            </Card>
          ) : (
            posts.map(renderPost)
          )}
        </TabsContent>
      </Tabs>

      {/* Create Post Dialog */}
      <CreatePostDialog
        open={showCreatePost}
        forumId={forumId}
        onClose={() => setShowCreatePost(false)}
        onSuccess={() => {
          setShowCreatePost(false);
          loadPosts();
        }}
      />

      {/* Report Dialog */}
      <ReportDialog
        open={reportDialog.open}
        onClose={() => setReportDialog({ open: false, contentId: '', contentType: 'post' })}
        onSubmit={handleReport}
      />
    </div>
  );
};