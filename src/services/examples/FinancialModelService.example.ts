/**
 * Financial Model Service Usage Examples
 * 
 * This file demonstrates how to use the FinancialModelService for various
 * financial analysis tasks in the Serenity platform.
 */

import { financialModelService } from '@/services/FinancialModelService';
import type { 
import logger from '../loggerService';
  ProviderSegment, 
  InvestorReport, 
  FinancialScenario,
  LTVMetrics,
  CACMetrics,
  SaaSMetrics
} from '@/services/FinancialModelService';

/**
 * Example 1: Calculate LTV for different customer segments
 */
export async function calculateCustomerLifetimeValue() {
  logger.debug('=== Customer Lifetime Value Analysis ===', { component: 'FinancialModelService.example' });

  try {
    // Calculate LTV for all customers
    const allCustomersLTV = await financialModelService.calculateLTV();
    logger.debug(`Total customers analyzed: ${allCustomersLTV.length}`, { component: 'FinancialModelService.example' });

    // Calculate average LTV by segment
    const segments: ProviderSegment[] = ['startup', 'growth', 'enterprise'];
    
    for (const segment of segments) {
      const segmentLTV = await financialModelService.calculateLTV(undefined, segment);
      const averageLTV = segmentLTV.reduce((sum, ltv) => sum + ltv.lifetimeValue, 0) / segmentLTV.length;
      
      logger.debug(`${segment.toUpperCase(, { component: 'FinancialModelService.example' });} Segment:`);
      logger.debug(`  Average LTV: $${averageLTV.toFixed(2, { component: 'FinancialModelService.example' });}`);
      logger.debug(`  Customer Count: ${segmentLTV.length}`, { component: 'FinancialModelService.example' });
      logger.debug(`  Average Churn Rate: ${(segmentLTV[0]?.monthlyChurnRate * 100 || 0, { component: 'FinancialModelService.example' });.toFixed(2)}%`);
      logger.debug(`  Gross Margin: ${(segmentLTV[0]?.grossMarginPercentage * 100 || 0, { component: 'FinancialModelService.example' });.toFixed(2)}%`);
      logger.debug('', { component: 'FinancialModelService.example' });
    }

    return allCustomersLTV;
  } catch (error) {
    console.error('Error calculating LTV:', error);
    throw error;
  }
}

/**
 * Example 2: Analyze Customer Acquisition Costs by channel
 */
export async function analyzeCustomerAcquisitionCosts() {
  logger.debug('=== Customer Acquisition Cost Analysis ===', { component: 'FinancialModelService.example' });

  try {
    // Calculate CAC for all channels
    const allChannelsCAC = await financialModelService.calculateCAC();
    
    logger.debug('CAC by Acquisition Channel:', { component: 'FinancialModelService.example' });
    allChannelsCAC.forEach(cac => {
      logger.debug(`${cac.acquisitionChannel}:`, { component: 'FinancialModelService.example' });
      logger.debug(`  CAC: $${cac.costPerAcquisition.toFixed(2, { component: 'FinancialModelService.example' });}`);
      logger.debug(`  Customers Acquired: ${cac.customersAcquired}`, { component: 'FinancialModelService.example' });
      logger.debug(`  Payback Period: ${cac.paybackPeriodMonths.toFixed(1, { component: 'FinancialModelService.example' });} months`);
      logger.debug(`  Total Acquisition Cost: $${cac.totalAcquisitionCost.toLocaleString(, { component: 'FinancialModelService.example' });}`);
      logger.debug('', { component: 'FinancialModelService.example' });
    });

    // Calculate CAC efficiency
    const totalCAC = allChannelsCAC.reduce((sum, cac) => sum + cac.totalAcquisitionCost, 0);
    const totalCustomers = allChannelsCAC.reduce((sum, cac) => sum + cac.customersAcquired, 0);
    const averageCAC = totalCustomers > 0 ? totalCAC / totalCustomers : 0;

    logger.debug(`Overall CAC Metrics:`, { component: 'FinancialModelService.example' });
    logger.debug(`  Average CAC: $${averageCAC.toFixed(2, { component: 'FinancialModelService.example' });}`);
    logger.debug(`  Total Acquisition Spend: $${totalCAC.toLocaleString(, { component: 'FinancialModelService.example' });}`);
    logger.debug(`  Total Customers Acquired: ${totalCustomers}`, { component: 'FinancialModelService.example' });

    return allChannelsCAC;
  } catch (error) {
    console.error('Error calculating CAC:', error);
    throw error;
  }
}

