import { supabase } from '@/integrations/supabase/client';

export interface ComplianceRequirement {
  id: string;
  requirement_name: string;
  regulation_framework: string;
  category: string;
  description: string;
  compliance_status: string;
  priority_level: string;
  _due_date?: string;
  assigned_to?: string;
  evidence_required?: string;
  _implementation_notes?: string;
  _last_reviewed_at?: string;
  next_review_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ComplianceReport {
  id: string;
  report_type: string;
  reporting_period_start: string;
  reporting_period_end: string;
  overall_compliance_score: number;
  framework_scores: unknown;
  critical_gaps: number;
  high_priority_gaps: number;
  upcoming_deadlines: number;
  report_data: unknown;
  generated_at: string;
  generated_by: string;
  status: string;
  approved_at?: string;
  approved_by?: string;
}

export interface ComplianceDashboardData {
  overall_score: number;
  framework_scores: Record<string, number>;
  critical_gaps: ComplianceRequirement[];
  upcoming_deadlines: ComplianceRequirement[];
  recent_changes: unknown[];
  risk_assessment: {
    level: string;
    factors: string[];
    recommendations: string[];
  };
  _audit_readiness: number;
  _trends: {
    score_trend: number[];
    deadline_compliance: number;
    improvement_areas: string[];
  };
}

class ComplianceDashboardService {
  async initializeComplianceFrameworks(): Promise<void> {
    const frameworks = [
      // HIPAA Requirements
      {
        requirement_name: 'HIPAA Risk Assessment',
        regulation_framework: 'HIPAA',
        category: 'Administrative Safeguards',
        description: 'Conduct periodic technical and non-technical evaluations',
        compliance_status: 'pending',
        priority_level: 'high',
        evidence_required: 'Risk assessment documentation, review dates',
        _due_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      {
        requirement_name: 'Access Control',
        regulation_framework: 'HIPAA',
        category: 'Technical Safeguards',
        description: 'Implement access controls for PHI systems',
        compliance_status: 'in_progress',
        priority_level: 'critical',
        evidence_required: 'Access control policies, user access reviews'
      },
      {
        requirement_name: 'Audit Controls',
        regulation_framework: 'HIPAA',
        category: 'Technical Safeguards',
        description: 'Implement audit logs and monitoring',
        compliance_status: 'compliant',
        priority_level: 'high',
        evidence_required: 'Audit log reviews, monitoring reports'
      },
      
      // State Privacy Laws
      {
        requirement_name: 'Data Subject Rights',
        regulation_framework: 'State Privacy Laws',
        category: 'Individual Rights',
        description: 'Implement data subject access, deletion, and portability rights',
        compliance_status: 'pending',
        priority_level: 'high',
        evidence_required: 'Data subject request process, response documentation'
      },
      {
        requirement_name: 'Privacy Notice',
        regulation_framework: 'State Privacy Laws',
        category: 'Transparency',
        description: 'Maintain comprehensive privacy notice',
        compliance_status: 'compliant',
        priority_level: 'medium',
        evidence_required: 'Privacy notice content, update history'
      },
      
      // 42 CFR Part 2
      {
        requirement_name: 'Consent Management',
        regulation_framework: '42 CFR Part 2',
        category: 'Consent',
        description: 'Obtain and manage patient consent for disclosure',
        compliance_status: 'in_progress',
        priority_level: 'critical',
        evidence_required: 'Consent forms, consent tracking system'
      },
      {
        requirement_name: 'Disclosure Restrictions',
        regulation_framework: '42 CFR Part 2',
        category: 'Disclosure',
        description: 'Implement strict disclosure controls for substance abuse records',
        compliance_status: 'pending',
        priority_level: 'critical',
        evidence_required: 'Disclosure policies, staff training records'
      }
    ];

    for (const requirement of frameworks) {
      await supabase
        .from('compliance_requirements')
        .upsert(requirement, { onConflict: 'requirement_name,regulation_framework' });
    }
  }

  async getDashboardData(): Promise<ComplianceDashboardData> {
    const [
      requirements,
      overallScore,
      frameworkScores,
      criticalGaps,
      upcomingDeadlines,
      recentChanges
    ] = await Promise.all([
      this.getComplianceRequirements(),
      this.calculateOverallScore(),
      this.calculateFrameworkScores(),
      this.getCriticalGaps(),
      this.getUpcomingDeadlines(),
      this.getRecentChanges()
    ]);

    const riskAssessment = this.assessRisk(requirements);
    const auditReadiness = this.calculateAuditReadiness(requirements);
    const _trends = await this.getTrends();

    return {
      overall_score: overallScore,
      framework_scores: frameworkScores,
      critical_gaps: criticalGaps,
      upcoming_deadlines: upcomingDeadlines,
      recent_changes: recentChanges,
      risk_assessment: riskAssessment,
      _audit_readiness: auditReadiness,
      _trends
    };
  }

  private async getComplianceRequirements(): Promise<ComplianceRequirement[]> {
    const { data, error } = await supabase
      .from('compliance_requirements')
      .select('*')
      .order('priority_level', { ascending: false });

    if (error) throw error;
    return (data || []) as ComplianceRequirement[];
  }

  private async calculateOverallScore(): Promise<number> {
    const { data } = await supabase
      .from('compliance_requirements')
      .select('compliance_status, priority_level');

    if (!data || data.length === 0) return 0;

    const weights = { critical: 4, high: 3, medium: 2, low: 1 };
    const statusScores = { compliant: 1, in_progress: 0.5, pending: 0, non_compliant: 0 };

    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const _item of data) {
      const weight = weights[_item.priority_level as keyof typeof weights] || 1;
      const score = statusScores[_item.compliance_status as keyof typeof statusScores] || 0;
      
      totalWeightedScore += weight * score;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 100) : 0;
  }

