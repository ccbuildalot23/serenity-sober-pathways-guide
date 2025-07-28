import { supabase } from '@/integrations/supabase/client';

export interface CollaborativeRecoveryPlan {
  id: string;
  patient_id: string;
  title: string;
  description: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  current_version: number;
  is_collaborative: boolean;
  last_edited_at: string | null;
  last_edited_by: string | null;
}

export interface PlanCollaborator {
  id: string;
  plan_id: string;
  collaborator_id: string;
  role: string;
  permissions: any;
  status: string;
  invited_by: string;
  created_at: string;
  updated_at: string;
}

export interface PlanComment {
  id: string;
  plan_id: string;
  author_id: string;
  content: string;
  comment_type: string;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
  goal_id: string | null;
  parent_comment_id: string | null;
}

export class CollaborativeRecoveryPlanService {
  // Plan Management
  static async createPlan(planData: {
    title: string;
    description: string;
  }): Promise<CollaborativeRecoveryPlan | null> {
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('recovery_plans')
        .insert({
          patient_id: authUser.user.id,
          title: planData.title,
          description: planData.description,
          created_by: authUser.user.id,
          status: 'draft',
          current_version: 1,
          is_collaborative: false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating plan:', error);
      return null;
    }
  }

  static async getUserPlans(userId: string): Promise<CollaborativeRecoveryPlan[]> {
    try {
      // Get plans where user is the patient or a collaborator
      const { data, error } = await supabase
        .from('recovery_plans')
        .select(`
          *,
          plan_collaborators!inner (
            collaborator_id,
            role,
            status
          )
        `)
        .or(`patient_id.eq.${userId},plan_collaborators.collaborator_id.eq.${userId}`)
        .eq('plan_collaborators.status', 'accepted')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user plans:', error);
      return [];
    }
  }

  static async updatePlan(planId: string, updates: Partial<CollaborativeRecoveryPlan>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('recovery_plans')
        .update(updates)
        .eq('id', planId);

      return !error;
    } catch (error) {
      console.error('Error updating plan:', error);
      return false;
    }
  }

  // Collaboration Management
  static async shareWithProvider(
    planId: string,
    providerEmail: string,
    accessLevel: 'read' | 'write',
    inviterId: string
  ): Promise<boolean> {
    try {
      // First check if provider exists in the system
      const { data: providerProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', providerEmail)
        .single();

      if (!providerProfile) {
        throw new Error('Provider not found in system');
      }

      // Create collaboration invitation
      const { error: inviteError } = await supabase
        .from('plan_collaborators')
        .insert({
          plan_id: planId,
          collaborator_id: providerProfile.id,
          role: accessLevel === 'write' ? 'editor' : 'viewer',
          permissions: { access_level: accessLevel },
          status: 'pending',
          invited_by: inviterId
        });

      if (inviteError) throw inviteError;

      // Mark plan as collaborative
      const { error: updateError } = await supabase
        .from('recovery_plans')
        .update({ is_collaborative: true })
        .eq('id', planId);

      if (updateError) throw updateError;

      return true;
    } catch (error) {
      console.error('Error sharing plan:', error);
      return false;
    }
  }

  static async getCollaborators(planId: string): Promise<PlanCollaborator[]> {
    try {
      const { data, error } = await supabase
        .from('plan_collaborators')
        .select('*')
        .eq('plan_id', planId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching collaborators:', error);
      return [];
    }
  }

  static async respondToInvitation(
    collaboratorId: string,
    planId: string,
    response: 'accepted' | 'declined'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('plan_collaborators')
        .update({
          status: response
        })
        .eq('plan_id', planId)
        .eq('collaborator_id', collaboratorId);

      return !error;
    } catch (error) {
      console.error('Error responding to invitation:', error);
      return false;
    }
  }

  // Comments System
  static async addComment(
    planId: string,
    content: string,
    commentType: string = 'general'
  ): Promise<PlanComment | null> {
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('plan_comments')
        .insert({
          plan_id: planId,
          author_id: authUser.user.id,
          content,
          comment_type: commentType,
          is_resolved: false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding comment:', error);
      return null;
    }
  }

  static async getComments(planId: string): Promise<PlanComment[]> {
    try {
      const { data, error } = await supabase
        .from('plan_comments')
        .select('*')
        .eq('plan_id', planId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  }

  // Version Control
  static async createVersion(planId: string, changeDescription: string): Promise<boolean> {
    try {
      // Get current plan data
      const { data: currentPlan } = await supabase
        .from('recovery_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (!currentPlan) throw new Error('Plan not found');

      // Create version record using proper schema
      const { error } = await supabase
        .from('plan_versions')
        .insert({
          plan_id: planId,
          version_number: currentPlan.current_version + 1,
          current_data: currentPlan,
          changes_summary: changeDescription,
          change_type: 'manual_update',
          changed_by: currentPlan.created_by
        });

      if (error) throw error;

      // Update plan version
      await supabase
        .from('recovery_plans')
        .update({ current_version: currentPlan.current_version + 1 })
        .eq('id', planId);

      return true;
    } catch (error) {
      console.error('Error creating version:', error);
      return false;
    }
  }

  // Progress Calculation - simplified for basic functionality
  static async calculateProgress(planId: string): Promise<number> {
    try {
      // For now, return a default progress calculation
      // This can be enhanced later when recovery_goals schema is properly integrated
      return 0;
    } catch (error) {
      console.error('Error calculating progress:', error);
      return 0;
    }
  }

  // Provider Templates
  static async getProviderTemplates(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('provider_templates')
        .select('*')
        .eq('is_shared', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching provider templates:', error);
      return [];
    }
  }

  static async createPlanFromTemplate(templateId: string, customizations: any): Promise<CollaborativeRecoveryPlan | null> {
    try {
      const { data: template } = await supabase
        .from('provider_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (!template) throw new Error('Template not found');

      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser.user) throw new Error('User not authenticated');

      // Create plan from template with proper schema
      const planData = {
        patient_id: authUser.user.id,
        title: customizations.title || template.title,
        description: customizations.description || template.description,
        created_by: authUser.user.id,
        status: 'draft',
        current_version: 1,
        is_collaborative: false
      };

      const { data, error } = await supabase
        .from('recovery_plans')
        .insert(planData)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error creating plan from template:', error);
      return null;
    }
  }
}