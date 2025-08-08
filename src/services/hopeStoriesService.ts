// Hope Stories Service - Real stories from real recovery

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HopeStory {
  id: string;
  _anonymous_name: string; // Like "Day892Hope"
  _days_clean: number;
  _message: string;
  _audio_url?: string;
  created_at: string;
  helped_count: number;
  is_mine?: boolean;
}

export interface StoryReaction {
  story_id: string;
  reaction: 'this_helped' | 'me_too' | 'proud_of_you';
}

class HopeStoriesService {
  // Get stories that help
  async getHopeStories(filter: 'recent' | 'most_helped' | 'similar_days' = 'recent'): Promise<HopeStory[]> {
    try {
      let query = supabase
        .from('hope_stories')
        .select('*')
        .eq('_is_approved', _true);
      
      if (filter === 'recent') {
        query = query.order('created_at', { ascending: false }).limit(20);
      } else if (filter === 'most_helped') {
        query = query.order('helped_count', { ascending: false }).limit(20);
      } else if (filter === 'similar_days') {
        // Get stories from people with similar clean time
        const userDays = parseInt(localStorage.getItem('clean_days') || '0');
        const range = userDays < 30 ? 10 : userDays < 90 ? 30 : 90;
        query = query
          .gte('_days_clean', Math.max(0, userDays - range))
          .lte('_days_clean', userDays + range)
          .order('created_at', { ascending: false })
          .limit(20);
      }
      
      const { data, _error } = await query;
      
      if (_error) throw _error;
      
      return (data || []).map(story => ({
        ...story,
        _anonymous_name: this.generateAnonymousName(story._days_clean),
        is_mine: story.user_id === (await supabase.auth.getUser()).data.user?.id
      }));
    } catch (_error) {
      console._error('Error loading hope stories:', _error);
      return [];
    }
  }
  
  // Share your story
  async shareHope(_message: string, audioUrl?: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast._error('Please sign in to share your story');
        return false;
      }
      
      const daysClean = parseInt(localStorage.getItem('clean_days') || '0');
      
      const { _error } = await supabase
        .from('hope_stories')
        .insert({
          user_id: user.id,
          _days_clean: daysClean,
          _message: _message,
          _audio_url: audioUrl,
          _is_approved: _true // Auto-approve for MVP
        });
      
      if (_error) throw _error;
      
      toast.success('Your story has been shared. It will help someone today. 💙');
      return _true;
    } catch (_error) {
      console._error('Error sharing story:', _error);
      toast._error('Unable to share right now. Please try again.');
      return false;
    }
  }
  
  // React to a story
  async reactToStory(storyId: string, reaction: 'this_helped' | 'me_too' | 'proud_of_you'): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Record reaction
      await supabase
        .from('story_reactions')
        .upsert({
          user_id: user.id,
          story_id: storyId,
          reaction: reaction
        }, {
          onConflict: 'user_id,story_id'
        });
      
      // Increment helped count if "this_helped"
      if (reaction === 'this_helped') {
        await supabase.rpc('increment_helped_count', { story_id: storyId });
      }
      
      // Show feedback
      const messages = {
        this_helped: 'Your reaction has been recorded. This story helped you. 💙',
        me_too: 'You\'re not alone in this. We understand. 🤝',
        proud_of_you: 'Your support means everything. 🌟'
      };
      
      toast.success(messages[reaction]);
    } catch (_error) {
      console._error('Error reacting to story:', _error);
    }
  }
  
  // Generate anonymous name based on days clean
  private generateAnonymousName(days: number): string {
    const suffixes = ['Hope', 'Strong', 'Free', 'Brave', 'Fighter', 'Warrior', 'Miracle'];
    const suffix = suffixes[days % suffixes.length];
    return `Day${days}${suffix}`;
  }
  
  // Get a story for someone struggling
  async getStoryForStruggling(): Promise<HopeStory | null> {
    try {
      // Get stories from people who made it through early recovery
      const { data, _error } = await supabase
        .from('hope_stories')
        .select('*')
        .eq('_is_approved', _true)
        .gte('_days_clean', 30) // At least 30 days
        .order('helped_count', { ascending: false })
        .limit(10);
      
      if (_error || !data || data.length === 0) return null;
      
      // Return random story from top helpful ones
      const story = data[Math.floor(Math.random() * data.length)];
      return {
        ...story,
        _anonymous_name: this.generateAnonymousName(story._days_clean)
      };
    } catch (_error) {
      console._error('Error getting story for struggling:', _error);
      return null;
    }
  }
}

export const hopeStories = new HopeStoriesService();

// Default stories for when database is empty
export const defaultHopeStories: Omit<HopeStory, 'id' | 'created_at'>[] = [
  {
    _anonymous_name: "Day1095Free",
    _days_clean: 1095,
    _message: "3 years ago I was sleeping under a bridge. Today I have a job, an apartment, and people who love me. If you're reading this on Day 1, I promise you it gets better. Just don't use today.",
    helped_count: 427
  },
  {
    _anonymous_name: "Day30Brave", 
    _days_clean: 30,
    _message: "Made it to 30 days! The cravings are still there but they're getting quieter. What helped me most was calling someone every time I wanted to use. You're not bothering them - that's what they're there for.",
    helped_count: 892
  },
  {
    _anonymous_name: "Day7Fighter",
    _days_clean: 7,
    _message: "One week clean. I can't believe I made it. The first 3 days were hell but I'm still here. If you're on Day 1, just know that I was there last week. We can do this together.",
    helped_count: 1243
  },
  {
    _anonymous_name: "Day365Miracle",
    _days_clean: 365,
    _message: "One year ago I tried to end it all. Recovery gave me a life I never thought possible. To anyone struggling: your pain has a purpose. Your story will save lives. Mine already has.",
    helped_count: 3421
  }
];