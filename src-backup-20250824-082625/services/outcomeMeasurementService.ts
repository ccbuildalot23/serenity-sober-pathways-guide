import { supabase } from '@/integrations/supabase/client';
import logger from './loggerService';

/**
 * Evidence-Based Outcome Measurement Service
 * 
 * Implements validated assessment tools for mental health and substance use
 * Tracks progress over time and generates clinical reports
 */

export interface AssessmentTool {
  id: string;
  name: string;
  abbreviation: string;
  description: string;
  questions: AssessmentQuestion[];
  scoringMethod: 'sum' | 'average' | 'custom';
  interpretations: ScoreInterpretation[];
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  category: 'depression' | 'anxiety' | 'ptsd' | 'substance' | 'functioning' | 'other';
}

export interface AssessmentQuestion {
  id: string;
  text: string;
  options: AnswerOption[];
  required: boolean;
}

export interface AnswerOption {
  value: number;
  label: string;
  description?: string;
}

export interface ScoreInterpretation {
  minScore: number;
  maxScore: number;
  severity: 'none' | 'mild' | 'moderate' | 'moderately_severe' | 'severe';
  description: string;
  clinicalAction?: string;
}

export interface AssessmentResponse {
  id: string;
  userId: string;
  toolId: string;
  responses: Record<string, number>;
  totalScore: number;
  severity: string;
  completedAt: Date;
  sessionId?: string;
}

export interface ProgressReport {
  userId: string;
  toolId: string;
  startDate: Date;
  endDate: Date;
  assessments: AssessmentResponse[];
  trend: 'improving' | 'stable' | 'worsening';
  changePercent: number;
  clinicalSummary: string;
}

class OutcomeMeasurementService {
  private assessmentTools: Map<string, AssessmentTool> = new Map();

  constructor() {
    this.initializeAssessmentTools();
  }

