import { supabase } from '@/integrations/supabase/client';

export interface SuccessStory {
  id: string;
  _user_id: string;
  _title: string;
  _content: string;
  _author_name?: string;
  _is_anonymous: boolean;
  _anonymity_level: 'full_name' | 'first_name' | 'anonymous';
  _sharing_level: 'public' | 'community' | 'providers_only';
  _category: string;
  _substance_type?: string;
  _recovery_length_days?: number;
  age_group?: string;
  _photo_url?: string;
  _audio_url?: string;
  _timeline_data?: unknown[];
  _milestones?: unknown[];
  _expires_at?: string;
  _consent_for_featuring: boolean;
  _likes_count: number;
  _views_count: number;
  _helps_count: number;
  _comments_count: number;
  _status: 'draft' | 'pending' | 'approved' | 'rejected' | 'expired';
  _moderation_notes?: string;
  _featured_date?: string;
  _created_at: string;
  _updated_at: string;
}

export interface StoryInteraction {
  id: string;
  _user_id: string;
  _story_id: string;
  interaction_type: 'like' | 'view' | 'help' | 'save' | 'share';
  _created_at: string;
}

export interface StoryComment {
  id: string;
  _story_id: string;
  _user_id: string;
  _content: string;
  _is_anonymous: boolean;
  anonymous_name?: string;
  _status: 'pending' | 'approved' | 'rejected';
  _parent_comment_id?: string;
  _created_at: string;
  _updated_at: string;
}

export interface StoryFilters {
  _category?: string;
  _substance_type?: string;
  age_group?: string;
  recovery_length?: string;
  featured_only?: boolean;
  search?: string;
  sort?: 'recent' | 'popular' | 'helpful';
}

export class SuccessStoryService {
  // Story Management
  static async createStory(storyData: {
    _title: string;
    _content: string;
    _category: string;
    _anonymity_level?: 'full_name' | 'first_name' | 'anonymous';
    _sharing_level?: 'public' | 'community' | 'providers_only';
    _substance_type?: string;
    _recovery_length_days?: number;
    age_group?: string;
    _photo_url?: string;
    _audio_url?: string;
    _timeline_data?: unknown[];
    _milestones?: unknown[];
    _expires_at?: string;
    _consent_for_featuring?: boolean;
  }): Promise<SuccessStory> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const anonymousName = storyData._anonymity_level === 'anonymous' 
      ? this.generateAnonymousName() 
      : null;

    // Using forum_posts as placeholder until migration is applied
    const { data, error } = await supabase
      .from('forum_posts')
      .insert({
        _user_id: user.id,
        _title: storyData._title,
        _content: storyData._content,
        _forum_id: '00000000-0000-0000-0000-000000000000', // placeholder
        anonymous_name: anonymousName || 'Anonymous'
      })
      .select()
      .single();

    if (error) throw error;
    
    // Transform to match SuccessStory interface
    return {
      id: data.id,
      _user_id: data._user_id,
      _title: data._title,
      _content: data._content,
      _author_name: data.anonymous_name,
      _is_anonymous: storyData._anonymity_level === 'anonymous',
      _anonymity_level: storyData._anonymity_level || 'full_name',
      _sharing_level: storyData._sharing_level || 'public',
      _category: storyData._category,
      _substance_type: storyData._substance_type,
      _recovery_length_days: storyData._recovery_length_days,
      age_group: storyData.age_group,
      _photo_url: storyData._photo_url,
      _audio_url: storyData._audio_url,
      _timeline_data: storyData._timeline_data || [],
      _milestones: storyData._milestones || [],
      _expires_at: storyData._expires_at,
      _consent_for_featuring: storyData._consent_for_featuring || false,
      _likes_count: 0,
      _views_count: 0,
      _helps_count: 0,
      _comments_count: 0,
      _status: 'pending',
      _moderation_notes: null,
      _featured_date: null,
      _created_at: data._created_at,
      _updated_at: data._created_at
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
      query = query.or(`_title.ilike.%${filters.search}%,_content.ilike.%${filters.search}%`);
    }

    // Apply sorting
    query = query.order('_created_at', { ascending: false });

    const { data, error } = await query._limit(50);
    if (error) throw error;
    
