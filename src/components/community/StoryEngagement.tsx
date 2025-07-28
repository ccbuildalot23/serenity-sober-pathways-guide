import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  MessageCircle, 
  Heart, 
  HelpingHand, 
  Flag, 
  Send,
  Trophy,
  Star,
  Users,
  Shield,
  Zap,
  Crown
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ReportDialog } from './ReportDialog';

interface Comment {
  id: string;
  content: string;
  author_name: string;
  is_anonymous: boolean;
  created_at: string;
  user_id: string;
}

interface StoryEngagementProps {
  storyId: string;
  likesCount: number;
  helpsCount: number;
  commentsCount: number;
  userLiked?: boolean;
  userHelped?: boolean;
  allowComments?: boolean;
}

const StoryEngagement: React.FC<StoryEngagementProps> = ({
  storyId,
  likesCount,
  helpsCount,
  commentsCount,
  userLiked = false,
  userHelped = false,
  allowComments = true
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [loading, setLoading] = useState(false);

  const [localLikesCount, setLocalLikesCount] = useState(likesCount);
  const [localHelpsCount, setLocalHelpsCount] = useState(helpsCount);
  const [localUserLiked, setLocalUserLiked] = useState(userLiked);
  const [localUserHelped, setLocalUserHelped] = useState(userHelped);

  useEffect(() => {
    if (showComments) {
      loadComments();
    }
  }, [showComments, storyId]);

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('forum_replies') // Using existing table for now
        .select('*')
        .eq('post_id', storyId)
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to like stories.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: existing } = await supabase
        .from('story_interactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('story_id', storyId)
        .eq('interaction_type', 'like')
        .single();

      if (existing) {
        // Unlike
        await supabase
          .from('story_interactions')
          .delete()
          .eq('id', existing.id);
        
        setLocalLikesCount(prev => Math.max(0, prev - 1));
        setLocalUserLiked(false);
      } else {
        // Like
        await supabase
          .from('story_interactions')
          .insert({
            user_id: user.id,
            story_id: storyId,
            interaction_type: 'like'
          });
        
        setLocalLikesCount(prev => prev + 1);
        setLocalUserLiked(true);
      }
    } catch (error) {
      console.error('Error handling like:', error);
      toast({
        title: "Error",
        description: "Failed to update like. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleHelp = async () => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to mark stories as helpful.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: existing } = await supabase
        .from('story_interactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('story_id', storyId)
        .eq('interaction_type', 'help')
        .single();

      if (existing) {
        // Remove help
        await supabase
          .from('story_interactions')
          .delete()
          .eq('id', existing.id);
        
        setLocalHelpsCount(prev => Math.max(0, prev - 1));
        setLocalUserHelped(false);
      } else {
        // Add help
        await supabase
          .from('story_interactions')
          .insert({
            user_id: user.id,
            story_id: storyId,
            interaction_type: 'help'
          });
        
        setLocalHelpsCount(prev => prev + 1);
        setLocalUserHelped(true);
        
        toast({
          title: "Thank you!",
          description: "Your feedback helps others find meaningful stories.",
        });
      }
    } catch (error) {
      console.error('Error handling help:', error);
      toast({
        title: "Error",
        description: "Failed to update feedback. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddComment = async () => {
    if (!user || !newComment.trim()) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('forum_replies') // Using existing table for now
        .insert({
          post_id: storyId,
          user_id: user.id,
          content: newComment,
          anonymous_name: isAnonymous ? generateAnonymousName() : null,
          moderation_status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Comment submitted!",
        description: "Your comment is being reviewed and will appear shortly.",
      });

      setNewComment('');
      loadComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to submit comment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async (reason: string, details?: string) => {
    if (!user) return;

    try {
      await supabase
        .from('content_reports')
        .insert({
          reported_by: user.id,
          content_type: 'story',
          content_id: storyId,
          reason: reason,
          details: details
        });

      toast({
        title: "Report submitted",
        description: "Thank you for helping keep our community safe.",
      });
      
      setShowReport(false);
    } catch (error) {
      console.error('Error reporting content:', error);
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const generateAnonymousName = () => {
    const prefixes = ['Supportive', 'Caring', 'Understanding', 'Compassionate', 'Encouraging'];
    const suffixes = ['Friend', 'Supporter', 'Companion', 'Ally', 'Helper'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const number = Math.floor(Math.random() * 99) + 1;
    return `${prefix}${suffix}${number}`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  };

  return (
    <div className="space-y-4">
      {/* Engagement Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={`flex items-center gap-2 ${localUserLiked ? 'text-red-500' : 'text-muted-foreground'}`}
          >
            <Heart className={`w-5 h-5 ${localUserLiked ? 'fill-current' : ''}`} />
            <span>{localLikesCount}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleHelp}
            className={`flex items-center gap-2 ${localUserHelped ? 'text-serenity-teal' : 'text-muted-foreground'}`}
          >
            <HelpingHand className={`w-5 h-5 ${localUserHelped ? 'fill-current' : ''}`} />
            <span>{localHelpsCount}</span>
            <span className="text-xs">This helped me</span>
          </Button>

          {allowComments && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{commentsCount}</span>
              <span className="text-xs">Comments</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={showReport} onOpenChange={setShowReport}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <Flag className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <ReportDialog
              open={showReport}
              onClose={() => setShowReport(false)}
              onSubmit={handleReport}
            />
          </Dialog>

          {/* Awards/Recognition Indicators */}
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs">
              <Star className="w-3 h-3 mr-1" />
              Inspiring
            </Badge>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && allowComments && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Comments ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Comment Form */}
            {user && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="anonymous-comment"
                    checked={isAnonymous}
                    onCheckedChange={setIsAnonymous}
                  />
                  <Label htmlFor="anonymous-comment" className="text-sm">
                    Comment anonymously
                  </Label>
                </div>

                <Textarea
                  placeholder="Share your thoughts, encouragement, or ask a question..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-20"
                />

                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    Comments are moderated and will appear after review
                  </p>
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || loading}
                    size="sm"
                    className="bg-serenity-teal hover:bg-serenity-teal/90 text-white"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {loading ? 'Submitting...' : 'Comment'}
                  </Button>
                </div>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No comments yet. Be the first to share your thoughts!
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="border-l-2 border-serenity-teal/20 pl-4 py-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {comment.is_anonymous ? comment.author_name : 'Community Member'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          <Users className="w-3 h-3 mr-1" />
                          Supporter
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Engagement Awards/Recognition */}
      <Card className="bg-gradient-to-r from-serenity-gold/10 to-serenity-teal/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-serenity-gold/20 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-serenity-gold" />
              </div>
              <div>
                <p className="text-sm font-medium">Story Impact</p>
                <p className="text-xs text-muted-foreground">
                  This story has touched {localLikesCount + localHelpsCount} lives
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {localHelpsCount >= 10 && (
                <Badge className="bg-serenity-teal text-white">
                  <HelpingHand className="w-3 h-3 mr-1" />
                  Helpful
                </Badge>
              )}
              {localLikesCount >= 20 && (
                <Badge className="bg-serenity-gold text-white">
                  <Heart className="w-3 h-3 mr-1" />
                  Beloved
                </Badge>
              )}
              {(localLikesCount + localHelpsCount) >= 50 && (
                <Badge className="bg-gradient-to-r from-serenity-gold to-serenity-teal text-white">
                  <Crown className="w-3 h-3 mr-1" />
                  Inspiring
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StoryEngagement;