/**
 * Example 3: Comprehensive SaaS Metrics Dashboard
 */
export async function generateSaaSMetricsDashboard() {
  logger.debug('=== SaaS Metrics Dashboard ===', { component: 'FinancialModelService.example' });

  try {
    const saasMetrics = await financialModelService.calculateSaaSMetrics();

    logger.debug('Key SaaS Metrics:', { component: 'FinancialModelService.example' });
    logger.debug(`  Monthly Recurring Revenue (MRR, { component: 'FinancialModelService.example' });: $${saasMetrics.mrr.toLocaleString()}`);
    logger.debug(`  Annual Recurring Revenue (ARR, { component: 'FinancialModelService.example' });: $${saasMetrics.arr.toLocaleString()}`);
    logger.debug(`  Monthly Growth Rate: ${(saasMetrics.monthlyGrowthRate * 100, { component: 'FinancialModelService.example' });.toFixed(2)}%`);
    logger.debug(`  Gross Churn Rate: ${(saasMetrics.grossChurnRate * 100, { component: 'FinancialModelService.example' });.toFixed(2)}%`);
    logger.debug(`  Net Churn Rate: ${(saasMetrics.netChurnRate * 100, { component: 'FinancialModelService.example' });.toFixed(2)}%`);
    logger.debug(`  Net Revenue Retention: ${(saasMetrics.netRevenueRetention * 100, { component: 'FinancialModelService.example' });.toFixed(2)}%`);
    logger.debug(`  Average Revenue Per User: $${saasMetrics.averageRevenuePerUser.toFixed(2, { component: 'FinancialModelService.example' });}`);
    logger.debug(`  Quick Ratio: ${saasMetrics.quickRatio.toFixed(2, { component: 'FinancialModelService.example' });}`);
    logger.debug('', { component: 'FinancialModelService.example' });

    // Segment breakdown
    logger.debug('Segment Breakdown:', { component: 'FinancialModelService.example' });
    Object.entries(saasMetrics.segmentBreakdown).forEach(([segment, metrics]) => {
      logger.debug(`  ${segment.toUpperCase(, { component: 'FinancialModelService.example' });}:`);
      logger.debug(`    Customers: ${metrics.customers}`, { component: 'FinancialModelService.example' });
      logger.debug(`    MRR: $${metrics.mrr.toLocaleString(, { component: 'FinancialModelService.example' });}`);
      logger.debug(`    LTV: $${metrics.ltv.toFixed(2, { component: 'FinancialModelService.example' });}`);
      logger.debug(`    CAC: $${metrics.cac.toFixed(2, { component: 'FinancialModelService.example' });}`);
      logger.debug(`    LTV:CAC Ratio: ${metrics.ltvCacRatio.toFixed(2, { component: 'FinancialModelService.example' });}`);
      logger.debug(`    Payback Period: ${metrics.paybackPeriod.toFixed(1, { component: 'FinancialModelService.example' });} months`);
      logger.debug('', { component: 'FinancialModelService.example' });
    });

    // Health check
    const healthStatus = assessSaaSHealth(saasMetrics);
    logger.debug('SaaS Health Assessment:', { component: 'FinancialModelService.example' });
    logger.debug(`  Overall Status: ${healthStatus.status}`, { component: 'FinancialModelService.example' });
    logger.debug(`  Key Strengths: ${healthStatus.strengths.join(', ', { component: 'FinancialModelService.example' });}`);
    logger.debug(`  Areas for Improvement: ${healthStatus.improvements.join(', ', { component: 'FinancialModelService.example' });}`);

    return saasMetrics;
  } catch (error) {
    console.error('Error generating SaaS metrics:', error);
    throw error;
  }
}

/**
 * Example 4: Validate pricing strategy
 */
