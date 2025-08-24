import { supabase } from '@/integrations/supabase/client';
import type { Provider, ProviderReview, ProviderConnectionRequest, SavedProvider, ProviderSearchFilters } from '@/types/provider';

export class ProviderService {
  // Search and filter providers
  static async searchProviders(filters: ProviderSearchFilters): Promise<Provider[]> {
    let query = supabase
      .from('providers')
      .select('*')
      .eq('status', 'active')
      .eq('is_verified', true);

    // Apply filters
    if (filters.searchTerm) {
      query = query.or(`name.ilike.%${filters.searchTerm}%,bio.ilike.%${filters.searchTerm}%,specialties.cs.["${filters.searchTerm}"]`);
    }

    if (filters.state) {
      query = query.eq('location_state', filters.state);
    }

    if (filters.specialty) {
      query = query.contains('specialties', [filters.specialty]);
    }

    if (filters.insurance) {
      query = query.contains('insurance_accepted', [filters.insurance]);
    }

    if (filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    if (filters.acceptingNewPatients) {
      query = query.eq('accepting_new_patients', true);
    }

    // Apply sorting
    const orderColumn = filters.sortBy === 'distance' ? 'location_state' : 
                       filters.sortBy === 'rating' ? 'average_rating' :
                       filters.sortBy === 'experience' ? 'years_experience' : 'name';
    
    query = query.order(orderColumn, { ascending: filters.sortOrder === 'asc' });

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Provider[];
  }

  // Get provider by ID
  static async getProvider(id: string): Promise<Provider | null> {
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Provider;
  }

  // Get provider reviews
  static async getProviderReviews(providerId: string): Promise<ProviderReview[]> {
    const { data, error } = await supabase
      .from('provider_reviews')
      .select('*')
      .eq('provider_id', providerId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Create provider review
  static async createReview(review: Omit<ProviderReview, 'id' | 'created_at' | 'updated_at'>): Promise<ProviderReview> {
    const { data, error } = await supabase
      .from('provider_reviews')
      .insert(review)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Save/unsave provider
  static async toggleSavedProvider(providerId: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from('saved_providers')
      .select('id')
      .eq('provider_id', providerId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (existing) {
      // Remove from saved
      const { error } = await supabase
        .from('saved_providers')
        .delete()
        .eq('id', existing.id);
      
      if (error) throw error;
      return false;
    } else {
      // Add to saved
      const { error } = await supabase
        .from('saved_providers')
        .insert({
          provider_id: providerId,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });
      
      if (error) throw error;
      return true;
    }
  }

  // Get saved providers
  static async getSavedProviders(): Promise<Provider[]> {
    const { data, error } = await supabase
      .from('saved_providers')
      .select(`
        providers (*)
      `)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

    if (error) throw error;
    return (data?.map(item => item.providers).filter(Boolean) || []) as Provider[];
  }

  // Check if provider is saved
  static async isProviderSaved(providerId: string): Promise<boolean> {
    const { data } = await supabase
      .from('saved_providers')
      .select('id')
      .eq('provider_id', providerId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    return !!data;
  }

  // Create connection request
  static async createConnectionRequest(request: Omit<ProviderConnectionRequest, 'id' | 'requested_at' | 'responded_at'>): Promise<ProviderConnectionRequest> {
    const { data, error } = await supabase
      .from('provider_connection_requests')
      .insert(request)
      .select()
      .single();

    if (error) throw error;
    return data as ProviderConnectionRequest;
  }

  // Get connection requests (for patients)
  static async getMyConnectionRequests(): Promise<ProviderConnectionRequest[]> {
    const { data, error } = await supabase
      .from('provider_connection_requests')
      .select('*')
      .eq('patient_id', (await supabase.auth.getUser()).data.user?.id)
      .order('requested_at', { ascending: false });

    if (error) throw error;
    return (data || []) as ProviderConnectionRequest[];
  }

  // Respond to connection request (for providers)
  static async respondToConnectionRequest(
    requestId: string, 
    status: 'approved' | 'declined', 
    response?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('provider_connection_requests')
      .update({
        status,
        provider_response: response,
        responded_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) throw error;

    // If approved, create the relationship in patient_provider_relationships
    if (status === 'approved') {
      const { data: request } = await supabase
        .from('provider_connection_requests')
        .select('patient_id, provider_id')
        .eq('id', requestId)
        .single();

      if (request) {
        await supabase
          .from('patient_provider_relationships')
          .insert({
            patient_id: request.patient_id,
            provider_id: request.provider_id,
            status: 'active'
          });
      }
    }
  }

  // Get unique filter options
  static async getFilterOptions() {
    const { data: providers } = await supabase
      .from('providers')
      .select('location_state, specialties, insurance_accepted, tags')
      .eq('status', 'active')
      .eq('is_verified', true);

    if (!providers) return { states: [], specialties: [], insurance: [], tags: [] };

    const states = [...new Set(providers.map(p => p.location_state))].sort();
    const specialties = [...new Set(providers.flatMap(p => Array.isArray(p.specialties) ? p.specialties : []))].sort();
    const insurance = [...new Set(providers.flatMap(p => Array.isArray(p.insurance_accepted) ? p.insurance_accepted : []))].sort();
    const tags = [...new Set(providers.flatMap(p => Array.isArray(p.tags) ? p.tags : []))].sort();

    return { states, specialties: specialties as string[], insurance: insurance as string[], tags: tags as string[] };
  }

  // Compare providers
  static async compareProviders(providerIds: string[]): Promise<Provider[]> {
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .in('id', providerIds)
      .eq('status', 'active');

    if (error) throw error;
    return (data || []) as Provider[];
  }
}