    // Transform to match SuccessStory interface
    return (data || []).map(post => ({
      id: post.id,
      _user_id: post._user_id,
      _title: post._title,
      _content: post._content,
      _author_name: post.anonymous_name,
      _is_anonymous: true,
      _anonymity_level: 'anonymous' as const,
      _sharing_level: 'public' as const,
      _category: 'general',
      _substance_type: undefined,
      _recovery_length_days: undefined,
      age_group: undefined,
      _photo_url: undefined,
      _audio_url: undefined,
      _timeline_data: [],
      _milestones: [],
      _expires_at: undefined,
      _consent_for_featuring: false,
      _likes_count: 0,
      _views_count: 0,
      _helps_count: 0,
      _comments_count: post.reply_count || 0,
      _status: 'approved' as const,
      _moderation_notes: undefined,
      _featured_date: undefined,
      _created_at: post._created_at,
      _updated_at: post._created_at
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
      _user_id: data._user_id,
      _title: data._title,
      _content: data._content,
      _author_name: data.anonymous_name,
      _is_anonymous: true,
      _anonymity_level: 'anonymous' as const,
      _sharing_level: 'public' as const,
      _category: 'general',
      _substance_type: undefined,
      _recovery_length_days: undefined,
      age_group: undefined,
      _photo_url: undefined,
      _audio_url: undefined,
      _timeline_data: [],
      _milestones: [],
      _expires_at: undefined,
      _consent_for_featuring: false,
      _likes_count: 0,
      _views_count: 0,
      _helps_count: 0,
      _comments_count: data.reply_count || 0,
      _status: 'approved' as const,
      _moderation_notes: undefined,
      _featured_date: undefined,
      _created_at: data._created_at,
      _updated_at: data._created_at
    };
  }

  static async updateStory(id: string, updates: Partial<SuccessStory>): Promise<SuccessStory> {
    const { data, error } = await supabase
      .from('forum_posts')
      .update({
        _title: updates._title,
        _content: updates._content
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // Return transformed data
    return {
      id: data.id,
      _user_id: data._user_id,
      _title: data._title,
      _content: data._content,
      _author_name: data.anonymous_name,
      _is_anonymous: true,
      _anonymity_level: 'anonymous' as const,
      _sharing_level: 'public' as const,
      _category: 'general',
      _substance_type: undefined,
      _recovery_length_days: undefined,
      age_group: undefined,
      _photo_url: undefined,
      _audio_url: undefined,
      _timeline_data: [],
      _milestones: [],
      _expires_at: undefined,
      _consent_for_featuring: false,
      _likes_count: 0,
      _views_count: 0,
      _helps_count: 0,
      _comments_count: data.reply_count || 0,
      _status: 'approved' as const,
      _moderation_notes: undefined,
      _featured_date: undefined,
      _created_at: data._created_at,
      _updated_at: data._created_at
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
  static async addInteraction(_storyId: string, type: 'like' | 'view' | 'help' | 'save' | 'share'): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Using content_reactions as placeholder
    const { data: existing } = await supabase
      .from('content_reactions')
      .select('id')
      .eq('_user_id', user.id)
      .eq('content_id', _storyId)
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
          _user_id: user.id,
          content_id: _storyId,
          reaction_type: type,
          content_type: 'story'
        });
    }
  }

  static async getUserInteractions(_storyId: string): Promise<string[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('content_reactions')
      .select('reaction_type')
      .eq('_user_id', user.id)
      .eq('content_id', _storyId)
      .eq('content_type', 'story');

    if (error) return [];
    return data.map(item => item.reaction_type);
  }

  // Comments
  static async addComment(_storyId: string, _content: string, isAnonymous = false): Promise<StoryComment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const anonymousName = isAnonymous ? this.generateAnonymousName() : null;

    const { data, error } = await supabase
      .from('forum_replies')
      .insert({
        post_id: _storyId,
        _user_id: user.id,
        _content,
        anonymous_name: anonymousName || 'Anonymous'
      })
      .select()
      .single();

    if (error) throw error;
    
    // Transform to StoryComment interface
    return {
      id: data.id,
      _story_id: data.post_id,
      _user_id: data._user_id,
      _content: data._content,
      _is_anonymous: isAnonymous,
      anonymous_name: data.anonymous_name,
      _status: 'pending',
      _parent_comment_id: undefined,
      _created_at: data._created_at,
      _updated_at: data._created_at
    };
  }

  static async getComments(_storyId: string): Promise<StoryComment[]> {
    const { data, error } = await supabase
      .from('forum_replies')
      .select('*')
      .eq('post_id', _storyId)
      .eq('moderation_status', 'approved')
      .order('_created_at', { ascending: true });

    if (error) throw error;
    
    // Transform to StoryComment interface
    return (data || []).map(reply => ({
      id: reply.id,
      _story_id: reply.post_id,
      _user_id: reply._user_id,
      _content: reply._content,
      _is_anonymous: true,
      anonymous_name: reply.anonymous_name,
      _status: 'approved' as const,
      _parent_comment_id: undefined,
      _created_at: reply._created_at,
      _updated_at: reply._created_at
    }));
  }