export async function validatePricingStrategy() {
  logger.debug('=== Pricing Strategy Validation ===', { component: 'FinancialModelService.example' });

  try {
    const validationResults = await financialModelService.validatePricingTiers();

    logger.debug('Pricing Tier Validation Results:', { component: 'FinancialModelService.example' });
    Object.entries(validationResults).forEach(([segment, result]) => {
      logger.debug(`${segment.toUpperCase(, { component: 'FinancialModelService.example' });} Tier ($${result.tier.monthlyPrice}/month):`);
      logger.debug(`  Validation Score: ${(result.validation.validationScore * 100, { component: 'FinancialModelService.example' });.toFixed(1)}%`);
      logger.debug(`  Market Fit: ${result.marketFit}`, { component: 'FinancialModelService.example' });
      logger.debug(`  Competitive Position: ${result.competitivePosition}`, { component: 'FinancialModelService.example' });
      logger.debug(`  Is Viable: ${result.isViable ? 'Yes' : 'No'}`, { component: 'FinancialModelService.example' });
      logger.debug(`  Projected 5-Year NPV: $${result.tier.roiProjection.fiveYearNPV.toLocaleString(, { component: 'FinancialModelService.example' });}`);
      logger.debug(`  Payback Period: ${result.tier.roiProjection.paybackPeriodMonths.toFixed(1, { component: 'FinancialModelService.example' });} months`);
      
      if (result.validation.riskFactors.length > 0) {
        logger.debug(`  Risk Factors: ${result.validation.riskFactors.join(', ', { component: 'FinancialModelService.example' });}`);
      }
      
      if (result.validation.recommendations.length > 0) {
        logger.debug(`  Recommendations: ${result.validation.recommendations.join(', ', { component: 'FinancialModelService.example' });}`);
      }
      logger.debug('', { component: 'FinancialModelService.example' });
    });

    // Pricing optimization recommendations
    const recommendations = generatePricingRecommendations(validationResults);
    logger.debug('Pricing Optimization Recommendations:', { component: 'FinancialModelService.example' });
    recommendations.forEach((rec, index) => {
      logger.debug(`${index + 1}. ${rec}`, { component: 'FinancialModelService.example' });
    });

    return validationResults;
  } catch (error) {
    console.error('Error validating pricing strategy:', error);
    throw error;
  }
}

/**
 * Example 5: Generate comprehensive investor report
 */