  /**
   * Initialize standard assessment tools
   */
  private initializeAssessmentTools() {
    // PHQ-9 (Patient Health Questionnaire - Depression)
    this.assessmentTools.set('phq9', {
      id: 'phq9',
      name: 'Patient Health Questionnaire-9',
      abbreviation: 'PHQ-9',
      description: 'Measures depression severity',
      questions: [
        {
          id: 'phq9_1',
          text: 'Little interest or pleasure in doing things',
          options: this.getStandardOptions(),
          required: true
        },
        {
          id: 'phq9_2',
          text: 'Feeling down, depressed, or hopeless',
          options: this.getStandardOptions(),
          required: true
        },
        {
          id: 'phq9_3',
          text: 'Trouble falling or staying asleep, or sleeping too much',
          options: this.getStandardOptions(),
          required: true
        },
        {
          id: 'phq9_4',
          text: 'Feeling tired or having little energy',
          options: this.getStandardOptions(),
          required: true
        },
        {
          id: 'phq9_5',
          text: 'Poor appetite or overeating',
          options: this.getStandardOptions(),
          required: true
        },
        {
          id: 'phq9_6',
          text: 'Feeling bad about yourself or that you are a failure',
          options: this.getStandardOptions(),
          required: true
        },
        {
          id: 'phq9_7',
          text: 'Trouble concentrating on things',
          options: this.getStandardOptions(),
          required: true
        },
        {
          id: 'phq9_8',
          text: 'Moving or speaking slowly, or being fidgety/restless',
          options: this.getStandardOptions(),
          required: true
        },
        {
          id: 'phq9_9',
          text: 'Thoughts that you would be better off dead or of hurting yourself',
          options: this.getStandardOptions(),
          required: true
        }
      ],
      scoringMethod: 'sum',
      interpretations: [
        { minScore: 0, maxScore: 4, severity: 'none', description: 'Minimal depression', clinicalAction: 'Continue monitoring' },
        { minScore: 5, maxScore: 9, severity: 'mild', description: 'Mild depression', clinicalAction: 'Watchful waiting; repeat PHQ-9 at follow-up' },
        { minScore: 10, maxScore: 14, severity: 'moderate', description: 'Moderate depression', clinicalAction: 'Treatment plan, considering counseling, follow-up and/or pharmacotherapy' },
        { minScore: 15, maxScore: 19, severity: 'moderately_severe', description: 'Moderately severe depression', clinicalAction: 'Active treatment with pharmacotherapy and/or psychotherapy' },
        { minScore: 20, maxScore: 27, severity: 'severe', description: 'Severe depression', clinicalAction: 'Immediate initiation of pharmacotherapy and/or psychotherapy; frequent follow-up' }
      ],
      frequency: 'biweekly',
      category: 'depression'
    });

    // GAD-7 (Generalized Anxiety Disorder)
    this.assessmentTools.set('gad7', {
      id: 'gad7',
      name: 'Generalized Anxiety Disorder-7',
      abbreviation: 'GAD-7',
      description: 'Measures anxiety severity',
      questions: [
        {
          id: 'gad7_1',
          text: 'Feeling nervous, anxious, or on edge',
          options: this.getStandardOptions(),
          required: true
        },
        {
          id: 'gad7_2',
          text: 'Not being able to stop or control worrying',
          options: this.getStandardOptions(),
          required: true
        },
        {
          id: 'gad7_3',
          text: 'Worrying too much about different things',
          options: this.getStandardOptions(),
          required: true
        },
        {
          id: 'gad7_4',
          text: 'Trouble relaxing',
          options: this.getStandardOptions(),
          required: true
        },
        {
          id: 'gad7_5',
          text: 'Being so restless that it is hard to sit still',
          options: this.getStandardOptions(),
          required: true
        },
        {
          id: 'gad7_6',
          text: 'Becoming easily annoyed or irritable',
          options: this.getStandardOptions(),
          required: true
        },
        {
          id: 'gad7_7',
          text: 'Feeling afraid as if something awful might happen',
          options: this.getStandardOptions(),
          required: true
        }
      ],
      scoringMethod: 'sum',
      interpretations: [
        { minScore: 0, maxScore: 4, severity: 'none', description: 'Minimal anxiety', clinicalAction: 'No action needed' },
        { minScore: 5, maxScore: 9, severity: 'mild', description: 'Mild anxiety', clinicalAction: 'Monitor' },
        { minScore: 10, maxScore: 14, severity: 'moderate', description: 'Moderate anxiety', clinicalAction: 'Consider therapy and/or medication' },
        { minScore: 15, maxScore: 21, severity: 'severe', description: 'Severe anxiety', clinicalAction: 'Active treatment recommended' }
      ],
      frequency: 'weekly',
      category: 'anxiety'
    });

    // PCL-5 (PTSD Checklist)
    this.assessmentTools.set('pcl5', {
      id: 'pcl5',
      name: 'PTSD Checklist for DSM-5',
      abbreviation: 'PCL-5',
      description: 'Measures PTSD symptom severity',
      questions: this.getPCL5Questions(),
      scoringMethod: 'sum',
      interpretations: [
        { minScore: 0, maxScore: 30, severity: 'none', description: 'Below threshold', clinicalAction: 'No PTSD indicated' },
        { minScore: 31, maxScore: 50, severity: 'mild', description: 'Mild PTSD symptoms', clinicalAction: 'Monitor and consider treatment' },
        { minScore: 51, maxScore: 80, severity: 'severe', description: 'Probable PTSD', clinicalAction: 'Treatment strongly recommended' }
      ],
      frequency: 'monthly',
      category: 'ptsd'
    });

    // AUDIT-C (Alcohol screening)
    this.assessmentTools.set('audit_c', {
      id: 'audit_c',
      name: 'Alcohol Use Disorders Identification Test',
      abbreviation: 'AUDIT-C',
      description: 'Screens for hazardous drinking',
      questions: [
        {
          id: 'audit_1',
          text: 'How often do you have a drink containing alcohol?',
          options: [
            { value: 0, label: 'Never' },
            { value: 1, label: 'Monthly or less' },
            { value: 2, label: '2-4 times a month' },
            { value: 3, label: '2-3 times a week' },
            { value: 4, label: '4 or more times a week' }
          ],
          required: true
        },
        {
          id: 'audit_2',
          text: 'How many drinks do you have on a typical day when drinking?',
          options: [
            { value: 0, label: '1 or 2' },
            { value: 1, label: '3 or 4' },
            { value: 2, label: '5 or 6' },
            { value: 3, label: '7 to 9' },
            { value: 4, label: '10 or more' }
          ],
          required: true
        },
        {
          id: 'audit_3',
          text: 'How often do you have 6 or more drinks on one occasion?',
          options: [
            { value: 0, label: 'Never' },
            { value: 1, label: 'Less than monthly' },
            { value: 2, label: 'Monthly' },
            { value: 3, label: 'Weekly' },
            { value: 4, label: 'Daily or almost daily' }
          ],
          required: true
        }
      ],
      scoringMethod: 'sum',
      interpretations: [
        { minScore: 0, maxScore: 3, severity: 'none', description: 'Low risk', clinicalAction: 'No intervention needed' },
        { minScore: 4, maxScore: 7, severity: 'mild', description: 'Moderate risk', clinicalAction: 'Brief intervention recommended' },
        { minScore: 8, maxScore: 12, severity: 'severe', description: 'High risk', clinicalAction: 'Refer to specialist' }
      ],
      frequency: 'monthly',
      category: 'substance'
    });

    // WHODAS 2.0 (Functioning)
    this.assessmentTools.set('whodas', {
      id: 'whodas',
      name: 'WHO Disability Assessment Schedule',
      abbreviation: 'WHODAS 2.0',
      description: 'Measures functioning and disability',
      questions: this.getWHODASQuestions(),
      scoringMethod: 'average',
      interpretations: [
        { minScore: 0, maxScore: 1, severity: 'none', description: 'No disability', clinicalAction: 'No intervention needed' },
        { minScore: 1.1, maxScore: 2, severity: 'mild', description: 'Mild disability', clinicalAction: 'Monitor functioning' },
        { minScore: 2.1, maxScore: 3, severity: 'moderate', description: 'Moderate disability', clinicalAction: 'Consider support services' },
        { minScore: 3.1, maxScore: 4, severity: 'severe', description: 'Severe disability', clinicalAction: 'Intensive support needed' }
      ],
      frequency: 'monthly',
      category: 'functioning'
    });
  }

