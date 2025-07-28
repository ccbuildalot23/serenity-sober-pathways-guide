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
      const userPlans = await CollaborativeRecoveryPlanService.getUserPlans(user.id);
      setPlans(userPlans);
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error('Failed to load recovery plans');
    } finally {
      setLoading(false);
    }
  };

  const createPlan = async (planData: { title: string; description: string }) => {
    try {
      const newPlan = await CollaborativeRecoveryPlanService.createPlan(planData);
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

  const updatePlan = async (planId: string, updates: Partial<CollaborativeRecoveryPlan>) => {
    try {
      const success = await CollaborativeRecoveryPlanService.updatePlan(planId, updates);
      if (success) {
        setPlans(prev => prev.map(plan => 
          plan.id === planId ? { ...plan, ...updates } : plan
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

  const shareWithProvider = async (planId: string, providerEmail: string, accessLevel: 'read' | 'write') => {
    if (!user) return false;
    
    try {
      const success = await CollaborativeRecoveryPlanService.shareWithProvider(
        planId, 
        providerEmail, 
        accessLevel, 
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

export function usePlanCollaborators(planId: string | null) {
  const [collaborators, setCollaborators] = useState<PlanCollaborator[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (planId) {
      loadCollaborators();
    }
  }, [planId]);

  const loadCollaborators = async () => {
    if (!planId) return;
    
    setLoading(true);
    try {
      const planCollaborators = await CollaborativeRecoveryPlanService.getCollaborators(planId);
      setCollaborators(planCollaborators);
    } catch (error) {
      console.error('Error loading collaborators:', error);
      toast.error('Failed to load collaborators');
    } finally {
      setLoading(false);
    }
  };

  const respondToInvitation = async (collaboratorId: string, response: 'accepted' | 'declined') => {
    if (!planId) return false;
    
    try {
      const success = await CollaborativeRecoveryPlanService.respondToInvitation(
        collaboratorId, 
        planId, 
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

export function usePlanComments(planId: string | null) {
  const [comments, setComments] = useState<PlanComment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (planId) {
      loadComments();
    }
  }, [planId]);

  const loadComments = async () => {
    if (!planId) return;
    
    setLoading(true);
    try {
      const planComments = await CollaborativeRecoveryPlanService.getComments(planId);
      setComments(planComments);
    } catch (error) {
      console.error('Error loading comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (content: string, commentType: string = 'general') => {
    if (!planId) return null;
    
    try {
      const newComment = await CollaborativeRecoveryPlanService.addComment(
        planId, 
        content, 
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
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const providerTemplates = await CollaborativeRecoveryPlanService.getProviderTemplates();
      setTemplates(providerTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load provider templates');
    } finally {
      setLoading(false);
    }
  };

  const createPlanFromTemplate = async (templateId: string, customizations: any) => {
    try {
      const newPlan = await CollaborativeRecoveryPlanService.createPlanFromTemplate(
        templateId, 
        customizations
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