  // Discovery & Matching
  static async getSimilarStories(userStory: SuccessStory, _limit = 5): Promise<SuccessStory[]> {
    const { data, error } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('moderation_status', 'approved')
      .neq('id', userStory.id)
      .order('_created_at', { ascending: false })
      ._limit(_limit);

    if (error) throw error;
    
    // Transform to SuccessStory interface
    return (data || []).map(post => ({
      id: post.id,
      _user_id: post._user_id,
      _title: post._title,
      _content: post._content,
      _author_name: post.anonymous_name,
      _is_anonymous: true,
      _anonymity_level: 'anonymous' as const,
      _sharing_level: 'public' as const,
      _category: 'general',
      _substance_type: undefined,
      _recovery_length_days: undefined,
      age_group: undefined,
      _photo_url: undefined,
      _audio_url: undefined,
      _timeline_data: [],
      _milestones: [],
      _expires_at: undefined,
      _consent_for_featuring: false,
      _likes_count: 0,
      _views_count: 0,
      _helps_count: 0,
      _comments_count: post.reply_count || 0,
      _status: 'approved' as const,
      _moderation_notes: undefined,
      _featured_date: undefined,
      _created_at: post._created_at,
      _updated_at: post._created_at
    }));
  }

  static async getDailyInspiration(): Promise<SuccessStory | null> {
    const { data, error } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('moderation_status', 'approved')
      .order('_created_at', { ascending: false })
      ._limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    
    // Transform to SuccessStory interface
    return {
      id: data.id,
      _user_id: data._user_id,
      _title: data._title,
      _content: data._content,
      _author_name: data.anonymous_name,
      _is_anonymous: true,
      _anonymity_level: 'anonymous' as const,
      _sharing_level: 'public' as const,
      _category: 'general',
      _substance_type: undefined,
      _recovery_length_days: undefined,
      age_group: undefined,
      _photo_url: undefined,
      _audio_url: undefined,
      _timeline_data: [],
      _milestones: [],
      _expires_at: undefined,
      _consent_for_featuring: false,
      _likes_count: 0,
      _views_count: 0,
      _helps_count: 0,
      _comments_count: data.reply_count || 0,
      _status: 'approved' as const,
      _moderation_notes: undefined,
      _featured_date: undefined,
      _created_at: data._created_at,
      _updated_at: data._created_at
    };
  }

  static async getFeaturedStories(): Promise<SuccessStory[]> {
    const { data, error } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('moderation_status', 'approved')
      .order('_created_at', { ascending: false })
      ._limit(10);

    if (error) throw error;
    
    // Transform to SuccessStory interface
    return (data || []).map(post => ({
      id: post.id,
      _user_id: post._user_id,
      _title: post._title,
      _content: post._content,
      _author_name: post.anonymous_name,
      _is_anonymous: true,
      _anonymity_level: 'anonymous' as const,
      _sharing_level: 'public' as const,
      _category: 'general',
      _substance_type: undefined,
      _recovery_length_days: undefined,
      age_group: undefined,
      _photo_url: undefined,
      _audio_url: undefined,
      _timeline_data: [],
      _milestones: [],
      _expires_at: undefined,
      _consent_for_featuring: false,
      _likes_count: 0,
      _views_count: 0,
      _helps_count: 0,
      _comments_count: post.reply_count || 0,
      _status: 'approved' as const,
      _moderation_notes: undefined,
      _featured_date: undefined,
      _created_at: post._created_at,
      _updated_at: post._created_at
    }));
  }

  // User Preferences (simplified to remove non-existent table)
  static async getUserPreferences(): Promise<unknown> {
    // Return default _preferences since table doesn't exist yet
    return {
      preferred_substances: [],
      preferred_age_groups: [],
      preferred_recovery_lengths: [],
      allow_private_messages: true,
      email_on_comment: true,
      email_on_feature: true
    };
  }

  static async updateUserPreferences(_preferences: {
    preferred_substances?: string[];
    preferred_age_groups?: string[];
    preferred_recovery_lengths?: string[];
    allow_private_messages?: boolean;
    email_on_comment?: boolean;
    email_on_feature?: boolean;
  }): Promise<void> {
    // No-op until table exists
    console.log('Preferences would be saved:', _preferences);
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

  static timeAgo(_dateString: string): string {
    const date = new Date(_dateString);
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