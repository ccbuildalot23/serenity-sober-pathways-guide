// Hope Stories Service - Real stories from real recovery

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HopeStory {
  id: string;
  anonymous_name: string; // Like "Day892Hope"
  days_clean: number;
  message: string;
  audio_url?: string;
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
        .eq('is_approved', true);
      
      if (filter === 'recent') {
        query = query.order('created_at', { ascending: false }).limit(20);
      } else if (filter === 'most_helped') {
        query = query.order('helped_count', { ascending: false }).limit(20);
      } else if (filter === 'similar_days') {
        // Get stories from people with similar clean time
        const userDays = parseInt(localStorage.getItem('clean_days') || '0');
        const range = userDays < 30 ? 10 : userDays < 90 ? 30 : 90;
        query = query
          .gte('days_clean', Math.max(0, userDays - range))
          .lte('days_clean', userDays + range)
          .order('created_at', { ascending: false })
          .limit(20);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return (data || []).map(story => ({
        ...story,
        anonymous_name: this.generateAnonymousName(story.days_clean),
        is_mine: story.user_id === (await supabase.auth.getUser()).data.user?.id
      }));
    } catch (error) {
      console.error('Error loading hope stories:', error);
      return [];
    }
  }
  
  // Share your story
  async shareHope(message: string, audioUrl?: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to share your story');
        return false;
      }
      
      const daysClean = parseInt(localStorage.getItem('clean_days') || '0');
      
      const { error } = await supabase
        .from('hope_stories')
        .insert({
          user_id: user.id,
          days_clean: daysClean,
          message: message,
          audio_url: audioUrl,
          is_approved: true // Auto-approve for MVP
        });
      
      if (error) throw error;
      
      toast.success('Your story has been shared. It will help someone today. 💙');
      return true;
    } catch (error) {
      console.error('Error sharing story:', error);
      toast.error('Unable to share right now. Please try again.');
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
    } catch (error) {
      console.error('Error reacting to story:', error);
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
      const { data, error } = await supabase
        .from('hope_stories')
        .select('*')
        .eq('is_approved', true)
        .gte('days_clean', 30) // At least 30 days
        .order('helped_count', { ascending: false })
        .limit(10);
      
      if (error || !data || data.length === 0) return null;
      
      // Return random story from top helpful ones
      const story = data[Math.floor(Math.random() * data.length)];
      return {
        ...story,
        anonymous_name: this.generateAnonymousName(story.days_clean)
      };
    } catch (error) {
      console.error('Error getting story for struggling:', error);
      return null;
    }
  }
}

export const hopeStories = new HopeStoriesService();

// Default stories for when database is empty
export const defaultHopeStories: Omit<HopeStory, 'id' | 'created_at'>[] = [
  {
    anonymous_name: "Day1095Free",
    days_clean: 1095,
    message: "3 years ago I was sleeping under a bridge. Today I have a job, an apartment, and people who love me. If you're reading this on Day 1, I promise you it gets better. Just don't use today.",
    helped_count: 427
  },
  {
    anonymous_name: "Day30Brave", 
    days_clean: 30,
    message: "Made it to 30 days! The cravings are still there but they're getting quieter. What helped me most was calling someone every time I wanted to use. You're not bothering them - that's what they're there for.",
    helped_count: 892
  },
  {
    anonymous_name: "Day7Fighter",
    days_clean: 7,
    message: "One week clean. I can't believe I made it. The first 3 days were hell but I'm still here. If you're on Day 1, just know that I was there last week. We can do this together.",
    helped_count: 1243
  },
  {
    anonymous_name: "Day365Miracle",
    days_clean: 365,
    message: "One year ago I tried to end it all. Recovery gave me a life I never thought possible. To anyone struggling: your pain has a purpose. Your story will save lives. Mine already has.",
    helped_count: 3421
  }
];