export async function generateInvestorPresentation() {
  logger.debug('=== Investor Report Generation ===', { component: 'FinancialModelService.example' });

  try {
    const investorReport = await financialModelService.generateInvestorReport();

    logger.debug('EXECUTIVE SUMMARY', { component: 'FinancialModelService.example' });
    logger.debug('================', { component: 'FinancialModelService.example' });
    logger.debug(`Total Annual Revenue: $${investorReport.executiveSummary.totalRevenue.toLocaleString(, { component: 'FinancialModelService.example' });}`);
    logger.debug(`Total Customers: ${investorReport.executiveSummary.totalCustomers.toLocaleString(, { component: 'FinancialModelService.example' });}`);
    logger.debug(`Average LTV: $${investorReport.executiveSummary.averageLTV.toFixed(2, { component: 'FinancialModelService.example' });}`);
    logger.debug(`Average CAC: $${investorReport.executiveSummary.averageCAC.toFixed(2, { component: 'FinancialModelService.example' });}`);
    logger.debug(`LTV:CAC Ratio: ${investorReport.executiveSummary.ltvCacRatio.toFixed(2, { component: 'FinancialModelService.example' });}`);
    logger.debug(`Gross Margin: ${(investorReport.executiveSummary.grossMargin * 100, { component: 'FinancialModelService.example' });.toFixed(1)}%`);
    logger.debug(`Monthly Burn Rate: $${investorReport.executiveSummary.monthlyBurnRate.toLocaleString(, { component: 'FinancialModelService.example' });}`);
    logger.debug(`Months to Break-Even: ${investorReport.executiveSummary.monthsToBreakEven.toFixed(1, { component: 'FinancialModelService.example' });}`);
    logger.debug('', { component: 'FinancialModelService.example' });

    logger.debug('KEY INSIGHTS', { component: 'FinancialModelService.example' });
    logger.debug('============', { component: 'FinancialModelService.example' });
    investorReport.executiveSummary.keyInsights.forEach((insight, index) => {
      logger.debug(`${index + 1}. ${insight}`, { component: 'FinancialModelService.example' });
    });
    logger.debug('', { component: 'FinancialModelService.example' });

    logger.debug('FINANCIAL TRAJECTORY (Next 12 Months, { component: 'FinancialModelService.example' });');
    logger.debug('====================================', { component: 'FinancialModelService.example' });
    const projections12Months = investorReport.financialProjections.slice(0, 12);
    projections12Months.forEach((projection, index) => {
      if (index % 3 === 0) { // Show every 3rd month
        logger.debug(`Month ${projection.month}:`, { component: 'FinancialModelService.example' });
        logger.debug(`  Customers: ${projection.totalCustomers}`, { component: 'FinancialModelService.example' });
        logger.debug(`  MRR: $${projection.mrr.toLocaleString(, { component: 'FinancialModelService.example' });}`);
        logger.debug(`  Net Profit: $${projection.netProfit.toLocaleString(, { component: 'FinancialModelService.example' });}`);
        logger.debug('', { component: 'FinancialModelService.example' });
      }
    });

    logger.debug('COMPETITIVE LANDSCAPE', { component: 'FinancialModelService.example' });
    logger.debug('====================', { component: 'FinancialModelService.example' });
    logger.debug(`Market Size: $${(investorReport.competitiveAnalysis.marketSize / 1000000, { component: 'FinancialModelService.example' });.toFixed(0)}M`);
    logger.debug(`Market Growth Rate: ${(investorReport.competitiveAnalysis.marketGrowthRate * 100, { component: 'FinancialModelService.example' });.toFixed(1)}%`);
    logger.debug('Key Competitors:', { component: 'FinancialModelService.example' });
    investorReport.competitiveAnalysis.competitors.forEach(competitor => {
      logger.debug(`  ${competitor.name}: $${(competitor.estimatedRevenue / 1000000, { component: 'FinancialModelService.example' });.toFixed(0)}M revenue, ${(competitor.marketShare * 100).toFixed(1)}% market share`);
    });
    logger.debug('', { component: 'FinancialModelService.example' });

    logger.debug('POSITIONING ADVANTAGES', { component: 'FinancialModelService.example' });
    logger.debug('=====================', { component: 'FinancialModelService.example' });
    investorReport.competitiveAnalysis.positioningAdvantage.forEach((advantage, index) => {
      logger.debug(`${index + 1}. ${advantage}`, { component: 'FinancialModelService.example' });
    });
    logger.debug('', { component: 'FinancialModelService.example' });

    // Export key metrics for presentation
    const presentationMetrics = {
      revenue: investorReport.executiveSummary.totalRevenue,
      customers: investorReport.executiveSummary.totalCustomers,
      ltvCacRatio: investorReport.executiveSummary.ltvCacRatio,
      grossMargin: investorReport.executiveSummary.grossMargin,
      burnRate: investorReport.executiveSummary.monthlyBurnRate,
      monthsToBreakEven: investorReport.executiveSummary.monthsToBreakEven,
      marketSize: investorReport.competitiveAnalysis.marketSize,
      competitiveAdvantages: investorReport.competitiveAnalysis.positioningAdvantage.length
    };

    return { report: investorReport, metrics: presentationMetrics };
  } catch (error) {
    console.error('Error generating investor report:', error);
    throw error;
  }
}

/**
 * Example 6: Financial scenario planning
 */
