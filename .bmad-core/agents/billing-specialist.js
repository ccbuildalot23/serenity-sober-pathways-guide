/**
 * Billing Specialist Agent - Healthcare Billing and Insurance Management
 * Handles CPT codes, insurance claims, prior authorization, and revenue cycle
 */

import { BMADAgent } from '../core/agent.js';

export class BillingSpecialistAgent extends BMADAgent {
  constructor() {
    super({
      name: 'billing-specialist',
      role: 'financial',
      capabilities: ['billing', 'claims', 'authorization', 'coding', 'revenue-cycle']
    });
    
    this.cptCodes = {
      // Psychiatric Services
      '90791': { desc: 'Psychiatric Diagnostic Evaluation', rate: 250, duration: 60 },
      '90792': { desc: 'Psychiatric Diagnostic Evaluation with Medical Services', rate: 300, duration: 75 },
      '90832': { desc: 'Individual Psychotherapy 30 min', rate: 100, duration: 30 },
      '90834': { desc: 'Individual Psychotherapy 45 min', rate: 150, duration: 45 },
      '90837': { desc: 'Individual Psychotherapy 60 min', rate: 200, duration: 60 },
      '90839': { desc: 'Crisis Psychotherapy Initial 60 min', rate: 275, duration: 60 },
      '90840': { desc: 'Crisis Psychotherapy Additional 30 min', rate: 137, duration: 30 },
      '90847': { desc: 'Family Psychotherapy with Patient', rate: 175, duration: 50 },
      '90853': { desc: 'Group Psychotherapy', rate: 50, duration: 60 },
      
      // Substance Abuse Services
      'H0001': { desc: 'Alcohol/Drug Assessment', rate: 175, duration: 60 },
      'H0004': { desc: 'Behavioral Health Counseling Individual', rate: 125, duration: 60 },
      'H0005': { desc: 'Alcohol/Drug Services Group', rate: 40, duration: 90 },
      'H0006': { desc: 'Alcohol/Drug Case Management', rate: 85, duration: 30 },
      'H0015': { desc: 'Intensive Outpatient Treatment', rate: 200, duration: 180 },
      'H0020': { desc: 'Methadone Administration', rate: 25, duration: 15 },
      'H2035': { desc: 'Alcohol/Drug Treatment Program Per Diem', rate: 450, duration: 1440 },
      'H2036': { desc: 'Alcohol/Drug Treatment Program Per Hour', rate: 75, duration: 60 },
      
      // Telehealth Services
      '99441': { desc: 'Telephone E/M 5-10 min', rate: 50, duration: 10 },
      '99442': { desc: 'Telephone E/M 11-20 min', rate: 75, duration: 20 },
      '99443': { desc: 'Telephone E/M 21-30 min', rate: 100, duration: 30 },
      
      // Care Coordination
      '99484': { desc: 'Behavioral Health Integration Care Management', rate: 150, duration: 20 },
      '99492': { desc: 'Initial Psychiatric Collaborative Care Management', rate: 200, duration: 70 },
      '99493': { desc: 'Subsequent Psychiatric Collaborative Care Management', rate: 150, duration: 60 }
    };
    
    this.modifiers = {
      'GT': 'Telehealth Service',
      'HO': 'Masters Degree Level Clinician',
      'HP': 'Doctoral Level Clinician',
      'U5': 'Medicaid Recipient',
      'HA': 'Child/Adolescent Program',
      'HF': 'Substance Abuse Program',
      'HD': 'Pregnant/Parenting Women Program',
      '25': 'Significant Separately Identifiable E/M Service',
      '59': 'Distinct Procedural Service'
    };
    
    this.insurancePayers = {
      'BCBS': { id: '00001', name: 'Blue Cross Blue Shield', type: 'commercial' },
      'UHC': { id: '00002', name: 'United Healthcare', type: 'commercial' },
      'AETNA': { id: '00003', name: 'Aetna', type: 'commercial' },
      'CIGNA': { id: '00004', name: 'Cigna', type: 'commercial' },
      'MEDICARE': { id: '00005', name: 'Medicare', type: 'government' },
      'MEDICAID': { id: '00006', name: 'Medicaid', type: 'government' },
      'TRICARE': { id: '00007', name: 'TRICARE', type: 'government' }
    };
  }