  /**
   * Get standard frequency options (PHQ-9/GAD-7)
   */
  private getStandardOptions(): AnswerOption[] {
    return [
      { value: 0, label: 'Not at all' },
      { value: 1, label: 'Several days' },
      { value: 2, label: 'More than half the days' },
      { value: 3, label: 'Nearly every day' }
    ];
  }

  /**
   * Get PCL-5 questions (simplified for brevity)
   */
  private getPCL5Questions(): AssessmentQuestion[] {
    const options: AnswerOption[] = [
      { value: 0, label: 'Not at all' },
      { value: 1, label: 'A little bit' },
      { value: 2, label: 'Moderately' },
      { value: 3, label: 'Quite a bit' },
      { value: 4, label: 'Extremely' }
    ];

    return [
      { id: 'pcl5_1', text: 'Repeated disturbing memories of the stressful experience', options, required: true },
      { id: 'pcl5_2', text: 'Repeated disturbing dreams of the stressful experience', options, required: true },
      { id: 'pcl5_3', text: 'Suddenly feeling as if the stressful experience were happening again', options, required: true },
      { id: 'pcl5_4', text: 'Feeling very upset when reminded of the stressful experience', options, required: true },
      { id: 'pcl5_5', text: 'Having strong physical reactions when reminded', options, required: true },
      // ... Additional 15 questions for full PCL-5
    ];
  }

