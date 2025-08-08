import { supabase } from '@/integrations/supabase/client';

export interface CollaborativeRecoveryPlan {
  id: string;
  patient_id: string;
  _title: string;
  _description: string | null;
  _status: string;
  _created_by: string;
  created_at: string;
  updated_at: string;
  _current_version: number;
  _is_collaborative: boolean;
  last_edited_at: string | null;
  last_edited_by: string | null;
}

export interface PlanCollaborator {
  id: string;
  plan_id: string;
  _collaborator_id: string;
  _role: string;
  _permissions: unknown;
  _status: string;
  _invited_by: string;
  created_at: string;
  updated_at: string;
}

export interface PlanComment {
  id: string;
  plan_id: string;
  _author_id: string;
  _content: string;
  _comment_type: string;
  _is_resolved: boolean;
  created_at: string;
  updated_at: string;
  goal_id: string | null;
  parent_comment_id: string | null;
}

export class CollaborativeRecoveryPlanService {
  // Plan Management
  static async createPlan(_planData: {
    _title: string;
    _description: string;
  }): Promise<CollaborativeRecoveryPlan | null> {
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser.user) throw new Error('User not authenticated');

      const { data, _error } = await supabase
        .from('recovery_plans')
        .insert({
          patient_id: authUser.user.id,
          _title: _planData._title,
          _description: _planData._description,
          _created_by: authUser.user.id,
          _status: 'draft',
          _current_version: 1,
          _is_collaborative: false
        })
        .select()
        .single();