  async generateClaim(encounter) {
    const claim = {
      claimId: this.generateClaimId(),
      patientId: encounter.patientId,
      providerId: encounter.providerId,
      dateOfService: encounter.date,
      placeOfService: encounter.location || '11', // Office
      diagnosis: encounter.diagnosis,
      procedures: [],
      totalCharge: 0,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Add procedures with appropriate CPT codes
    for (const service of encounter.services) {
      const procedure = await this.selectCPTCode(service);
      claim.procedures.push(procedure);
      claim.totalCharge += procedure.charge;
    }

    // Apply modifiers if needed
    claim.procedures = this.applyModifiers(claim.procedures, encounter);

    // Validate claim before submission
    const validation = await this.validateClaim(claim);
    if (!validation.valid) {
      claim.status = 'requires_correction';
      claim.errors = validation.errors;
    }

    return claim;
  }

  async selectCPTCode(service) {
    // Match service to appropriate CPT code
    const mappings = {
      'initial_assessment': '90791',
      'individual_therapy': this.selectTherapyCode(service.duration),
      'group_therapy': '90853',
      'crisis_intervention': '90839',
      'substance_assessment': 'H0001',
      'case_management': 'H0006',
      'intensive_outpatient': 'H0015',
      'telehealth_therapy': this.selectTherapyCode(service.duration),
      'family_therapy': '90847',
      'care_coordination': '99484'
    };

    const cptCode = mappings[service.type] || '90834';
    const codeDetails = this.cptCodes[cptCode];

    return {
      cptCode,
      description: codeDetails.desc,
      units: service.units || 1,
      charge: codeDetails.rate * (service.units || 1),
      duration: service.duration || codeDetails.duration
    };
  }

  selectTherapyCode(duration) {
    if (duration <= 30) return '90832';
    if (duration <= 45) return '90834';
    return '90837';
  }

  applyModifiers(procedures, encounter) {
    const modifiedProcedures = [...procedures];

    for (const proc of modifiedProcedures) {
      proc.modifiers = [];

      // Add telehealth modifier if applicable
      if (encounter.modality === 'telehealth') {
        proc.modifiers.push('GT');
      }

      // Add provider level modifier
      if (encounter.providerLevel === 'masters') {
        proc.modifiers.push('HO');
      } else if (encounter.providerLevel === 'doctoral') {
        proc.modifiers.push('HP');
      }

      // Add program-specific modifiers
      if (encounter.program === 'child_adolescent') {
        proc.modifiers.push('HA');
      } else if (encounter.program === 'substance_abuse') {
        proc.modifiers.push('HF');
      }
    }

    return modifiedProcedures;
  }

  async submitClaim(claim, insuranceInfo) {
    const submission = {
      submissionId: this.generateSubmissionId(),
      claimId: claim.claimId,
      payer: insuranceInfo.payerId,
      submittedAt: new Date().toISOString(),
      method: 'electronic',
      status: 'submitted'
    };

    // Validate insurance eligibility
    const eligibility = await this.verifyEligibility(insuranceInfo);
    if (!eligibility.eligible) {
      submission.status = 'rejected';
      submission.rejectionReason = eligibility.reason;
      return submission;
    }

    // Check for prior authorization requirements
    const authRequired = await this.checkAuthorizationRequirement(claim, insuranceInfo);
    if (authRequired && !insuranceInfo.priorAuthNumber) {
      submission.status = 'pending_authorization';
      submission.authorizationRequest = await this.requestPriorAuthorization(claim, insuranceInfo);
      return submission;
    }

    // Format claim for specific payer
    const formattedClaim = await this.formatClaimForPayer(claim, insuranceInfo.payerId);

    // Submit to clearinghouse
    try {
      const response = await this.submitToClearinghouse(formattedClaim);
      submission.clearinghouseId = response.trackingId;
      submission.expectedPaymentDate = response.expectedPaymentDate;
      submission.status = 'accepted';
    } catch (error) {
      submission.status = 'transmission_error';
      submission.error = error.message;
    }

    return submission;
  }

  async requestPriorAuthorization(claim, insuranceInfo) {
    const authRequest = {
      requestId: this.generateAuthRequestId(),
      patientId: claim.patientId,
      insuranceId: insuranceInfo.memberId,
      procedures: claim.procedures.map(p => p.cptCode),
      diagnosis: claim.diagnosis,
      clinicalJustification: await this.generateClinicalJustification(claim),
      requestedDate: new Date().toISOString(),
      urgency: this.determineUrgency(claim),
      status: 'pending'
    };

    // Submit authorization request
    const response = await this.submitAuthorizationRequest(authRequest, insuranceInfo.payerId);
    authRequest.trackingNumber = response.trackingNumber;
    authRequest.expectedResponseDate = response.expectedResponseDate;

    return authRequest;
  }

  async generateClinicalJustification(claim) {
    const justification = {
      medicalNecessity: [],
      treatmentPlan: [],
      expectedOutcomes: [],
      alternativesConsidered: []
    };

    // Analyze diagnosis for medical necessity
    for (const dx of claim.diagnosis) {
      justification.medicalNecessity.push({
        diagnosis: dx.code,
        description: dx.description,
        severity: this.assessSeverity(dx),
        impairment: this.assessFunctionalImpairment(dx)
      });
    }

    // Include treatment plan based on procedures
    for (const proc of claim.procedures) {
      justification.treatmentPlan.push({
        procedure: proc.cptCode,
        frequency: proc.units,
        duration: proc.duration,
        rationale: this.getProcedureRationale(proc.cptCode, claim.diagnosis)
      });
    }

    // Add expected outcomes
    justification.expectedOutcomes = [
      'Symptom reduction',
      'Improved functioning',
      'Prevention of deterioration',
      'Reduced hospitalization risk'
    ];

    // Document alternatives
    justification.alternativesConsidered = [
      'Less intensive treatment deemed insufficient',
      'Medication alone without therapy inadequate',
      'Self-help resources insufficient for severity'
    ];

    return justification;
  }

  async processPayment(eob) {
    const payment = {
      paymentId: this.generatePaymentId(),
      claimId: eob.claimId,
      payerId: eob.payerId,
      receivedDate: new Date().toISOString(),
      checkNumber: eob.checkNumber,
      totalBilled: eob.billedAmount,
      allowedAmount: eob.allowedAmount,
      paidAmount: eob.paidAmount,
      patientResponsibility: eob.patientAmount,
      adjustments: [],
      denials: [],
      status: 'processed'
    };

    // Process line item payments
    for (const line of eob.lineItems) {
      if (line.denied) {
        payment.denials.push({
          cptCode: line.cptCode,
          denialReason: line.denialReason,
          denialCode: line.denialCode,
          appealDeadline: this.calculateAppealDeadline(eob.receivedDate)
        });
      } else {
        payment.adjustments.push({
          cptCode: line.cptCode,
          billed: line.billedAmount,
          allowed: line.allowedAmount,
          paid: line.paidAmount,
          writeOff: line.billedAmount - line.allowedAmount,
          patientOwes: line.patientAmount
        });
      }
    }

    // Post payment to patient account
    await this.postPaymentToAccount(payment);

    // Generate patient statement if needed
    if (payment.patientResponsibility > 0) {
      await this.generatePatientStatement(payment);
    }

    // Check if appeal needed for denials
    if (payment.denials.length > 0) {
      await this.evaluateAppealOpportunity(payment.denials);
    }

    return payment;
  }

  async manageDenial(denial) {
    const denialManagement = {
      denialId: denial.id,
      claimId: denial.claimId,
      denialDate: denial.date,
      reason: denial.reason,
      category: this.categorizeDenial(denial.reason),
      action: 'pending_review',
      timeline: {}
    };

    // Categorize denial type
    switch (denialManagement.category) {
      case 'administrative':
        // Can be corrected and resubmitted
        denialManagement.action = 'correct_and_resubmit';
        denialManagement.corrections = await this.identifyCorrections(denial);
        denialManagement.timeline.resubmitBy = this.calculateDeadline(denial.date, 30);
        break;
        
      case 'medical_necessity':
        // Requires appeal with clinical documentation
        denialManagement.action = 'appeal';
        denialManagement.appealStrategy = await this.developAppealStrategy(denial);
        denialManagement.timeline.appealDeadline = this.calculateDeadline(denial.date, 60);
        break;
        
      case 'authorization':
        // Need to obtain authorization
        denialManagement.action = 'obtain_authorization';
        denialManagement.authorizationPlan = await this.planAuthorization(denial);
        denialManagement.timeline.authDeadline = this.calculateDeadline(denial.date, 14);
        break;
        
      case 'eligibility':
        // Patient eligibility issue
        denialManagement.action = 'verify_eligibility';
        denialManagement.eligibilityIssue = await this.investigateEligibility(denial);
        denialManagement.timeline.responseNeeded = this.calculateDeadline(denial.date, 7);
        break;
        
      default:
        denialManagement.action = 'manual_review';
    }

    return denialManagement;
  }

  async generateFinancialReport(dateRange) {
    const report = {
      period: dateRange,
      generatedAt: new Date().toISOString(),
      revenue: {
        totalBilled: 0,
        totalCollected: 0,
        totalAdjusted: 0,
        totalOutstanding: 0
      },
      metrics: {},
      payerMix: {},
      serviceMix: {},
      trends: []
    };

    // Calculate revenue metrics
    const claims = await this.getClaimsForPeriod(dateRange);
    
    for (const claim of claims) {
      report.revenue.totalBilled += claim.totalCharge;
      
      if (claim.payment) {
        report.revenue.totalCollected += claim.payment.paidAmount;
        report.revenue.totalAdjusted += claim.payment.adjustments;
      } else {
        report.revenue.totalOutstanding += claim.totalCharge;
      }
    }

    // Calculate key metrics
    report.metrics = {
      collectionRate: (report.revenue.totalCollected / report.revenue.totalBilled * 100).toFixed(2),
      daysInAR: await this.calculateDaysInAR(),
      denialRate: await this.calculateDenialRate(dateRange),
      netCollectionRate: await this.calculateNetCollectionRate(dateRange),
      costToCollect: await this.calculateCostToCollect(dateRange),
      cleanClaimRate: await this.calculateCleanClaimRate(dateRange),
      priorAuthApprovalRate: await this.calculateAuthApprovalRate(dateRange)
    };

    // Analyze payer mix
    report.payerMix = await this.analyzePayerMix(claims);

    // Analyze service mix
    report.serviceMix = await this.analyzeServiceMix(claims);

    // Identify trends
    report.trends = await this.identifyRevenueTrends(dateRange);

    // Add recommendations
    report.recommendations = this.generateRevenueRecommendations(report);

    return report;
  }

  async performRevenueOptimization() {
    const optimization = {
      timestamp: new Date().toISOString(),
      opportunities: [],
      projectedImpact: 0,
      actions: []
    };

    // Identify unbilled services
    const unbilledServices = await this.findUnbilledServices();
    if (unbilledServices.length > 0) {
      optimization.opportunities.push({
        type: 'unbilled_services',
        count: unbilledServices.length,
        value: unbilledServices.reduce((sum, s) => sum + s.estimatedValue, 0),
        action: 'Generate claims for unbilled services'
      });
    }

    // Find missing modifiers that could increase reimbursement
    const missingModifiers = await this.identifyMissingModifiers();
    if (missingModifiers.length > 0) {
      optimization.opportunities.push({
        type: 'missing_modifiers',
        count: missingModifiers.length,
        value: missingModifiers.reduce((sum, m) => sum + m.additionalReimbursement, 0),
        action: 'Add appropriate modifiers to claims'
      });
    }

    // Identify undercoded services
    const undercodedServices = await this.findUndercodedServices();
    if (undercodedServices.length > 0) {
      optimization.opportunities.push({
        type: 'undercoding',
        count: undercodedServices.length,
        value: undercodedServices.reduce((sum, u) => sum + u.revenueDifference, 0),
        action: 'Update to appropriate higher-level codes'
      });
    }

    // Review denied claims for appeal opportunities
    const appealOpportunities = await this.identifyAppealabledenials();
    if (appealOpportunities.length > 0) {
      optimization.opportunities.push({
        type: 'appealable_denials',
        count: appealOpportunities.length,
        value: appealOpportunities.reduce((sum, a) => sum + a.claimValue, 0),
        action: 'Submit appeals with supporting documentation'
      });
    }

    // Calculate total projected impact
    optimization.projectedImpact = optimization.opportunities.reduce(
      (sum, opp) => sum + opp.value, 0
    );

    // Generate action plan
    optimization.actions = this.prioritizeOptimizationActions(optimization.opportunities);

    return optimization;
  }

  // Helper methods
  generateClaimId() {
    return `CLM-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  generateSubmissionId() {
    return `SUB-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  generateAuthRequestId() {
    return `AUTH-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  generatePaymentId() {
    return `PMT-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  async validateClaim(claim) {
    const errors = [];
    
    // Validate required fields
    if (!claim.diagnosis || claim.diagnosis.length === 0) {
      errors.push('Missing diagnosis codes');
    }
    
    if (!claim.procedures || claim.procedures.length === 0) {
      errors.push('Missing procedure codes');
    }
    
    // Validate CPT code combinations
    const invalidCombos = this.checkInvalidCPTCombinations(claim.procedures);
    if (invalidCombos.length > 0) {
      errors.push(...invalidCombos);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  checkInvalidCPTCombinations(procedures) {
    const errors = [];
    const cptCodes = procedures.map(p => p.cptCode);
    
    // Check for duplicate codes that shouldn't be billed together
    const duplicates = cptCodes.filter((code, index) => cptCodes.indexOf(code) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate CPT codes: ${duplicates.join(', ')}`);
    }
    
    // Check for mutually exclusive codes
    if (cptCodes.includes('90839') && cptCodes.includes('90834')) {
      errors.push('Cannot bill crisis therapy and regular therapy on same day');
    }
    
    return errors;
  }

  async verifyEligibility(insuranceInfo) {
    // Simulate eligibility verification
    return {
      eligible: true,
      effectiveDate: '2024-01-01',
      terminationDate: null,
      copay: 25,
      deductible: 500,
      deductibleMet: 300,
      outOfPocketMax: 5000,
      outOfPocketMet: 1200
    };
  }

  async checkAuthorizationRequirement(claim, insuranceInfo) {
    // Check if procedures require prior auth
    const authRequired = ['H0015', 'H2035', 'H2036'];
    return claim.procedures.some(p => authRequired.includes(p.cptCode));
  }

  async formatClaimForPayer(claim, payerId) {
    // Format claim according to payer specifications
    return {
      ...claim,
      payerId,
      formattedForPayer: true
    };
  }

  async submitToClearinghouse(formattedClaim) {
    // Simulate clearinghouse submission
    return {
      trackingId: `CH-${Date.now()}`,
      expectedPaymentDate: new Date(Date.now() + 30 * 86400000).toISOString()
    };
  }

  async submitAuthorizationRequest(authRequest, payerId) {
    // Simulate auth request submission
    return {
      trackingNumber: `AUTH-TRACK-${Date.now()}`,
      expectedResponseDate: new Date(Date.now() + 5 * 86400000).toISOString()
    };
  }

  determineUrgency(claim) {
    // Determine urgency based on diagnosis and procedures
    const urgentDiagnoses = ['F32.3', 'F33.3']; // Severe depression
    const hasUrgentDx = claim.diagnosis.some(dx => urgentDiagnoses.includes(dx.code));
    return hasUrgentDx ? 'urgent' : 'routine';
  }

  assessSeverity(diagnosis) {
    // Assess severity based on diagnosis code
    if (diagnosis.code.endsWith('.3')) return 'severe';
    if (diagnosis.code.endsWith('.2')) return 'moderate';
    if (diagnosis.code.endsWith('.1')) return 'mild';
    return 'minimal';
  }

  assessFunctionalImpairment(diagnosis) {
    // Assess functional impairment
    const severity = this.assessSeverity(diagnosis);
    const impairments = {
      severe: ['work', 'social', 'self-care'],
      moderate: ['work', 'social'],
      mild: ['social'],
      minimal: []
    };
    return impairments[severity];
  }

  getProcedureRationale(cptCode, diagnoses) {
    // Generate rationale for procedure based on diagnosis
    const rationales = {
      '90834': 'Evidence-based individual therapy for symptom management',
      '90853': 'Group therapy for peer support and skill development',
      'H0015': 'Intensive treatment required for severe symptoms'
    };
    return rationales[cptCode] || 'Medically necessary treatment';
  }

  calculateAppealDeadline(receivedDate) {
    // Typically 60-180 days depending on payer
    return new Date(new Date(receivedDate).getTime() + 60 * 86400000).toISOString();
  }

  calculateDeadline(date, days) {
    return new Date(new Date(date).getTime() + days * 86400000).toISOString();
  }

  categorizeDenial(reason) {
    const categories = {
      'missing_info': 'administrative',
      'no_authorization': 'authorization',
      'not_medically_necessary': 'medical_necessity',
      'not_covered': 'eligibility',
      'incorrect_modifier': 'administrative'
    };
    
    for (const [key, category] of Object.entries(categories)) {
      if (reason.toLowerCase().includes(key)) {
        return category;
      }
    }
    return 'other';
  }

  async postPaymentToAccount(payment) {
    console.log('Posting payment to account:', payment.paymentId);
  }

  async generatePatientStatement(payment) {
    console.log('Generating patient statement for payment:', payment.paymentId);
  }

  async evaluateAppealOpportunity(denials) {
    console.log('Evaluating appeal opportunities:', denials.length);
  }

  // Placeholder methods for data queries
  async getClaimsForPeriod(dateRange) { return []; }
  async calculateDaysInAR() { return 35; }
  async calculateDenialRate(dateRange) { return 5.2; }
  async calculateNetCollectionRate(dateRange) { return 95.5; }
  async calculateCostToCollect(dateRange) { return 3.2; }
  async calculateCleanClaimRate(dateRange) { return 92.0; }
  async calculateAuthApprovalRate(dateRange) { return 88.5; }
  async analyzePayerMix(claims) { return {}; }
  async analyzeServiceMix(claims) { return {}; }
  async identifyRevenueTrends(dateRange) { return []; }
  
  generateRevenueRecommendations(report) {
    const recommendations = [];
    
    if (report.metrics.denialRate > 5) {
      recommendations.push('Focus on reducing denial rate through improved documentation');
    }
    
    if (report.metrics.daysInAR > 40) {
      recommendations.push('Accelerate collections to reduce days in AR');
    }
    
    if (report.metrics.cleanClaimRate < 90) {
      recommendations.push('Improve claim accuracy to increase clean claim rate');
    }
    
    return recommendations;
  }
  
  async findUnbilledServices() { return []; }
  async identifyMissingModifiers() { return []; }
  async findUndercodedServices() { return []; }
  async identifyAppealabledenials() { return []; }
  
  prioritizeOptimizationActions(opportunities) {
    // Sort by value and return top actions
    return opportunities
      .sort((a, b) => b.value - a.value)
      .map(opp => opp.action);
  }
  
  async identifyCorrections(denial) { return []; }
  async developAppealStrategy(denial) { return {}; }
  async planAuthorization(denial) { return {}; }
  async investigateEligibility(denial) { return {}; }
}

export default BillingSpecialistAgent;