export async function performScenarioPlanning() {
  logger.debug('=== Financial Scenario Planning ===', { component: 'FinancialModelService.example' });

  try {
    const scenarios = await financialModelService.modelFinancialScenarios();

    logger.debug('Scenario Analysis Results:', { component: 'FinancialModelService.example' });
    logger.debug('========================', { component: 'FinancialModelService.example' });

    scenarios.forEach(scenario => {
      logger.debug(`${scenario.name.toUpperCase(, { component: 'FinancialModelService.example' });}`);
      logger.debug(`Growth Rate: ${(scenario.assumptions.customerGrowthRate * 100, { component: 'FinancialModelService.example' });.toFixed(1)}%`);
      logger.debug(`Churn Rate: ${(scenario.assumptions.churnRate * 100, { component: 'FinancialModelService.example' });.toFixed(1)}%`);
      logger.debug(`Price Change: ${(scenario.assumptions.priceIncrease * 100, { component: 'FinancialModelService.example' });.toFixed(1)}%`);
      
      // 12-month projection
      const month12 = scenario.projections[11];
      if (month12) {
        logger.debug(`Projected Month 12:`, { component: 'FinancialModelService.example' });
        logger.debug(`  Customers: ${month12.totalCustomers}`, { component: 'FinancialModelService.example' });
        logger.debug(`  Revenue: $${month12.totalRevenue.toLocaleString(, { component: 'FinancialModelService.example' });}`);
        logger.debug(`  Profit: $${month12.netProfit.toLocaleString(, { component: 'FinancialModelService.example' });}`);
        logger.debug(`  Break-even: ${scenario.breakEvenAnalysis.monthsToBreakEven.toFixed(1, { component: 'FinancialModelService.example' });} months`);
      }

      // Sensitivity analysis
      logger.debug('Sensitivity Analysis:', { component: 'FinancialModelService.example' });
      scenario.sensitivityAnalysis.scenarios.forEach(sensitivity => {
        const direction = sensitivity.changePercent > 0 ? 'increase' : 'decrease';
        logger.debug(`  ${Math.abs(sensitivity.changePercent * 100, { component: 'FinancialModelService.example' });.toFixed(0)}% ${direction}: ${(sensitivity.impactOnRevenue * 100).toFixed(1)}% revenue impact`);
      });
      logger.debug('', { component: 'FinancialModelService.example' });
    });

    // Scenario comparison
    logger.debug('SCENARIO COMPARISON (12-Month Outlook, { component: 'FinancialModelService.example' });');
    logger.debug('====================================', { component: 'FinancialModelService.example' });
    
    const comparison = scenarios.map(scenario => ({
      name: scenario.name,
      revenue: scenario.projections[11]?.totalRevenue || 0,
      customers: scenario.projections[11]?.totalCustomers || 0,
      profit: scenario.projections[11]?.netProfit || 0
    }));

    comparison.sort((a, b) => b.revenue - a.revenue);
    
    comparison.forEach((scenario, index) => {
      logger.debug(`${index + 1}. ${scenario.name}:`, { component: 'FinancialModelService.example' });
      logger.debug(`   Revenue: $${scenario.revenue.toLocaleString(, { component: 'FinancialModelService.example' });}`);
      logger.debug(`   Customers: ${scenario.customers}`, { component: 'FinancialModelService.example' });
      logger.debug(`   Profit: $${scenario.profit.toLocaleString(, { component: 'FinancialModelService.example' });}`);
    });

    return scenarios;
  } catch (error) {
    console.error('Error performing scenario planning:', error);
    throw error;
  }
}

/**
 * Example 7: Cost optimization analysis
 */
