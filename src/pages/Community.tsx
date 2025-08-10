import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Users, Trophy, Star, Share2, MessageCircle } from 'lucide-react';

interface Milestone {
  id: string;
  type: string;
  message: string;
  user: string;
  timestamp: Date;
  likes: number;
  comments: number;
}

interface CommunityPost {
  id: string;
  type: 'milestone' | 'inspiration' | 'support';
  content: string;
  user: string;
  timestamp: Date;
  likes: number;
  comments: number;
}

const Community = () => {
  const navigate = useNavigate();
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [milestoneType, setMilestoneType] = useState('');
  const [milestoneMessage, setMilestoneMessage] = useState('');

  const milestones: Milestone[] = [
    {
      id: '1',
      type: '30-days-sober',
      message: 'Just hit 30 days! Feeling grateful and strong.',
      user: 'Sarah M.',
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      likes: 24,
      comments: 8,
    },
    {
      id: '2',
      type: '90-days-sober',
      message: '90 days today! Never thought I\'d make it this far.',
      user: 'Mike R.',
      timestamp: new Date(Date.now() - 7200000), // 2 hours ago
      likes: 45,
      comments: 12,
    },
    {
      id: '3',
      type: '1-year-sober',
      message: 'One year sober today! This community has been my rock.',
      user: 'Lisa K.',
      timestamp: new Date(Date.now() - 86400000), // 1 day ago
      likes: 89,
      comments: 23,
    },
  ];

  const communityPosts: CommunityPost[] = [
    {
      id: '1',
      type: 'inspiration',
      content: 'Remember: Progress, not perfection. Every day clean is a victory worth celebrating.',
      user: 'Recovery Coach',
      timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
      likes: 15,
      comments: 3,
    },
    {
      id: '2',
      type: 'support',
      content: 'Having a tough day? Reach out. We\'re all here for each other.',
      user: 'Community Moderator',
      timestamp: new Date(Date.now() - 5400000), // 1.5 hours ago
      likes: 22,
      comments: 7,
    },
  ];

  const supportGroups = [
    { id: '1', name: 'Early Recovery Support', members: 156, active: true },
    { id: '2', name: 'Long-term Recovery', members: 89, active: true },
    { id: '3', name: 'Family & Friends', members: 234, active: true },
    { id: '4', name: 'Mental Health & Recovery', members: 123, active: false },
  ];

  const handleShareMilestone = () => {
    if (milestoneType && milestoneMessage) {
      // In a real app, this would save to the database
      console.log('Sharing milestone:', { type: milestoneType, message: milestoneMessage });
      setShowMilestoneModal(false);
      setMilestoneType('');
      setMilestoneMessage('');
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getMilestoneIcon = (type: string) => {
    switch (type) {
      case '30-days-sober': return '🥉';
      case '90-days-sober': return '🥈';
      case '1-year-sober': return '🥇';
      default: return '🎉';
    }
  };

  const getMilestoneTitle = (type: string) => {
    switch (type) {
      case '30-days-sober': return '30 Days Sober';
      case '90-days-sober': return '90 Days Sober';
      case '1-year-sober': return '1 Year Sober';
      default: return 'Milestone';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            onClick={() => navigate('/patient/dashboard')}
            variant="ghost"
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold">Community</h1>
            <p className="text-gray-400">Connect, share, and support each other</p>
          </div>

          <Button
            onClick={() => setShowMilestoneModal(true)}
            data-testid="share-milestone-button"
            className="bg-green-600 hover:bg-green-700"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Milestone
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6" data-testid="community-feed">
            {/* Milestones */}
            <div data-testid="milestone-sharing">
              <h2 className="text-2xl font-semibold mb-4 flex items-center">
                <Trophy className="w-6 h-6 mr-2" />
                Recent Milestones
              </h2>
              
              <div className="space-y-4">
                {milestones.map((milestone) => (
                  <div key={milestone.id} className="bg-gray-800 rounded-xl p-6">
                    <div className="flex items-start space-x-4">
                      <div className="text-3xl">{getMilestoneIcon(milestone.type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{getMilestoneTitle(milestone.type)}</h3>
                          <span className="text-sm text-gray-400">{formatTime(milestone.timestamp)}</span>
                        </div>
                        <p className="text-gray-300 mb-3">{milestone.message}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span className="flex items-center">
                            <Heart className="w-4 h-4 mr-1" />
                            {milestone.likes}
                          </span>
                          <span className="flex items-center">
                            <MessageCircle className="w-4 h-4 mr-1" />
                            {milestone.comments}
                          </span>
                          <span>by {milestone.user}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inspirational Content */}
            <div data-testid="inspirational-content">
              <h2 className="text-2xl font-semibold mb-4 flex items-center">
                <Star className="w-6 h-6 mr-2" />
                Daily Inspiration
              </h2>
              
              <div className="space-y-4">
                {communityPosts.map((post) => (
                  <div key={post.id} className="bg-gray-800 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold">{post.user}</span>
                      <span className="text-sm text-gray-400">{formatTime(post.timestamp)}</span>
                    </div>
                    <p className="text-gray-300 mb-3">{post.content}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span className="flex items-center">
                        <Heart className="w-4 h-4 mr-1" />
                        {post.likes}
                      </span>
                      <span className="flex items-center">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        {post.comments}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Support Groups */}
            <div data-testid="support-groups">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Support Groups
              </h3>
              
              <div className="space-y-3">
                {supportGroups.map((group) => (
                  <div
                    key={group.id}
                    className="bg-gray-800 rounded-lg p-4 border-l-4 border-blue-500"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{group.name}</h4>
                      <div className={`w-2 h-2 rounded-full ${group.active ? 'bg-green-500' : 'bg-gray-500'}`} />
                    </div>
                    <p className="text-sm text-gray-400">{group.members} members</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Join Group
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/peer-support')}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Join Chat
                </Button>
                <Button
                  onClick={() => navigate('/crisis-support')}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Crisis Support
                </Button>
                <Button
                  onClick={() => navigate('/motivation')}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <Star className="w-4 h-4 mr-2" />
                  Get Motivated
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Share Milestone Modal */}
        {showMilestoneModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full space-y-6" data-testid="milestone-modal">
              <div className="text-center space-y-4">
                <Trophy className="w-12 h-12 text-yellow-500 mx-auto" />
                <h3 className="text-xl font-semibold">Share Your Milestone</h3>
                <p className="text-gray-300">
                  Celebrate your achievements and inspire others on their journey.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Milestone Type
                  </label>
                  <Select value={milestoneType} onValueChange={setMilestoneType}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select milestone type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30-days-sober" data-testid="milestone-type">30 Days Sober</SelectItem>
                      <SelectItem value="90-days-sober">90 Days Sober</SelectItem>
                      <SelectItem value="1-year-sober">1 Year Sober</SelectItem>
                      <SelectItem value="other">Other Achievement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Your Message
                  </label>
                  <Textarea
                    data-testid="milestone-message"
                    placeholder="Share your thoughts, feelings, or advice..."
                    value={milestoneMessage}
                    onChange={(e) => setMilestoneMessage(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={() => setShowMilestoneModal(false)}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleShareMilestone}
                  data-testid="share-milestone"
                  disabled={!milestoneType || !milestoneMessage.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600"
                >
                  Share Milestone
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Community;