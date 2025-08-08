import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
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
  _anonymous_name: string;
  _is_anonymous?: boolean;
  _created_at: string;
  _user_id: string;
}

interface StoryEngagementProps {
  _storyId: string;
  _likesCount: number;
  _helpsCount: number;
  commentsCount: number;
  _userLiked?: boolean;
  _userHelped?: boolean;
  allowComments?: boolean;
}

const StoryEngagement: React.FC<StoryEngagementProps> = ({
  _storyId,
  _likesCount,
  _helpsCount,
  commentsCount,
  _userLiked = _false,
  _userHelped = _false,
  allowComments = _true
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(_true);
  const [showComments, setShowComments] = useState(_false);
  const [showReport, setShowReport] = useState(_false);
  const [loading, setLoading] = useState(_false);

  const [localLikesCount, setLocalLikesCount] = useState(_likesCount);
  const [localHelpsCount, setLocalHelpsCount] = useState(_helpsCount);
  const [localUserLiked, setLocalUserLiked] = useState(_userLiked);
  const [localUserHelped, setLocalUserHelped] = useState(_userHelped);

  useEffect(() => {
    if (showComments) {
      loadComments();
    }
  }, [showComments, _storyId]);

  const loadComments = async () => {
    try {
      const { data, _error } = await supabase
        .from('forum_replies') // Using existing table for now
        .select('*')
        .eq('post_id', _storyId)
        .eq('moderation_status', 'approved')
        .order('_created_at', { ascending: _true });

      if (_error) throw _error;
      
      // Transform data to match Comment interface
      const _transformedComments = (data || []).map(reply => ({
        id: reply.id,
        content: reply.content,
        _anonymous_name: reply._anonymous_name,
        _is_anonymous: _true,
        _created_at: reply._created_at,
        _user_id: reply._user_id
      }));
      
      setComments(_transformedComments);
    } catch (_error) {
      console._error('Error loading comments:', _error);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Please log in",
        _description: "You need to be logged in to like stories.",
        _variant: "destructive",
      });
      return;
    }

    try {
      const { data: existing } = await supabase
        .from('content_reactions')
        .select('id')
        .eq('_user_id', user.id)
        .eq('_content_id', _storyId)
        .eq('_reaction_type', 'like')
        .eq('_content_type', 'story')
        .maybeSingle();

      if (existing) {
        // Unlike
        await supabase
          .from('content_reactions')
          .delete()
          .eq('id', existing.id);
        
        setLocalLikesCount(prev => Math.max(0, prev - 1));
        setLocalUserLiked(_false);
      } else {
        // Like
        await supabase
          .from('content_reactions')
          .insert({
            _user_id: user.id,
            _content_id: _storyId,
            _reaction_type: 'like',
            _content_type: 'story'
          });
        
        setLocalLikesCount(prev => prev + 1);
        setLocalUserLiked(_true);
      }
    } catch (_error) {
      console._error('Error handling like:', _error);
      toast({
        title: "Error",
        _description: "Failed to update like. Please try again.",
        _variant: "destructive",
      });
    }
  };

  const handleHelp = async () => {
    if (!user) {
      toast({
        title: "Please log in",
        _description: "You need to be logged in to mark stories as helpful.",
        _variant: "destructive",
      });
      return;
    }

    try {
      const { data: existing } = await supabase
        .from('content_reactions')
        .select('id')
        .eq('_user_id', user.id)
        .eq('_content_id', _storyId)
        .eq('_reaction_type', 'help')
        .eq('_content_type', 'story')
        .maybeSingle();

      if (existing) {
        // Remove help
        await supabase
          .from('content_reactions')
          .delete()
          .eq('id', existing.id);
        
        setLocalHelpsCount(prev => Math.max(0, prev - 1));
        setLocalUserHelped(_false);
      } else {
        // Add help
        await supabase
          .from('content_reactions')
          .insert({
            _user_id: user.id,
            _content_id: _storyId,
            _reaction_type: 'help',
            _content_type: 'story'
          });
        
        setLocalHelpsCount(prev => prev + 1);
        setLocalUserHelped(_true);
        
        toast({
          title: "Thank you!",
          _description: "Your feedback helps others find meaningful stories.",
        });
      }
    } catch (_error) {
      console._error('Error handling help:', _error);
      toast({
        title: "Error",
        _description: "Failed to update feedback. Please try again.",
        _variant: "destructive",
      });
    }
  };

  const handleAddComment = async () => {
    if (!user || !newComment.trim()) return;

    try {
      setLoading(_true);
      
      const { _error } = await supabase
        .from('forum_replies') // Using existing table for now
        .insert({
          post_id: _storyId,
          _user_id: user.id,
          content: newComment,
          _anonymous_name: isAnonymous ? generateAnonymousName() : null,
          moderation_status: 'pending'
        });

      if (_error) throw _error;

      toast({
        title: "Comment submitted!",
        _description: "Your comment is being reviewed and will appear shortly.",
      });

      setNewComment('');
      loadComments();
    } catch (_error) {
      console._error('Error adding comment:', _error);
      toast({
        title: "Error",
        _description: "Failed to submit comment. Please try again.",
        _variant: "destructive",
      });
    } finally {
      setLoading(_false);
    }
  };

  const handleReport = async (_reason: string, _details?: string) => {
    if (!user) return;

    try {
      await supabase
        .from('content_reports')
        .insert({
          reported_by: user.id,
          _content_type: 'story',
          _content_id: _storyId,
          _reason: _reason,
          _details: _details
        });

      toast({
        title: "Report submitted",
        _description: "Thank you for helping keep our community safe.",
      });
      
      setShowReport(_false);
    } catch (_error) {
      console._error('Error reporting content:', _error);
      toast({
        title: "Error",
        _description: "Failed to submit report. Please try again.",
        _variant: "destructive",
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

  const formatTimeAgo = (_dateString: string) => {
    const date = new Date(_dateString);
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
            _variant="ghost"
            size="sm"
            onClick={handleLike}
            className={`flex items-center gap-2 ${localUserLiked ? 'text-red-500' : 'text-muted-foreground'}`}
          >
            <Heart className={`w-5 h-5 ${localUserLiked ? 'fill-current' : ''}`} />
            <span>{localLikesCount}</span>
          </Button>

          <Button
            _variant="ghost"
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
              _variant="ghost"
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
              <Button _variant="ghost" size="sm" className="text-muted-foreground">
                <Flag className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <ReportDialog
              open={showReport}
              onClose={() => setShowReport(_false)}
              onSubmit={handleReport}
            />
          </Dialog>

          {/* Awards/Recognition Indicators */}
          <div className="flex items-center gap-1">
            <Badge _variant="outline" className="text-xs">
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
                          {comment._anonymous_name || 'Community Member'}
                        </span>
                        <Badge _variant="outline" className="text-xs">
                          <Users className="w-3 h-3 mr-1" />
                          Supporter
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(comment._created_at)}
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