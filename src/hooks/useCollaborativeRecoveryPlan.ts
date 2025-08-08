import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CollaborativeRecoveryPlanService, CollaborativeRecoveryPlan, PlanCollaborator, PlanComment } from '@/services/collaborativeRecoveryPlanService';
import { toast } from 'sonner';

export function useCollaborativeRecoveryPlan() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<CollaborativeRecoveryPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPlans();
    }
  }, [user]);

  const loadPlans = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const _userPlans = await CollaborativeRecoveryPlanService.getUserPlans(user.id);
      setPlans(_userPlans);
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error('Failed to load recovery plans');
    } finally {
      setLoading(false);
    }
  };

  const createPlan = async (_planData: { title: string; description: string }) => {
    try {
      const newPlan = await CollaborativeRecoveryPlanService.createPlan(_planData);
      if (newPlan) {
        setPlans(prev => [newPlan, ...prev]);
        toast.success('Recovery plan created successfully');
        return newPlan;
      }
    } catch (error) {
      console.error('Error creating plan:', error);
      toast.error('Failed to create recovery plan');
    }
    return null;
  };

  const updatePlan = async (_planId: string, updates: Partial<CollaborativeRecoveryPlan>) => {
    try {
      const success = await CollaborativeRecoveryPlanService.updatePlan(_planId, updates);
      if (success) {
        setPlans(prev => prev.map(plan => 
          plan.id === _planId ? { ...plan, ...updates } : plan
        ));
        toast.success('Plan updated successfully');
      }
      return success;
    } catch (error) {
      console.error('Error updating plan:', error);
      toast.error('Failed to update plan');
      return false;
    }
  };

  const shareWithProvider = async (_planId: string, _providerEmail: string, _accessLevel: 'read' | 'write') => {
    if (!user) return false;
    
    try {
      const success = await CollaborativeRecoveryPlanService.shareWithProvider(
        _planId, 
        _providerEmail, 
        _accessLevel, 
        user.id
      );
      if (success) {
        toast.success('Plan shared with provider successfully');
        await loadPlans(); // Refresh plans to show collaboration status
      }
      return success;
    } catch (error) {
      console.error('Error sharing plan:', error);
      toast.error('Failed to share plan with provider');
      return false;
    }
  };

  return {
    plans,
    loading,
    createPlan,
    updatePlan,
    shareWithProvider,
    refreshPlans: loadPlans
  };
}

export function usePlanCollaborators(_planId: string | null) {
  const [collaborators, setCollaborators] = useState<PlanCollaborator[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (_planId) {
      loadCollaborators();
    }
  }, [_planId]);

  const loadCollaborators = async () => {
    if (!_planId) return;
    
    setLoading(true);
    try {
      const _planCollaborators = await CollaborativeRecoveryPlanService.getCollaborators(_planId);
      setCollaborators(_planCollaborators);
    } catch (error) {
      console.error('Error loading collaborators:', error);
      toast.error('Failed to load collaborators');
    } finally {
      setLoading(false);
    }
  };

  const respondToInvitation = async (_collaboratorId: string, response: 'accepted' | 'declined') => {
    if (!_planId) return false;
    
    try {
      const success = await CollaborativeRecoveryPlanService.respondToInvitation(
        _collaboratorId, 
        _planId, 
        response
      );
      if (success) {
        toast.success(`Invitation ${response} successfully`);
        await loadCollaborators();
      }
      return success;
    } catch (error) {
      console.error('Error responding to invitation:', error);
      toast.error('Failed to respond to invitation');
      return false;
    }
  };

  return {
    collaborators,
    loading,
    respondToInvitation,
    refreshCollaborators: loadCollaborators
  };
}

export function usePlanComments(_planId: string | null) {
  const [comments, setComments] = useState<PlanComment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (_planId) {
      loadComments();
    }
  }, [_planId]);

  const loadComments = async () => {
    if (!_planId) return;
    
    setLoading(true);
    try {
      const _planComments = await CollaborativeRecoveryPlanService.getComments(_planId);
      setComments(_planComments);
    } catch (error) {
      console.error('Error loading comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (_content: string, commentType: string = 'general') => {
    if (!_planId) return null;
    
    try {
      const newComment = await CollaborativeRecoveryPlanService.addComment(
        _planId, 
        _content, 
        commentType
      );
      if (newComment) {
        setComments(prev => [newComment, ...prev]);
        toast.success('Comment added successfully');
      }
      return newComment;
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
      return null;
    }
  };

  return {
    comments,
    loading,
    addComment,
    refreshComments: loadComments
  };
}

export function useProviderTemplates() {
  const [templates, setTemplates] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const _providerTemplates = await CollaborativeRecoveryPlanService.getProviderTemplates();
      setTemplates(_providerTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load provider templates');
    } finally {
      setLoading(false);
    }
  };

  const createPlanFromTemplate = async (_templateId: string, _customizations: unknown) => {
    try {
      const newPlan = await CollaborativeRecoveryPlanService.createPlanFromTemplate(
        _templateId, 
        _customizations
      );
      if (newPlan) {
        toast.success('Plan created from template successfully');
      }
      return newPlan;
    } catch (error) {
      console.error('Error creating plan from template:', error);
      toast.error('Failed to create plan from template');
      return null;
    }
  };

  return {
    templates,
    loading,
    createPlanFromTemplate,
    refreshTemplates: loadTemplates
  };
}