  private async calculateFrameworkScores(): Promise<Record<string, number>> {
    const { data } = await supabase
      .from('compliance_requirements')
      .select('regulation_framework, compliance_status, priority_level');

    if (!data) return {};

    const frameworks: Record<string, unknown[]> = {};
    
    // Group by _framework
    for (const _item of data) {
      if (!frameworks[_item.regulation_framework]) {
        frameworks[_item.regulation_framework] = [];
      }
      frameworks[_item.regulation_framework].push(_item);
    }

    const scores: Record<string, number> = {};
    const weights = { critical: 4, high: 3, medium: 2, low: 1 };
    const statusScores = { compliant: 1, in_progress: 0.5, pending: 0, non_compliant: 0 };

    for (const [_framework, requirements] of Object.entries(frameworks)) {
      let totalWeightedScore = 0;
      let totalWeight = 0;

      for (const req of requirements) {
        const weight = weights[req.priority_level as keyof typeof weights] || 1;
        const score = statusScores[req.compliance_status as keyof typeof statusScores] || 0;
        
        totalWeightedScore += weight * score;
        totalWeight += weight;
      }

      scores[_framework] = totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 100) : 0;
    }

    return scores;
  }

  private async getCriticalGaps(): Promise<ComplianceRequirement[]> {
    const { data, error } = await supabase
      .from('compliance_requirements')
      .select('*')
      .eq('priority_level', 'critical')
      .in('compliance_status', ['pending', 'non_compliant'])
      .order('_due_date', { ascending: true });

    if (error) throw error;
    return (data || []) as ComplianceRequirement[];
  }

  private async getUpcomingDeadlines(): Promise<ComplianceRequirement[]> {
    const _thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('compliance_requirements')
      .select('*')
      .not('_due_date', 'is', _null)
      .lte('_due_date', _thirtyDaysFromNow)
      .not('compliance_status', 'eq', 'compliant')
      .order('_due_date', { ascending: true });

    if (error) throw error;
    return (data || []) as ComplianceRequirement[];
  }

