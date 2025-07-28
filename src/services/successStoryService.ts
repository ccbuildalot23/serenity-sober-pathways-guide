import { supabase } from '@/integrations/supabase/client';

export interface SuccessStory {
  id: string;
  user_id: string;
  title: string;
  content: string;
  author_name?: string;
  is_anonymous: boolean;
  anonymity_level: 'full_name' | 'first_name' | 'anonymous';
  sharing_level: 'public' | 'community' | 'providers_only';
  category: string;
  substance_type?: string;
  recovery_length_days?: number;
  age_group?: string;
  photo_url?: string;
  audio_url?: string;
  timeline_data?: any[];
  milestones?: any[];
  expires_at?: string;
  consent_for_featuring: boolean;
  likes_count: number;
  views_count: number;
  helps_count: number;
  comments_count: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'expired';
  moderation_notes?: string;
  featured_date?: string;
  created_at: string;
  updated_at: string;
}

export interface StoryInteraction {
  id: string;
  user_id: string;
  story_id: string;
  interaction_type: 'like' | 'view' | 'help' | 'save' | 'share';
  created_at: string;
}

export interface StoryComment {
  id: string;
  story_id: string;
  user_id: string;
  content: string;
  is_anonymous: boolean;
  anonymous_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  parent_comment_id?: string;
  created_at: string;
  updated_at: string;
}

export interface StoryFilters {
  category?: string;
  substance_type?: string;
  age_group?: string;
  recovery_length?: string;
  featured_only?: boolean;
  search?: string;
  sort?: 'recent' | 'popular' | 'helpful';
}

export class SuccessStoryService {
  // Story Management
  static async createStory(storyData: {
    title: string;
    content: string;
    category: string;
    anonymity_level?: 'full_name' | 'first_name' | 'anonymous';
    sharing_level?: 'public' | 'community' | 'providers_only';
    substance_type?: string;
    recovery_length_days?: number;
    age_group?: string;
    photo_url?: string;
    audio_url?: string;
    timeline_data?: any[];
    milestones?: any[];
    expires_at?: string;
    consent_for_featuring?: boolean;
  }): Promise<SuccessStory> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const anonymousName = storyData.anonymity_level === 'anonymous' 
      ? this.generateAnonymousName() 
      : null;

    const { data, error } = await supabase
      .from('success_stories')
      .insert({
        user_id: user.id,
        title: storyData.title,
        content: storyData.content,
        category: storyData.category,
        author_name: anonymousName,
        is_anonymous: storyData.anonymity_level === 'anonymous',
        anonymity_level: storyData.anonymity_level || 'full_name',
        sharing_level: storyData.sharing_level || 'public',
        substance_type: storyData.substance_type,
        recovery_length_days: storyData.recovery_length_days,
        age_group: storyData.age_group,
        photo_url: storyData.photo_url,
        audio_url: storyData.audio_url,
        timeline_data: storyData.timeline_data || [],
        milestones: storyData.milestones || [],
        expires_at: storyData.expires_at,
        consent_for_featuring: storyData.consent_for_featuring || false,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data as SuccessStory;
  }

  static async getStories(filters?: StoryFilters): Promise<SuccessStory[]> {
    let query = supabase
      .from('success_stories')
      .select('*')
      .eq('status', 'approved');

    // Apply filters
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.substance_type) {
      query = query.eq('substance_type', filters.substance_type);
    }
    if (filters?.age_group) {
      query = query.eq('age_group', filters.age_group);
    }
    if (filters?.featured_only) {
      query = query.not('featured_date', 'is', null);
    }
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
    }