  /**
   * Get WHODAS questions (simplified)
   */
  private getWHODASQuestions(): AssessmentQuestion[] {
    const options: AnswerOption[] = [
      { value: 0, label: 'None' },
      { value: 1, label: 'Mild' },
      { value: 2, label: 'Moderate' },
      { value: 3, label: 'Severe' },
      { value: 4, label: 'Extreme/Cannot do' }
    ];

    return [
      { id: 'whodas_1', text: 'Concentrating on doing something for ten minutes?', options, required: true },
      { id: 'whodas_2', text: 'Remembering to do important things?', options, required: true },
      { id: 'whodas_3', text: 'Learning a new task?', options, required: true },
      { id: 'whodas_4', text: 'Standing for long periods?', options, required: true },
      { id: 'whodas_5', text: 'Taking care of household responsibilities?', options, required: true },
      // ... Additional questions
    ];
  }

  /**
   * Administer assessment to user
   */
  async administerAssessment(
    userId: string,
    toolId: string,
    sessionId?: string
  ): Promise<AssessmentTool> {
    const tool = this.assessmentTools.get(toolId);
    if (!tool) {
      throw new Error(`Assessment tool ${toolId} not found`);
    }

    // Log assessment start
    await supabase.from('assessment_logs').insert({
      user_id: userId,
      tool_id: toolId,
      session_id: sessionId,
      started_at: new Date().toISOString(),
      status: 'started'
    });

    return tool;
  }