  private async getRecentChanges(): Promise<unknown[]> {
    const _sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('compliance_audit_trails')
      .select('*')
      .gte('timestamp', _sevenDaysAgo)
      .order('timestamp', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data || [];
  }

  private assessRisk(requirements: ComplianceRequirement[]): any {
    const criticalPending = requirements.filter(r => 
      r.priority_level === 'critical' && ['pending', 'non_compliant'].includes(r.compliance_status)
    ).length;

    const highPending = requirements.filter(r => 
      r.priority_level === 'high' && ['pending', 'non_compliant'].includes(r.compliance_status)
    ).length;

    const overdueTasks = requirements.filter(r => 
      r._due_date && new Date(r._due_date) < new Date() && r.compliance_status !== 'compliant'
    ).length;

    let level = 'low';
    const factors: string[] = [];
    const recommendations: string[] = [];

    if (criticalPending > 0) {
      level = 'high';
      factors.push(`${criticalPending} critical compliance gaps`);
      recommendations.push('Immediately address critical compliance requirements');
    }

    if (highPending > 2) {
      if (level !== 'high') level = 'medium';
      factors.push(`${highPending} high-priority gaps`);
      recommendations.push('Prioritize high-priority compliance tasks');
    }

    if (overdueTasks > 0) {
      if (level === 'low') level = 'medium';
      factors.push(`${overdueTasks} overdue compliance tasks`);
      recommendations.push('Address overdue compliance deadlines immediately');
    }

    if (factors.length === 0) {
      factors.push('All critical requirements addressed');
      recommendations.push('Continue regular compliance monitoring');
    }

    return { level, factors, recommendations };
  }

  private calculateAuditReadiness(requirements: ComplianceRequirement[]): number {
    const readyCount = requirements.filter(r => r.compliance_status === 'compliant').length;
    const totalCount = requirements.length;
    
    if (totalCount === 0) return 0;
    return Math.round((readyCount / totalCount) * 100);
  }

  private async getTrends(): Promise<unknown> {
    // Simulate trend data - in a real implementation, this would query historical data
    return {
      score_trend: [85, 87, 89, 91, 88, 90, 92], // Last 7 periods
      deadline_compliance: 85, // Percentage of deadlines met on time
      improvement_areas: ['Administrative Safeguards', 'Staff Training', 'Incident Response']
    };
  }

  async updateComplianceStatus(
    requirementId: string,
    status: string,
    notes?: string,
    evidence?: unknown
  ): Promise<void> {
    const { data: oldRequirement } = await supabase
      .from('compliance_requirements')
      .select('compliance_status')
      .eq('id', requirementId)
      .single();

    const { error } = await supabase
      .from('compliance_requirements')
      .update({
        compliance_status: status,
        _implementation_notes: notes,
        _last_reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', requirementId);

    if (error) throw error;

    // Log the change
    await supabase
      .from('compliance_audit_trails')
      .insert({
        _requirement_id: requirementId,
        _action_type: 'STATUS_UPDATE',
        _action_description: `Status changed from ${oldRequirement?.compliance_status} to ${status}`,
        _performed_by: 'current_user', // This would be auth.uid() in a real implementation
        evidence_data: evidence || {},
        compliance_score_before: 0, // Would calculate actual scores
        compliance_score_after: 0
      });
  }

  async generateComplianceReport(
    reportType: string,
    periodStart: string,
    periodEnd: string
  ): Promise<ComplianceReport> {
    const dashboardData = await this.getDashboardData();
    
    const _reportData = {
      report_type: reportType,
      reporting_period_start: periodStart,
      reporting_period_end: periodEnd,
      overall_compliance_score: dashboardData.overall_score,
      framework_scores: dashboardData.framework_scores,
      critical_gaps: dashboardData.critical_gaps.length,
      high_priority_gaps: dashboardData.upcoming_deadlines.length,
      upcoming_deadlines: dashboardData.upcoming_deadlines.length,
        report_data: JSON.stringify({
          risk_assessment: dashboardData.risk_assessment,
          _audit_readiness: dashboardData._audit_readiness,
          _trends: dashboardData._trends,
          _detailed_requirements: await this.getComplianceRequirements()
        }),
      generated_by: 'current_user', // This would be auth.uid() in a real implementation
      status: 'draft'
    };

    const { data, error } = await supabase
      .from('compliance_reports')
      .insert(_reportData)
      .select()
      .single();

    if (error) throw error;
    return data as ComplianceReport;
  }

  async getComplianceAlerts(): Promise<unknown[]> {
    const alerts = [];
    const upcomingDeadlines = await this.getUpcomingDeadlines();
    const criticalGaps = await this.getCriticalGaps();

    // Deadline alerts
    for (const deadline of upcomingDeadlines) {
      const daysUntilDue = Math.ceil(
        (new Date(deadline._due_date!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      alerts.push({
        type: 'deadline',
        severity: daysUntilDue <= 7 ? 'high' : 'medium',
        _title: `Compliance Deadline Approaching`,
        _message: `${deadline.requirement_name} is due in ${daysUntilDue} days`,
        _requirement_id: deadline.id,
        _due_date: deadline._due_date
      });
    }

    // Critical gap alerts
    for (const gap of criticalGaps) {
      alerts.push({
        type: 'gap',
        severity: 'critical',
        _title: 'Critical Compliance Gap',
        _message: `${gap.requirement_name} requires immediate attention`,
        _requirement_id: gap.id,
        _framework: gap.regulation_framework
      });
    }

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }
}

export const complianceDashboardService = new ComplianceDashboardService();