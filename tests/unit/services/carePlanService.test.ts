// Jest provides describe, it, expect, beforeEach globally
import { CarePlanService } from '@/services/carePlanService';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn()
    },
    from: jest.fn(() => ({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis()
    }))
  }
}));

describe('CarePlanService', () => {
  const mockUser = { id: 'provider-123', email: 'provider@test.com' };
  const mockPatient = { id: 'patient-456', email: 'patient@test.com' };

  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: mockUser } });
  });

  describe('Care Plan CRUD Operations', () => {
    it('should create a new care plan with proper fields', async () => {
      const mockCarePlan = {
        id: 'plan-789',
        patient_id: mockPatient.id,
        provider_id: mockUser.id,
        title: 'Substance Recovery Plan',
        description: 'Comprehensive recovery program',
        status: 'active' as const,
        start_date: '2025-02-01',
        version: 1,
        created_by: mockUser.id,
        updated_by: mockUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const fromMock = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCarePlan, error: null })
      };

      (supabase.from as any).mockReturnValue(fromMock);

      const result = await CarePlanService.createCarePlan({
        patient_id: mockPatient.id,
        provider_id: mockUser.id,
        title: 'Substance Recovery Plan',
        description: 'Comprehensive recovery program',
        status: 'active',
        start_date: '2025-02-01'
      });

      expect(result).toEqual(mockCarePlan);
      expect(fromMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          patient_id: mockPatient.id,
          created_by: mockUser.id,
          updated_by: mockUser.id
        })
      );
    });

    it('should retrieve provider care plans with proper filtering', async () => {
      const mockPlans = [
        { id: 'plan-1', title: 'Plan 1', status: 'active' },
        { id: 'plan-2', title: 'Plan 2', status: 'draft' }
      ];

      const fromMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockPlans, error: null })
      };

      (supabase.from as any).mockReturnValue(fromMock);

      const result = await CarePlanService.getProviderCarePlans(mockUser.id);

      expect(result).toEqual(mockPlans);
      expect(fromMock.eq).toHaveBeenCalledWith('provider_id', mockUser.id);
      expect(fromMock.order).toHaveBeenCalledWith('updated_at', { ascending: false });
    });

    it('should update care plan with version tracking', async () => {
      const updates = { status: 'completed' as const };
      const updatedPlan = {
        id: 'plan-789',
        ...updates,
        updated_by: mockUser.id,
        updated_at: expect.any(String)
      };

      const fromMock = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: updatedPlan, error: null })
      };

      (supabase.from as any).mockReturnValue(fromMock);

      const result = await CarePlanService.updateCarePlan('plan-789', updates);

      expect(result).toEqual(updatedPlan);
      expect(fromMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ...updates,
          updated_by: mockUser.id
        })
      );
    });

    it('should archive care plans properly', async () => {
      const fromMock = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      };

      (supabase.from as any).mockReturnValue(fromMock);

      await CarePlanService.archiveCarePlan('plan-789');

      expect(fromMock.update).toHaveBeenCalledWith({ status: 'archived' });
      expect(fromMock.eq).toHaveBeenCalledWith('id', 'plan-789');
    });
  });

  describe('Care Plan Goals Management', () => {
    it('should add goals to care plans', async () => {
      const mockGoal = {
        id: 'goal-123',
        care_plan_id: 'plan-789',
        title: 'Complete detox program',
        status: 'pending' as const,
        priority: 1,
        progress_percentage: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const fromMock = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockGoal, error: null })
      };

      (supabase.from as any).mockReturnValue(fromMock);

      const result = await CarePlanService.addGoal({
        care_plan_id: 'plan-789',
        title: 'Complete detox program',
        status: 'pending',
        priority: 1,
        progress_percentage: 0
      });

      expect(result).toEqual(mockGoal);
    });

    it('should update goal progress and auto-complete at 100%', async () => {
      const updatedGoal = {
        id: 'goal-123',
        progress_percentage: 100,
        status: 'completed',
        completed_at: expect.any(String)
      };

      const fromMock = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: updatedGoal, error: null })
      };

      (supabase.from as any).mockReturnValue(fromMock);

      const result = await CarePlanService.updateGoalProgress('goal-123', 100, 'Goal achieved!');

      expect(result).toEqual(updatedGoal);
      expect(fromMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          progress_percentage: 100,
          status: 'completed',
          last_update_note: 'Goal achieved!'
        })
      );
    });

    it('should retrieve goals sorted by priority', async () => {
      const mockGoals = [
        { id: 'goal-1', priority: 3, title: 'High priority' },
        { id: 'goal-2', priority: 1, title: 'Low priority' }
      ];

      const fromMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockGoals, error: null })
      };

      (supabase.from as any).mockReturnValue(fromMock);

      const result = await CarePlanService.getCarePlanGoals('plan-789');

      expect(result).toEqual(mockGoals);
      expect(fromMock.order).toHaveBeenCalledWith('priority', { ascending: false });
    });
  });

  describe('Progress Notes', () => {
    it('should add progress notes with proper metadata', async () => {
      const mockNote = {
        id: 'note-456',
        care_plan_id: 'plan-789',
        provider_id: mockUser.id,
        note_type: 'progress' as const,
        note_text: 'Patient showing improvement',
        mood_score: 7,
        engagement_level: 'high' as const,
        created_at: new Date().toISOString()
      };

      const fromMock = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockNote, error: null })
      };

      (supabase.from as any).mockReturnValue(fromMock);

      const result = await CarePlanService.addProgressNote({
        care_plan_id: 'plan-789',
        provider_id: mockUser.id,
        note_type: 'progress',
        note_text: 'Patient showing improvement',
        mood_score: 7,
        engagement_level: 'high'
      });

      expect(result).toEqual(mockNote);
    });

    it('should retrieve progress notes in chronological order', async () => {
      const mockNotes = [
        { id: 'note-1', created_at: '2025-02-02' },
        { id: 'note-2', created_at: '2025-02-01' }
      ];

      const fromMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: mockNotes, error: null })
      };

      (supabase.from as any).mockReturnValue(fromMock);

      const result = await CarePlanService.getProgressNotes('plan-789');

      expect(result).toEqual(mockNotes);
      expect(fromMock.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  describe('Analytics and Statistics', () => {
    it('should calculate provider care plan statistics', async () => {
      const mockPlans = [
        { status: 'active' },
        { status: 'active' },
        { status: 'draft' },
        { status: 'completed' },
        { status: 'paused' }
      ];

      const fromMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockPlans, error: null })
      };

      (supabase.from as any).mockReturnValue(fromMock);

      const stats = await CarePlanService.getProviderCarePlanStats(mockUser.id);

      expect(stats).toEqual({
        total: 5,
        active: 2,
        draft: 1,
        completed: 1,
        paused: 1
      });
    });

    it('should calculate goal completion rate', async () => {
      const mockGoals = [
        { status: 'completed' },
        { status: 'completed' },
        { status: 'in_progress' },
        { status: 'pending' }
      ];

      const fromMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockGoals, error: null })
      };

      (supabase.from as any).mockReturnValue(fromMock);

      const completionRate = await CarePlanService.getGoalCompletionRate('plan-789');

      expect(completionRate).toBe(50); // 2 out of 4 completed
    });

    it('should identify plans requiring review', async () => {
      const mockPlans = [
        { id: 'plan-1', review_date: '2025-01-15' },
        { id: 'plan-2', review_date: '2025-01-20' }
      ];

      const fromMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockPlans, error: null })
      };

      (supabase.from as any).mockReturnValue(fromMock);

      const plansToReview = await CarePlanService.getPlansRequiringReview(mockUser.id);

      expect(plansToReview).toEqual(mockPlans);
      expect(fromMock.eq).toHaveBeenCalledWith('status', 'active');
    });
  });

  describe('Care Plan Cloning', () => {
    it('should clone care plan with goals for new patient', async () => {
      const originalPlan = {
        id: 'original-plan',
        title: 'Template Plan',
        description: 'Standard recovery template',
        status: 'active' as const,
        provider_id: mockUser.id
      };

      const originalGoals = [
        { id: 'goal-1', title: 'Goal 1', status: 'completed' },
        { id: 'goal-2', title: 'Goal 2', status: 'in_progress' }
      ];

      const newPlan = { ...originalPlan, id: 'new-plan', patient_id: 'new-patient' };

      // Mock the sequence of calls
      let callCount = 0;
      const fromMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: originalPlan, error: null }),
        order: jest.fn().mockResolvedValue({ data: originalGoals, error: null }),
        insert: jest.fn().mockReturnThis()
      };

      // Simulate different returns for different calls
      fromMock.single.mockImplementation(() => {
        if (callCount++ === 0) {
          return Promise.resolve({ data: originalPlan, error: null });
        }
        return Promise.resolve({ data: newPlan, error: null });
      });

      (supabase.from as any).mockReturnValue(fromMock);

      const result = await CarePlanService.cloneCarePlan(
        'original-plan',
        'new-patient',
        { title: 'Customized Plan' }
      );

      expect(result.patient_id).toBe('new-patient');
      expect(result.status).toBe('draft'); // New clones start as draft
    });
  });
});