export async function analyzeCostOptimization() {
  logger.debug('=== Cost Optimization Analysis ===', { component: 'FinancialModelService.example' });

  try {
    const cogsBreakdown = await financialModelService.calculateCOGS();

    logger.debug('Current Cost Structure:', { component: 'FinancialModelService.example' });
    logger.debug('======================', { component: 'FinancialModelService.example' });
    logger.debug(`Total COGS: $${cogsBreakdown.totalCOGS.toLocaleString(, { component: 'FinancialModelService.example' });}`);
    logger.debug(`COGS per Customer: $${cogsBreakdown.cogsPerCustomer.toFixed(2, { component: 'FinancialModelService.example' });}`);
    logger.debug(`Gross Margin: ${(cogsBreakdown.marginPercentage * 100, { component: 'FinancialModelService.example' });.toFixed(1)}%`);
    logger.debug('', { component: 'FinancialModelService.example' });

    logger.debug('Cost Breakdown:', { component: 'FinancialModelService.example' });
    logger.debug('Infrastructure Costs:', { component: 'FinancialModelService.example' });
    Object.entries(cogsBreakdown.infrastructureCosts).forEach(([category, cost]) => {
      logger.debug(`  ${category}: $${cost.toLocaleString(, { component: 'FinancialModelService.example' });}`);
    });

    logger.debug('Support Costs:', { component: 'FinancialModelService.example' });
    Object.entries(cogsBreakdown.supportCosts).forEach(([category, cost]) => {
      logger.debug(`  ${category}: $${cost.toLocaleString(, { component: 'FinancialModelService.example' });}`);
    });

    logger.debug('Compliance Costs:', { component: 'FinancialModelService.example' });
    Object.entries(cogsBreakdown.complianceCosts).forEach(([category, cost]) => {
      logger.debug(`  ${category}: $${cost.toLocaleString(, { component: 'FinancialModelService.example' });}`);
    });

    logger.debug(`Product Development: $${cogsBreakdown.productDevelopment.toLocaleString(, { component: 'FinancialModelService.example' });}`);
    logger.debug(`Third Party Services: $${cogsBreakdown.thirdPartyServices.toLocaleString(, { component: 'FinancialModelService.example' });}`);
    logger.debug(`Data Processing: $${cogsBreakdown.dataProcessing.toLocaleString(, { component: 'FinancialModelService.example' });}`);
    logger.debug('', { component: 'FinancialModelService.example' });

    // Cost optimization recommendations
    const optimizationRecommendations = generateCostOptimizationRecommendations(cogsBreakdown);
    logger.debug('Cost Optimization Opportunities:', { component: 'FinancialModelService.example' });
    optimizationRecommendations.forEach((rec, index) => {
      logger.debug(`${index + 1}. ${rec}`, { component: 'FinancialModelService.example' });
    });

    return cogsBreakdown;
  } catch (error) {
    console.error('Error analyzing cost optimization:', error);
    throw error;
  }
}

/**
 * Helper function to assess SaaS health
 */
function assessSaaSHealth(metrics: SaaSMetrics) {
  const strengths: string[] = [];
  const improvements: string[] = [];
  let status: 'Excellent' | 'Good' | 'Warning' | 'Critical' = 'Good';

  // Check key metrics
  if (metrics.netRevenueRetention > 1.15) {
    strengths.push('Strong revenue expansion');
  } else if (metrics.netRevenueRetention < 1.0) {
    improvements.push('Improve customer expansion');
    status = 'Warning';
  }

  if (metrics.grossChurnRate < 0.05) {
    strengths.push('Low customer churn');
  } else if (metrics.grossChurnRate > 0.1) {
    improvements.push('Reduce customer churn');
    status = 'Warning';
  }

  if (metrics.quickRatio > 3) {
    strengths.push('Healthy growth efficiency');
    if (status === 'Good') status = 'Excellent';
  } else if (metrics.quickRatio < 2) {
    improvements.push('Improve growth efficiency');
    status = 'Warning';
  }

  if (metrics.monthlyGrowthRate > 0.15) {
    strengths.push('Strong growth rate');
  } else if (metrics.monthlyGrowthRate < 0.05) {
    improvements.push('Accelerate customer acquisition');
    if (status !== 'Warning') status = 'Warning';
  }

  // Check segment LTV:CAC ratios
  const avgLtvCacRatio = Object.values(metrics.segmentBreakdown)
    .reduce((sum, segment) => sum + segment.ltvCacRatio, 0) / 3;
  
  if (avgLtvCacRatio > 4) {
    strengths.push('Excellent unit economics');
  } else if (avgLtvCacRatio < 2) {
    improvements.push('Improve unit economics');
    status = 'Critical';
  }

  return { status, strengths, improvements };
}

/**
 * Helper function to generate pricing recommendations
 */
function generatePricingRecommendations(validationResults: any): string[] {
  const recommendations: string[] = [];

  Object.entries(validationResults).forEach(([segment, result]: [string, any]) => {
    if (!result.isViable) {
      recommendations.push(`Consider adjusting ${segment} tier pricing or value proposition`);
    }

    if (result.validation.validationScore < 0.7) {
      recommendations.push(`Validate ${segment} tier ROI projections with more market data`);
    }

    if (result.tier.roiProjection.paybackPeriodMonths > 6) {
      recommendations.push(`Reduce ${segment} tier payback period through pricing or value optimization`);
    }
  });

  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push('Pricing strategy appears well-validated across all segments');
    recommendations.push('Consider testing small price increases to optimize revenue');
    recommendations.push('Monitor competitive pricing changes and market response');
  }

  return recommendations;
}