  /**
   * Score assessment responses
   */
  async scoreAssessment(
    userId: string,
    toolId: string,
    responses: Record<string, number>
  ): Promise<AssessmentResponse> {
    const tool = this.assessmentTools.get(toolId);
    if (!tool) {
      throw new Error(`Assessment tool ${toolId} not found`);
    }

    // Calculate total score
    let totalScore = 0;
    if (tool.scoringMethod === 'sum') {
      totalScore = Object.values(responses).reduce((sum, val) => sum + val, 0);
    } else if (tool.scoringMethod === 'average') {
      const values = Object.values(responses);
      totalScore = values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    // Determine severity
    const interpretation = tool.interpretations.find(
      i => totalScore >= i.minScore && totalScore <= i.maxScore
    );

    const assessmentResponse: AssessmentResponse = {
      id: `${userId}_${toolId}_${Date.now()}`,
      userId,
      toolId,
      responses,
      totalScore,
      severity: interpretation?.severity || 'unknown',
      completedAt: new Date()
    };

    // Save to database
    const { data, error } = await supabase
      .from('assessment_responses')
      .insert({
        ...assessmentResponse,
        completed_at: assessmentResponse.completedAt.toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Check for critical responses (e.g., suicidal ideation)
    await this.checkCriticalResponses(userId, toolId, responses);

    // Generate clinical alerts if needed
    if (interpretation?.severity === 'severe') {
      await this.generateClinicalAlert(userId, toolId, totalScore, interpretation);
    }

    return data as AssessmentResponse;
  }

  /**
   * Check for critical responses requiring immediate attention
   */
  private async checkCriticalResponses(
    userId: string,
    toolId: string,
    responses: Record<string, number>
  ): Promise<void> {
    // PHQ-9 Question 9 (suicidal ideation)
    if (toolId === 'phq9' && responses['phq9_9'] > 0) {
      await this.triggerCrisisProtocol(userId, 'suicidal_ideation', responses['phq9_9']);
    }

    // Check for other critical indicators
    const criticalPatterns = {
      phq9: { threshold: 20, type: 'severe_depression' },
      gad7: { threshold: 15, type: 'severe_anxiety' },
      pcl5: { threshold: 51, type: 'probable_ptsd' },
      audit_c: { threshold: 8, type: 'alcohol_use_disorder' }
    };

    const pattern = criticalPatterns[toolId as keyof typeof criticalPatterns];
    if (pattern) {
      const score = Object.values(responses).reduce((sum, val) => sum + val, 0);
      if (score >= pattern.threshold) {
        await this.generateClinicalAlert(userId, toolId, score, {
          severity: 'severe',
          description: pattern.type,
          clinicalAction: 'Immediate clinical review required'
        } as any);
      }
    }
  }

  /**
   * Trigger crisis protocol for high-risk responses
   */
  private async triggerCrisisProtocol(
    userId: string,
    type: string,
    severity: number
  ): Promise<void> {
    // Create crisis alert
    await supabase.from('crisis_alerts').insert({
      user_id: userId,
      alert_type: type,
      severity_level: severity >= 2 ? 'high' : 'moderate',
      triggered_by: 'assessment',
      timestamp: new Date().toISOString(),
      requires_immediate_action: severity >= 2
    });

    // Notify provider
    const { data: provider } = await supabase
      .from('user_providers')
      .select('provider_id')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .single();

    if (provider) {
      await supabase.from('provider_notifications').insert({
        provider_id: provider.provider_id,
        type: 'crisis_alert',
        priority: 'urgent',
        message: `Patient requires immediate attention: ${type}`,
        patient_id: userId,
        created_at: new Date().toISOString()
      });
    }

    // Notify emergency contacts if severity is high
    if (severity >= 2) {
      const { data: contacts } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', userId)
        .eq('priority', 1);

      if (contacts) {
        for (const contact of contacts) {
          // Send notifications (SMS/email implementation)
          logger.debug('Notifying emergency contact:', contact, { component: 'outcomeMeasurementService' });
        }
      }
    }
  }

  /**
   * Generate clinical alert for provider
   */
  private async generateClinicalAlert(
    userId: string,
    toolId: string,
    score: number,
    interpretation: any
  ): Promise<void> {
    await supabase.from('clinical_alerts').insert({
      user_id: userId,
      tool_id: toolId,
      score,
      severity: interpretation.severity,
      description: interpretation.description,
      clinical_action: interpretation.clinicalAction,
      created_at: new Date().toISOString(),
      acknowledged: false
    });
  }

  /**
   * Generate progress report
   */
  async generateProgressReport(
    userId: string,
    toolId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ProgressReport> {
    // Fetch assessments in date range
    const { data: assessments } = await supabase
      .from('assessment_responses')
      .select('*')
      .eq('user_id', userId)
      .eq('tool_id', toolId)
      .gte('completed_at', startDate.toISOString())
      .lte('completed_at', endDate.toISOString())
      .order('completed_at', { ascending: true });

    if (!assessments || assessments.length < 2) {
      throw new Error('Insufficient data for progress report');
    }

    // Calculate trend
    const firstScore = assessments[0].total_score;
    const lastScore = assessments[assessments.length - 1].total_score;
    const changePercent = ((lastScore - firstScore) / firstScore) * 100;

    let trend: ProgressReport['trend'] = 'stable';
    if (changePercent < -20) trend = 'improving';
    else if (changePercent > 20) trend = 'worsening';

    // Generate clinical summary
    const tool = this.assessmentTools.get(toolId);
    const clinicalSummary = this.generateClinicalSummary(
      tool!,
      assessments,
      trend,
      changePercent
    );

    const report: ProgressReport = {
      userId,
      toolId,
      startDate,
      endDate,
      assessments: assessments.map(a => ({
        ...a,
        completedAt: new Date(a.completed_at)
      })),
      trend,
      changePercent,
      clinicalSummary
    };

    // Save report
    await supabase.from('progress_reports').insert({
      user_id: userId,
      tool_id: toolId,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      trend,
      change_percent: changePercent,
      clinical_summary: clinicalSummary,
      generated_at: new Date().toISOString()
    });

    return report;
  }

  /**
   * Generate clinical summary
   */
  private generateClinicalSummary(
    tool: AssessmentTool,
    assessments: any[],
    trend: string,
    changePercent: number
  ): string {
    const firstSeverity = assessments[0].severity;
    const lastSeverity = assessments[assessments.length - 1].severity;
    
    let summary = `Patient completed ${assessments.length} ${tool.abbreviation} assessments. `;
    
    if (trend === 'improving') {
      summary += `Symptoms show significant improvement (${Math.abs(changePercent).toFixed(1)}% reduction). `;
    } else if (trend === 'worsening') {
      summary += `Symptoms show deterioration (${changePercent.toFixed(1)}% increase). Consider treatment adjustment. `;
    } else {
      summary += `Symptoms remain relatively stable. `;
    }

    if (firstSeverity !== lastSeverity) {
      summary += `Severity changed from ${firstSeverity} to ${lastSeverity}. `;
    }

    // Add recommendations
    const lastInterpretation = tool.interpretations.find(
      i => assessments[assessments.length - 1].total_score >= i.minScore &&
           assessments[assessments.length - 1].total_score <= i.maxScore
    );

    if (lastInterpretation?.clinicalAction) {
      summary += `Recommended action: ${lastInterpretation.clinicalAction}`;
    }

    return summary;
  }

  /**
   * Get assessment schedule for user
   */
  async getAssessmentSchedule(userId: string): Promise<Array<{
    toolId: string;
    nextDue: Date;
    overdue: boolean;
  }>> {
    const schedule = [];

    for (const [toolId, tool] of this.assessmentTools) {
      // Get last assessment
      const { data: lastAssessment } = await supabase
        .from('assessment_responses')
        .select('completed_at')
        .eq('user_id', userId)
        .eq('tool_id', toolId)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      let nextDue = new Date();
      
      if (lastAssessment) {
        const lastDate = new Date(lastAssessment.completed_at);
        
        // Calculate next due date based on frequency
        switch (tool.frequency) {
          case 'daily':
            nextDue = new Date(lastDate.getTime() + 24 * 60 * 60 * 1000);
            break;
          case 'weekly':
            nextDue = new Date(lastDate.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
          case 'biweekly':
            nextDue = new Date(lastDate.getTime() + 14 * 24 * 60 * 60 * 1000);
            break;
          case 'monthly':
            nextDue = new Date(lastDate.getTime() + 30 * 24 * 60 * 60 * 1000);
            break;
        }
      }

      schedule.push({
        toolId,
        nextDue,
        overdue: nextDue < new Date()
      });
    }

    return schedule;
  }

  /**
   * Export assessment data for external systems
   */
  async exportAssessmentData(
    userId: string,
    format: 'json' | 'csv' | 'fhir'
  ): Promise<string> {
    const { data: assessments } = await supabase
      .from('assessment_responses')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (!assessments) {
      throw new Error('No assessment data found');
    }

    switch (format) {
      case 'json':
        return JSON.stringify(assessments, null, 2);
      
      case 'csv':
        return this.convertToCSV(assessments);
      
      case 'fhir':
        return this.convertToFHIR(assessments);
      
      default:
        throw new Error('Unsupported format');
    }
  }

  /**
   * Convert assessments to CSV
   */
  private convertToCSV(assessments: any[]): string {
    if (assessments.length === 0) return '';

    const headers = Object.keys(assessments[0]).join(',');
    const rows = assessments.map(a => Object.values(a).join(','));
    
    return [headers, ...rows].join('\n');
  }

  /**
   * Convert to FHIR format (simplified)
   */
  private convertToFHIR(assessments: any[]): string {
    const bundle = {
      resourceType: 'Bundle',
      type: 'collection',
      entry: assessments.map(a => ({
        resource: {
          resourceType: 'Observation',
          id: a.id,
          status: 'final',
          code: {
            coding: [{
              system: 'http://loinc.org',
              code: this.getLOINCCode(a.tool_id),
              display: a.tool_id
            }]
          },
          subject: { reference: `Patient/${a.user_id}` },
          effectiveDateTime: a.completed_at,
          valueQuantity: {
            value: a.total_score,
            unit: 'score'
          }
        }
      }))
    };

    return JSON.stringify(bundle, null, 2);
  }

  /**
   * Get LOINC code for assessment tool
   */
  private getLOINCCode(toolId: string): string {
    const codes: Record<string, string> = {
      phq9: '44249-1',
      gad7: '70274-6',
      pcl5: '97006-2',
      audit_c: '75624-7',
      whodas: '89222-1'
    };
    
    return codes[toolId] || 'unknown';
  }
}

// Export singleton instance
export const outcomeMeasurementService = new OutcomeMeasurementService();