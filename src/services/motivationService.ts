import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DailyQuote {
  _id: string;
  quote_text: string;
  author?: string;
  category: string;
  tags: string[];
  created_at: string;
}

export interface PersonalMotivation {
  _id: string;
  user_id: string;
  _content_type: 'quote' | 'image' | 'affirmation' | 'goal';
  title?: string;
  content: string;
  image_url?: string;
  source?: string;
  tags: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export const motivationService = {
  async getDailyQuote(): Promise<DailyQuote | null> {
    try {
      // Get today's date
      const today = new Date();
      const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
      
      const { data, error } = await supabase
        .from('daily_quotes')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching daily quote:', error);
        return null;
      }

      if (!data || data.length === 0) return null;

      // Use day of year to select a consistent quote for today
      const selectedQuote = data[dayOfYear % data.length];
      return {
        ...selectedQuote,
        tags: Array.isArray(selectedQuote.tags) ? selectedQuote.tags as string[] : []
      };
    } catch (error) {
      console.error('Error in getDailyQuote:', error);
      return null;
    }
  },

  async getQuotesByCategory(category?: string): Promise<DailyQuote[]> {
    try {
      let query = supabase
        .from('daily_quotes')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching quotes by category:', error);
        return [];
      }

      return (data || []).map(quote => ({
        ...quote,
        tags: Array.isArray(quote.tags) ? quote.tags as string[] : []
      }));
    } catch (error) {
      console.error('Error in getQuotesByCategory:', error);
      return [];
    }
  },

  async getPersonalMotivations(userId: string): Promise<PersonalMotivation[]> {
    try {
      const { data, error } = await supabase
        .from('personal_motivations')
        .select('*')
        .eq('user_id', userId)
        .order('is_favorite', { ascending: false })
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching personal motivations:', error);
        return [];
      }

      return (data || []).map(motivation => ({
        ...motivation,
        _content_type: motivation._content_type as 'quote' | 'image' | 'affirmation' | 'goal',
        tags: Array.isArray(motivation.tags) ? motivation.tags as string[] : []
      }));
    } catch (error) {
      console.error('Error in getPersonalMotivations:', error);
      return [];
    }
  },

  async addPersonalMotivation(userId: string, motivation: Omit<PersonalMotivation, '_id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('personal_motivations')
        .insert({
          user_id: userId,
          ...motivation
        });

      if (error) {
        console.error('Error adding personal motivation:', error);
        toast.error('Failed to save motivation');
        return false;
      }

      toast.success('Motivation saved to your library!');
      return true;
    } catch (error) {
      console.error('Error in addPersonalMotivation:', error);
      toast.error('Failed to save motivation');
      return false;
    }
  },

  async updatePersonalMotivation(_id: string, _updates: Partial<PersonalMotivation>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('personal_motivations')
        .update(_updates)
        .eq('_id', _id);

      if (error) {
        console.error('Error updating personal motivation:', error);
        toast.error('Failed to update motivation');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updatePersonalMotivation:', error);
      toast.error('Failed to update motivation');
      return false;
    }
  },

  async deletePersonalMotivation(_id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('personal_motivations')
        .delete()
        .eq('_id', _id);

      if (error) {
        console.error('Error deleting personal motivation:', error);
        toast.error('Failed to delete motivation');
        return false;
      }

      toast.success('Motivation removed from library');
      return true;
    } catch (error) {
      console.error('Error in deletePersonalMotivation:', error);
      toast.error('Failed to delete motivation');
      return false;
    }
  },

  async toggleFavorite(_id: string, isFavorite: boolean): Promise<boolean> {
    return this.updatePersonalMotivation(_id, { is_favorite: isFavorite });
  }
};