    // Apply sorting
    switch (filters?.sort) {
      case 'popular':
        query = query.order('likes_count', { ascending: false });
        break;
      case 'helpful':
        query = query.order('helps_count', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query.limit(50);
    if (error) throw error;
    return (data || []) as SuccessStory[];
  }

  static async getStoryById(id: string): Promise<SuccessStory | null> {
    const { data, error } = await supabase
      .from('success_stories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as SuccessStory;
  }

  static async updateStory(id: string, updates: Partial<SuccessStory>): Promise<SuccessStory> {
    const { data, error } = await supabase
      .from('success_stories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as SuccessStory;
  }

  static async deleteStory(id: string): Promise<void> {
    const { error } = await supabase
      .from('success_stories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Story Interactions
  static async addInteraction(storyId: string, type: 'like' | 'view' | 'help' | 'save' | 'share'): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // For views, always insert (to track unique views)
    if (type === 'view') {
      await supabase
        .from('story_interactions')
        .insert({
          user_id: user.id,
          story_id: storyId,
          interaction_type: type
        });
      return;
    }

    // For other interactions, toggle behavior
    const { data: existing } = await supabase
      .from('story_interactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('story_id', storyId)
      .eq('interaction_type', type)
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
          story_id: storyId,
          interaction_type: type
        });
    }
  }

  static async getUserInteractions(storyId: string): Promise<string[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('story_interactions')
      .select('interaction_type')
      .eq('user_id', user.id)
      .eq('story_id', storyId);

    if (error) return [];
    return data.map(item => item.interaction_type);
  }

  // Comments
  static async addComment(storyId: string, content: string, isAnonymous = false): Promise<StoryComment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const anonymousName = isAnonymous ? this.generateAnonymousName() : null;

    const { data, error } = await supabase
      .from('story_comments')
      .insert({
        story_id: storyId,
        user_id: user.id,
        content,
        is_anonymous: isAnonymous,
        anonymous_name: anonymousName,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data as StoryComment;
  }

  static async getComments(storyId: string): Promise<StoryComment[]> {
    const { data, error } = await supabase
      .from('story_comments')
      .select('*')
      .eq('story_id', storyId)
      .eq('status', 'approved')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as StoryComment[];
  }

  // Discovery & Matching
  static async getSimilarStories(userStory: SuccessStory, limit = 5): Promise<SuccessStory[]> {
    let query = supabase
      .from('success_stories')
      .select('*')
      .eq('status', 'approved')
      .neq('id', userStory.id);

    // Match by category first
    if (userStory.category) {
      query = query.eq('category', userStory.category);
    }

    // Then by substance type
    if (userStory.substance_type) {
      query = query.eq('substance_type', userStory.substance_type);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as SuccessStory[];
  }

  static async getDailyInspiration(): Promise<SuccessStory | null> {
    const { data, error } = await supabase
      .from('success_stories')
      .select('*')
      .eq('status', 'approved')
      .not('featured_date', 'is', null)
      .order('featured_date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as SuccessStory;
  }

  static async getFeaturedStories(): Promise<SuccessStory[]> {
    const { data, error } = await supabase
      .from('success_stories')
      .select('*')
      .eq('status', 'approved')
      .not('featured_date', 'is', null)
      .order('featured_date', { ascending: false })
      .limit(10);

    if (error) throw error;
    return (data || []) as SuccessStory[];
  }

  // User Preferences
  static async getUserPreferences(): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_story_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  static async updateUserPreferences(preferences: {
    preferred_substances?: string[];
    preferred_age_groups?: string[];
    preferred_recovery_lengths?: string[];
    allow_private_messages?: boolean;
    email_on_comment?: boolean;
    email_on_feature?: boolean;
  }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('user_story_preferences')
      .upsert({
        user_id: user.id,
        ...preferences,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  // Utility functions
  private static generateAnonymousName(): string {
    const prefixes = ['Hopeful', 'Brave', 'Strong', 'Peaceful', 'Determined', 'Resilient', 'Inspired', 'Grateful'];
    const suffixes = ['Survivor', 'Warrior', 'Journey', 'Phoenix', 'Spirit', 'Soul', 'Heart', 'Voice'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const number = Math.floor(Math.random() * 99) + 1;
    return `${prefix}${suffix}${number}`;
  }

  static formatRecoveryTime(days?: number): string | null {
    if (!days) return null;
    
    if (days < 30) return `${days} days`;
    if (days < 365) return `${Math.floor(days / 30)} months`;
    
    const years = Math.floor(days / 365);
    const remainingMonths = Math.floor((days % 365) / 30);
    if (remainingMonths === 0) return `${years} ${years === 1 ? 'year' : 'years'}`;
    return `${years}y ${remainingMonths}m`;
  }

  static timeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }
}