/**
 * Helper function to generate cost optimization recommendations
 */
function generateCostOptimizationRecommendations(cogsBreakdown: any): string[] {
  const recommendations: string[] = [];

  // Infrastructure optimization
  const totalInfra = Object.values(cogsBreakdown.infrastructureCosts).reduce((sum: number, cost: any) => sum + cost, 0);
  if (totalInfra > cogsBreakdown.totalCOGS * 0.25) {
    recommendations.push('Infrastructure costs are high - consider optimization or reserved pricing');
  }

  // Support cost efficiency
  const totalSupport = Object.values(cogsBreakdown.supportCosts).reduce((sum: number, cost: any) => sum + cost, 0);
  if (totalSupport > cogsBreakdown.totalCOGS * 0.3) {
    recommendations.push('Support costs are significant - consider automation and self-service options');
  }

  // Compliance cost management
  const totalCompliance = Object.values(cogsBreakdown.complianceCosts).reduce((sum: number, cost: any) => sum + cost, 0);
  if (totalCompliance > cogsBreakdown.totalCOGS * 0.15) {
    recommendations.push('Explore shared compliance services or automation to reduce costs');
  }

  // Margin optimization
  if (cogsBreakdown.marginPercentage < 0.75) {
    recommendations.push('Target gross margin improvement through pricing or cost reduction');
  }

  // Per-customer cost optimization
  if (cogsBreakdown.cogsPerCustomer > 100) {
    recommendations.push('Focus on economies of scale to reduce per-customer costs');
  }

  return recommendations;
}

/**
 * Complete financial analysis workflow
 */
export async function performCompleteFinancialAnalysis() {
  logger.debug('=== COMPLETE FINANCIAL ANALYSIS ===', { component: 'FinancialModelService.example' });
  logger.debug('', { component: 'FinancialModelService.example' });

  try {
    // 1. Calculate core metrics
    const [ltvMetrics, cacMetrics, saasMetrics] = await Promise.all([
      calculateCustomerLifetimeValue(),
      analyzeCustomerAcquisitionCosts(),
      generateSaaSMetricsDashboard()
    ]);

    // 2. Validate strategy
    await validatePricingStrategy();

    // 3. Analyze costs
    await analyzeCostOptimization();

    // 4. Generate investor materials
    const { metrics: presentationMetrics } = await generateInvestorPresentation();

    // 5. Scenario planning
    await performScenarioPlanning();

    logger.debug('=== ANALYSIS COMPLETE ===', { component: 'FinancialModelService.example' });
    logger.debug('Key takeaways:', { component: 'FinancialModelService.example' });
    logger.debug(`• ${saasMetrics.segmentBreakdown.startup.customers + saasMetrics.segmentBreakdown.growth.customers + saasMetrics.segmentBreakdown.enterprise.customers} total customers across 3 segments`, { component: 'FinancialModelService.example' });
    logger.debug(`• $${saasMetrics.arr.toLocaleString(, { component: 'FinancialModelService.example' });} Annual Recurring Revenue`);
    logger.debug(`• ${(saasMetrics.netRevenueRetention * 100, { component: 'FinancialModelService.example' });.toFixed(0)}% Net Revenue Retention`);
    logger.debug(`• ${presentationMetrics.monthsToBreakEven.toFixed(1, { component: 'FinancialModelService.example' });} months to break-even`);
    logger.debug(`• ${presentationMetrics.competitiveAdvantages} key competitive advantages`, { component: 'FinancialModelService.example' });

    return {
      ltv: ltvMetrics,
      cac: cacMetrics,
      saas: saasMetrics,
      presentation: presentationMetrics
    };
  } catch (error) {
    console.error('Error in complete financial analysis:', error);
    throw error;
  }
}

// Export all example functions for easy usage
export const financialAnalysisExamples = {
  calculateCustomerLifetimeValue,
  analyzeCustomerAcquisitionCosts,
  generateSaaSMetricsDashboard,
  validatePricingStrategy,
  generateInvestorPresentation,
  performScenarioPlanning,
  analyzeCostOptimization,
  performCompleteFinancialAnalysis
};