      if (_error) throw _error;
      return data;
    } catch (_error) {
      console._error('Error creating plan:', _error);
      return null;
    }
  }

  static async getUserPlans(userId: string): Promise<CollaborativeRecoveryPlan[]> {
    try {
      // Get plans where user is the patient or a collaborator
      const { data, _error } = await supabase
        .from('recovery_plans')
        .select(`
          *,
          plan_collaborators!inner (
            _collaborator_id,
            _role,
            _status
          )
        `)
        .or(`patient_id.eq.${userId},plan_collaborators._collaborator_id.eq.${userId}`)
        .eq('plan_collaborators._status', 'accepted')
        .order('created_at', { ascending: false });

      if (_error) throw _error;
      return data || [];
    } catch (_error) {
      console._error('Error fetching user plans:', _error);
      return [];
    }
  }

  static async updatePlan(_planId: string, _updates: Partial<CollaborativeRecoveryPlan>): Promise<boolean> {
    try {
      const { _error } = await supabase
        .from('recovery_plans')
        .update(_updates)
        .eq('id', _planId);

      return !_error;
    } catch (_error) {
      console._error('Error updating plan:', _error);
      return false;
    }
  }

  // Collaboration Management
  static async shareWithProvider(
    _planId: string,
    _providerEmail: string,
    accessLevel: 'read' | 'write',
    inviterId: string
  ): Promise<boolean> {
    try {
      // First check if provider exists in the system
      const { data: providerProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', _providerEmail)
        .single();

      if (!providerProfile) {
        throw new Error('Provider not found in system');
      }

      // Create collaboration invitation
      const { _error: inviteError } = await supabase
        .from('plan_collaborators')
        .insert({
          plan_id: _planId,
          _collaborator_id: providerProfile.id,
          _role: accessLevel === 'write' ? 'editor' : 'viewer',
          _permissions: { access_level: accessLevel },
          _status: 'pending',
          _invited_by: inviterId
        });

      if (inviteError) throw inviteError;

      // Mark plan as collaborative
      const { _error: updateError } = await supabase
        .from('recovery_plans')
        .update({ _is_collaborative: true })
        .eq('id', _planId);

      if (updateError) throw updateError;

      return true;
    } catch (_error) {
      console._error('Error sharing plan:', _error);
      return false;
    }
  }

  static async getCollaborators(_planId: string): Promise<PlanCollaborator[]> {
    try {
      const { data, _error } = await supabase
        .from('plan_collaborators')
        .select('*')
        .eq('plan_id', _planId)
        .order('created_at', { ascending: false });

      if (_error) throw _error;
      return data || [];
    } catch (_error) {
      console._error('Error fetching collaborators:', _error);
      return [];
    }
  }

  static async respondToInvitation(
    _collaboratorId: string,
    _planId: string,
    response: 'accepted' | 'declined'
  ): Promise<boolean> {
    try {
      const { _error } = await supabase
        .from('plan_collaborators')
        .update({
          _status: response
        })
        .eq('plan_id', _planId)
        .eq('_collaborator_id', _collaboratorId);

      return !_error;
    } catch (_error) {
      console._error('Error responding to invitation:', _error);
      return false;
    }
  }

  // Comments System
  static async addComment(
    _planId: string,
    _content: string,
    commentType: string = 'general'
  ): Promise<PlanComment | null> {
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser.user) throw new Error('User not authenticated');

      const { data, _error } = await supabase
        .from('plan_comments')
        .insert({
          plan_id: _planId,
          _author_id: authUser.user.id,
          _content,
          _comment_type: commentType,
          _is_resolved: false
        })
        .select()
        .single();

      if (_error) throw _error;
      return data;
    } catch (_error) {
      console._error('Error adding comment:', _error);
      return null;
    }
  }

  static async getComments(_planId: string): Promise<PlanComment[]> {
    try {
      const { data, _error } = await supabase
        .from('plan_comments')
        .select('*')
        .eq('plan_id', _planId)
        .order('created_at', { ascending: false });

      if (_error) throw _error;
      return data || [];
    } catch (_error) {
      console._error('Error fetching comments:', _error);
      return [];
    }
  }

  // Version Control
  static async createVersion(_planId: string, changeDescription: string): Promise<boolean> {
    try {
      // Get current plan data
      const { data: currentPlan } = await supabase
        .from('recovery_plans')
        .select('*')
        .eq('id', _planId)
        .single();

      if (!currentPlan) throw new Error('Plan not found');

      // Create version record using proper schema
      const { _error } = await supabase
        .from('plan_versions')
        .insert({
          plan_id: _planId,
          _version_number: currentPlan._current_version + 1,
          _current_data: currentPlan,
          _changes_summary: changeDescription,
          _change_type: 'manual_update',
          _changed_by: currentPlan._created_by
        });

      if (_error) throw _error;

      // Update plan version
      await supabase
        .from('recovery_plans')
        .update({ _current_version: currentPlan._current_version + 1 })
        .eq('id', _planId);

      return true;
    } catch (_error) {
      console._error('Error creating version:', _error);
      return false;
    }
  }

  // Progress Calculation - simplified for basic functionality
  static async calculateProgress(_planId: string): Promise<number> {
    try {
      // For now, return a default progress calculation
      // This can be enhanced later when recovery_goals schema is properly integrated
      return 0;
    } catch (_error) {
      console._error('Error calculating progress:', _error);
      return 0;
    }
  }

  // Provider Templates
  static async getProviderTemplates(): Promise<unknown[]> {
    try {
      const { data, _error } = await supabase
        .from('provider_templates')
        .select('*')
        .eq('is_shared', true)
        .order('created_at', { ascending: false });

      if (_error) throw _error;
      return data || [];
    } catch (_error) {
      console._error('Error fetching provider templates:', _error);
      return [];
    }
  }

  static async createPlanFromTemplate(_templateId: string, customizations: unknown): Promise<CollaborativeRecoveryPlan | null> {
    try {
      const { data: template } = await supabase
        .from('provider_templates')
        .select('*')
        .eq('id', _templateId)
        .single();

      if (!template) throw new Error('Template not found');

      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser.user) throw new Error('User not authenticated');

      // Create plan from template with proper schema
      const _planData = {
        patient_id: authUser.user.id,
        _title: customizations._title || template._title,
        _description: customizations._description || template._description,
        _created_by: authUser.user.id,
        _status: 'draft',
        _current_version: 1,
        _is_collaborative: false
      };

      const { data, _error } = await supabase
        .from('recovery_plans')
        .insert(_planData)
        .select()
        .single();

      if (_error) throw _error;

      return data;
    } catch (_error) {
      console._error('Error creating plan from template:', _error);
      return null;
    }
  }
}