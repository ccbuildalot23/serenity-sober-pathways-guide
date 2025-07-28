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

    // Using forum_posts as placeholder until migration is applied
    const { data, error } = await supabase
      .from('forum_posts')
      .insert({
        user_id: user.id,
        title: storyData.title,
        content: storyData.content,
        forum_id: '00000000-0000-0000-0000-000000000000', // placeholder
        anonymous_name: anonymousName || 'Anonymous'
      })
      .select()
      .single();

    if (error) throw error;
    
    // Transform to match SuccessStory interface
    return {
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      content: data.content,
      author_name: data.anonymous_name,
      is_anonymous: storyData.anonymity_level === 'anonymous',
      anonymity_level: storyData.anonymity_level || 'full_name',
      sharing_level: storyData.sharing_level || 'public',
      category: storyData.category,
      substance_type: storyData.substance_type,
      recovery_length_days: storyData.recovery_length_days,
      age_group: storyData.age_group,
      photo_url: storyData.photo_url,
      audio_url: storyData.audio_url,
      timeline_data: storyData.timeline_data || [],
      milestones: storyData.milestones || [],
      expires_at: storyData.expires_at,
      consent_for_featuring: storyData.consent_for_featuring || false,
      likes_count: 0,
      views_count: 0,
      helps_count: 0,
      comments_count: 0,
      status: 'pending',
      moderation_notes: null,
      featured_date: null,
      created_at: data.created_at,
      updated_at: data.created_at
    } as SuccessStory;
  }

  static async getStories(filters?: StoryFilters): Promise<SuccessStory[]> {
    // Using forum_posts as placeholder until migration is applied
    let query = supabase
      .from('forum_posts')
      .select('*')
      .eq('moderation_status', 'approved');

    // Apply basic filters
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
    }

    // Apply sorting
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query.limit(50);
    if (error) throw error;
    
    // Transform to match SuccessStory interface
    return (data || []).map(post => ({
      id: post.id,
      user_id: post.user_id,
      title: post.title,
      content: post.content,
      author_name: post.anonymous_name,
      is_anonymous: true,
      anonymity_level: 'anonymous' as const,
      sharing_level: 'public' as const,
      category: 'general',
      substance_type: undefined,
      recovery_length_days: undefined,
      age_group: undefined,
      photo_url: undefined,
      audio_url: undefined,
      timeline_data: [],
      milestones: [],
      expires_at: undefined,
      consent_for_featuring: false,
      likes_count: 0,
      views_count: 0,
      helps_count: 0,
      comments_count: post.reply_count || 0,
      status: 'approved' as const,
      moderation_notes: undefined,
      featured_date: undefined,
      created_at: post.created_at,
      updated_at: post.created_at
    }));
  }

  static async getStoryById(id: string): Promise<SuccessStory | null> {
    const { data, error } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    
    // Transform to match SuccessStory interface
    return {
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      content: data.content,
      author_name: data.anonymous_name,
      is_anonymous: true,
      anonymity_level: 'anonymous' as const,
      sharing_level: 'public' as const,
      category: 'general',
      substance_type: undefined,
      recovery_length_days: undefined,
      age_group: undefined,
      photo_url: undefined,
      audio_url: undefined,
      timeline_data: [],
      milestones: [],
      expires_at: undefined,
      consent_for_featuring: false,
      likes_count: 0,
      views_count: 0,
      helps_count: 0,
      comments_count: data.reply_count || 0,
      status: 'approved' as const,
      moderation_notes: undefined,
      featured_date: undefined,
      created_at: data.created_at,
      updated_at: data.created_at
    };
  }

  static async updateStory(id: string, updates: Partial<SuccessStory>): Promise<SuccessStory> {
    const { data, error } = await supabase
      .from('forum_posts')
      .update({
        title: updates.title,
        content: updates.content
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // Return transformed data
    return {
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      content: data.content,
      author_name: data.anonymous_name,
      is_anonymous: true,
      anonymity_level: 'anonymous' as const,
      sharing_level: 'public' as const,
      category: 'general',
      substance_type: undefined,
      recovery_length_days: undefined,
      age_group: undefined,
      photo_url: undefined,
      audio_url: undefined,
      timeline_data: [],
      milestones: [],
      expires_at: undefined,
      consent_for_featuring: false,
      likes_count: 0,
      views_count: 0,
      helps_count: 0,
      comments_count: data.reply_count || 0,
      status: 'approved' as const,
      moderation_notes: undefined,
      featured_date: undefined,
      created_at: data.created_at,
      updated_at: data.created_at
    };
  }

  static async deleteStory(id: string): Promise<void> {
    const { error } = await supabase
      .from('forum_posts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Story Interactions
  static async addInteraction(storyId: string, type: 'like' | 'view' | 'help' | 'save' | 'share'): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Using content_reactions as placeholder
    const { data: existing } = await supabase
      .from('content_reactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('content_id', storyId)
      .eq('reaction_type', type)
      .eq('content_type', 'story')
      .maybeSingle();

    if (existing) {
      await supabase
        .from('content_reactions')
        .delete()
        .eq('id', existing.id);
    } else {
      await supabase
        .from('content_reactions')
        .insert({
          user_id: user.id,
          content_id: storyId,
          reaction_type: type,
          content_type: 'story'
        });
    }
  }

  static async getUserInteractions(storyId: string): Promise<string[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('content_reactions')
      .select('reaction_type')
      .eq('user_id', user.id)
      .eq('content_id', storyId)
      .eq('content_type', 'story');

    if (error) return [];
    return data.map(item => item.reaction_type);
  }

  // Comments
  static async addComment(storyId: string, content: string, isAnonymous = false): Promise<StoryComment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const anonymousName = isAnonymous ? this.generateAnonymousName() : null;

    const { data, error } = await supabase
      .from('forum_replies')
      .insert({
        post_id: storyId,
        user_id: user.id,
        content,
        anonymous_name: anonymousName || 'Anonymous'
      })
      .select()
      .single();

    if (error) throw error;
    
    // Transform to StoryComment interface
    return {
      id: data.id,
      story_id: data.post_id,
      user_id: data.user_id,
      content: data.content,
      is_anonymous: isAnonymous,
      anonymous_name: data.anonymous_name,
      status: 'pending',
      parent_comment_id: undefined,
      created_at: data.created_at,
      updated_at: data.created_at
    };
  }

  static async getComments(storyId: string): Promise<StoryComment[]> {
    const { data, error } = await supabase
      .from('forum_replies')
      .select('*')
      .eq('post_id', storyId)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    // Transform to StoryComment interface
    return (data || []).map(reply => ({
      id: reply.id,
      story_id: reply.post_id,
      user_id: reply.user_id,
      content: reply.content,
      is_anonymous: true,
      anonymous_name: reply.anonymous_name,
      status: 'approved' as const,
      parent_comment_id: undefined,
      created_at: reply.created_at,
      updated_at: reply.created_at
    }));
  }

  // Discovery & Matching
  static async getSimilarStories(userStory: SuccessStory, limit = 5): Promise<SuccessStory[]> {
    const { data, error } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('moderation_status', 'approved')
      .neq('id', userStory.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    
    // Transform to SuccessStory interface
    return (data || []).map(post => ({
      id: post.id,
      user_id: post.user_id,
      title: post.title,
      content: post.content,
      author_name: post.anonymous_name,
      is_anonymous: true,
      anonymity_level: 'anonymous' as const,
      sharing_level: 'public' as const,
      category: 'general',
      substance_type: undefined,
      recovery_length_days: undefined,
      age_group: undefined,
      photo_url: undefined,
      audio_url: undefined,
      timeline_data: [],
      milestones: [],
      expires_at: undefined,
      consent_for_featuring: false,
      likes_count: 0,
      views_count: 0,
      helps_count: 0,
      comments_count: post.reply_count || 0,
      status: 'approved' as const,
      moderation_notes: undefined,
      featured_date: undefined,
      created_at: post.created_at,
      updated_at: post.created_at
    }));
  }

  static async getDailyInspiration(): Promise<SuccessStory | null> {
    const { data, error } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    
    // Transform to SuccessStory interface
    return {
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      content: data.content,
      author_name: data.anonymous_name,
      is_anonymous: true,
      anonymity_level: 'anonymous' as const,
      sharing_level: 'public' as const,
      category: 'general',
      substance_type: undefined,
      recovery_length_days: undefined,
      age_group: undefined,
      photo_url: undefined,
      audio_url: undefined,
      timeline_data: [],
      milestones: [],
      expires_at: undefined,
      consent_for_featuring: false,
      likes_count: 0,
      views_count: 0,
      helps_count: 0,
      comments_count: data.reply_count || 0,
      status: 'approved' as const,
      moderation_notes: undefined,
      featured_date: undefined,
      created_at: data.created_at,
      updated_at: data.created_at
    };
  }

  static async getFeaturedStories(): Promise<SuccessStory[]> {
    const { data, error } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    
    // Transform to SuccessStory interface
    return (data || []).map(post => ({
      id: post.id,
      user_id: post.user_id,
      title: post.title,
      content: post.content,
      author_name: post.anonymous_name,
      is_anonymous: true,
      anonymity_level: 'anonymous' as const,
      sharing_level: 'public' as const,
      category: 'general',
      substance_type: undefined,
      recovery_length_days: undefined,
      age_group: undefined,
      photo_url: undefined,
      audio_url: undefined,
      timeline_data: [],
      milestones: [],
      expires_at: undefined,
      consent_for_featuring: false,
      likes_count: 0,
      views_count: 0,
      helps_count: 0,
      comments_count: post.reply_count || 0,
      status: 'approved' as const,
      moderation_notes: undefined,
      featured_date: undefined,
      created_at: post.created_at,
      updated_at: post.created_at
    }));
  }

  // User Preferences (simplified to remove non-existent table)
  static async getUserPreferences(): Promise<any> {
    // Return default preferences since table doesn't exist yet
    return {
      preferred_substances: [],
      preferred_age_groups: [],
      preferred_recovery_lengths: [],
      allow_private_messages: true,
      email_on_comment: true,
      email_on_feature: true
    };
  }

  static async updateUserPreferences(preferences: {
    preferred_substances?: string[];
    preferred_age_groups?: string[];
    preferred_recovery_lengths?: string[];
    allow_private_messages?: boolean;
    email_on_comment?: boolean;
    email_on_feature?: boolean;
  }): Promise<void> {
    // No-op until table exists
    console.log('Preferences would be saved:', preferences);
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