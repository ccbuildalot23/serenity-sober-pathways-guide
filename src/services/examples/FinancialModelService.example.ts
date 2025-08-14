/**
 * Financial Model Service Usage Examples
 * 
 * This file demonstrates how to use the FinancialModelService for various
 * financial analysis tasks in the Serenity platform.
 */

import { financialModelService } from '@/services/FinancialModelService';
import type { 
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
  console.log('=== Customer Lifetime Value Analysis ===');

  try {
    // Calculate LTV for all customers
    const allCustomersLTV = await financialModelService.calculateLTV();
    console.log(`Total customers analyzed: ${allCustomersLTV.length}`);

    // Calculate average LTV by segment
    const segments: ProviderSegment[] = ['startup', 'growth', 'enterprise'];
    
    for (const segment of segments) {
      const segmentLTV = await financialModelService.calculateLTV(undefined, segment);
      const averageLTV = segmentLTV.reduce((sum, ltv) => sum + ltv.lifetimeValue, 0) / segmentLTV.length;
      
      console.log(`${segment.toUpperCase()} Segment:`);
      console.log(`  Average LTV: $${averageLTV.toFixed(2)}`);
      console.log(`  Customer Count: ${segmentLTV.length}`);
      console.log(`  Average Churn Rate: ${(segmentLTV[0]?.monthlyChurnRate * 100 || 0).toFixed(2)}%`);
      console.log(`  Gross Margin: ${(segmentLTV[0]?.grossMarginPercentage * 100 || 0).toFixed(2)}%`);
      console.log('');
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
  console.log('=== Customer Acquisition Cost Analysis ===');

  try {
    // Calculate CAC for all channels
    const allChannelsCAC = await financialModelService.calculateCAC();
    
    console.log('CAC by Acquisition Channel:');
    allChannelsCAC.forEach(cac => {
      console.log(`${cac.acquisitionChannel}:`);
      console.log(`  CAC: $${cac.costPerAcquisition.toFixed(2)}`);
      console.log(`  Customers Acquired: ${cac.customersAcquired}`);
      console.log(`  Payback Period: ${cac.paybackPeriodMonths.toFixed(1)} months`);
      console.log(`  Total Acquisition Cost: $${cac.totalAcquisitionCost.toLocaleString()}`);
      console.log('');
    });

    // Calculate CAC efficiency
    const totalCAC = allChannelsCAC.reduce((sum, cac) => sum + cac.totalAcquisitionCost, 0);
    const totalCustomers = allChannelsCAC.reduce((sum, cac) => sum + cac.customersAcquired, 0);
    const averageCAC = totalCustomers > 0 ? totalCAC / totalCustomers : 0;

    console.log(`Overall CAC Metrics:`);
    console.log(`  Average CAC: $${averageCAC.toFixed(2)}`);
    console.log(`  Total Acquisition Spend: $${totalCAC.toLocaleString()}`);
    console.log(`  Total Customers Acquired: ${totalCustomers}`);

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
  console.log('=== SaaS Metrics Dashboard ===');

  try {
    const saasMetrics = await financialModelService.calculateSaaSMetrics();

    console.log('Key SaaS Metrics:');
    console.log(`  Monthly Recurring Revenue (MRR): $${saasMetrics.mrr.toLocaleString()}`);
    console.log(`  Annual Recurring Revenue (ARR): $${saasMetrics.arr.toLocaleString()}`);
    console.log(`  Monthly Growth Rate: ${(saasMetrics.monthlyGrowthRate * 100).toFixed(2)}%`);
    console.log(`  Gross Churn Rate: ${(saasMetrics.grossChurnRate * 100).toFixed(2)}%`);
    console.log(`  Net Churn Rate: ${(saasMetrics.netChurnRate * 100).toFixed(2)}%`);
    console.log(`  Net Revenue Retention: ${(saasMetrics.netRevenueRetention * 100).toFixed(2)}%`);
    console.log(`  Average Revenue Per User: $${saasMetrics.averageRevenuePerUser.toFixed(2)}`);
    console.log(`  Quick Ratio: ${saasMetrics.quickRatio.toFixed(2)}`);
    console.log('');

    // Segment breakdown
    console.log('Segment Breakdown:');
    Object.entries(saasMetrics.segmentBreakdown).forEach(([segment, metrics]) => {
      console.log(`  ${segment.toUpperCase()}:`);
      console.log(`    Customers: ${metrics.customers}`);
      console.log(`    MRR: $${metrics.mrr.toLocaleString()}`);
      console.log(`    LTV: $${metrics.ltv.toFixed(2)}`);
      console.log(`    CAC: $${metrics.cac.toFixed(2)}`);
      console.log(`    LTV:CAC Ratio: ${metrics.ltvCacRatio.toFixed(2)}`);
      console.log(`    Payback Period: ${metrics.paybackPeriod.toFixed(1)} months`);
      console.log('');
    });

    // Health check
    const healthStatus = assessSaaSHealth(saasMetrics);
    console.log('SaaS Health Assessment:');
    console.log(`  Overall Status: ${healthStatus.status}`);
    console.log(`  Key Strengths: ${healthStatus.strengths.join(', ')}`);
    console.log(`  Areas for Improvement: ${healthStatus.improvements.join(', ')}`);

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
  console.log('=== Pricing Strategy Validation ===');

  try {
    const validationResults = await financialModelService.validatePricingTiers();

    console.log('Pricing Tier Validation Results:');
    Object.entries(validationResults).forEach(([segment, result]) => {
      console.log(`${segment.toUpperCase()} Tier ($${result.tier.monthlyPrice}/month):`);
      console.log(`  Validation Score: ${(result.validation.validationScore * 100).toFixed(1)}%`);
      console.log(`  Market Fit: ${result.marketFit}`);
      console.log(`  Competitive Position: ${result.competitivePosition}`);
      console.log(`  Is Viable: ${result.isViable ? 'Yes' : 'No'}`);
      console.log(`  Projected 5-Year NPV: $${result.tier.roiProjection.fiveYearNPV.toLocaleString()}`);
      console.log(`  Payback Period: ${result.tier.roiProjection.paybackPeriodMonths.toFixed(1)} months`);
      
      if (result.validation.riskFactors.length > 0) {
        console.log(`  Risk Factors: ${result.validation.riskFactors.join(', ')}`);
      }
      
      if (result.validation.recommendations.length > 0) {
        console.log(`  Recommendations: ${result.validation.recommendations.join(', ')}`);
      }
      console.log('');
    });

    // Pricing optimization recommendations
    const recommendations = generatePricingRecommendations(validationResults);
    console.log('Pricing Optimization Recommendations:');
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
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
  console.log('=== Investor Report Generation ===');

  try {
    const investorReport = await financialModelService.generateInvestorReport();

    console.log('EXECUTIVE SUMMARY');
    console.log('================');
    console.log(`Total Annual Revenue: $${investorReport.executiveSummary.totalRevenue.toLocaleString()}`);
    console.log(`Total Customers: ${investorReport.executiveSummary.totalCustomers.toLocaleString()}`);
    console.log(`Average LTV: $${investorReport.executiveSummary.averageLTV.toFixed(2)}`);
    console.log(`Average CAC: $${investorReport.executiveSummary.averageCAC.toFixed(2)}`);
    console.log(`LTV:CAC Ratio: ${investorReport.executiveSummary.ltvCacRatio.toFixed(2)}`);
    console.log(`Gross Margin: ${(investorReport.executiveSummary.grossMargin * 100).toFixed(1)}%`);
    console.log(`Monthly Burn Rate: $${investorReport.executiveSummary.monthlyBurnRate.toLocaleString()}`);
    console.log(`Months to Break-Even: ${investorReport.executiveSummary.monthsToBreakEven.toFixed(1)}`);
    console.log('');

    console.log('KEY INSIGHTS');
    console.log('============');
    investorReport.executiveSummary.keyInsights.forEach((insight, index) => {
      console.log(`${index + 1}. ${insight}`);
    });
    console.log('');

    console.log('FINANCIAL TRAJECTORY (Next 12 Months)');
    console.log('====================================');
    const projections12Months = investorReport.financialProjections.slice(0, 12);
    projections12Months.forEach((projection, index) => {
      if (index % 3 === 0) { // Show every 3rd month
        console.log(`Month ${projection.month}:`);
        console.log(`  Customers: ${projection.totalCustomers}`);
        console.log(`  MRR: $${projection.mrr.toLocaleString()}`);
        console.log(`  Net Profit: $${projection.netProfit.toLocaleString()}`);
        console.log('');
      }
    });

    console.log('COMPETITIVE LANDSCAPE');
    console.log('====================');
    console.log(`Market Size: $${(investorReport.competitiveAnalysis.marketSize / 1000000).toFixed(0)}M`);
    console.log(`Market Growth Rate: ${(investorReport.competitiveAnalysis.marketGrowthRate * 100).toFixed(1)}%`);
    console.log('Key Competitors:');
    investorReport.competitiveAnalysis.competitors.forEach(competitor => {
      console.log(`  ${competitor.name}: $${(competitor.estimatedRevenue / 1000000).toFixed(0)}M revenue, ${(competitor.marketShare * 100).toFixed(1)}% market share`);
    });
    console.log('');

    console.log('POSITIONING ADVANTAGES');
    console.log('=====================');
    investorReport.competitiveAnalysis.positioningAdvantage.forEach((advantage, index) => {
      console.log(`${index + 1}. ${advantage}`);
    });
    console.log('');

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
  console.log('=== Financial Scenario Planning ===');

  try {
    const scenarios = await financialModelService.modelFinancialScenarios();

    console.log('Scenario Analysis Results:');
    console.log('========================');

    scenarios.forEach(scenario => {
      console.log(`${scenario.name.toUpperCase()}`);
      console.log(`Growth Rate: ${(scenario.assumptions.customerGrowthRate * 100).toFixed(1)}%`);
      console.log(`Churn Rate: ${(scenario.assumptions.churnRate * 100).toFixed(1)}%`);
      console.log(`Price Change: ${(scenario.assumptions.priceIncrease * 100).toFixed(1)}%`);
      
      // 12-month projection
      const month12 = scenario.projections[11];
      if (month12) {
        console.log(`Projected Month 12:`);
        console.log(`  Customers: ${month12.totalCustomers}`);
        console.log(`  Revenue: $${month12.totalRevenue.toLocaleString()}`);
        console.log(`  Profit: $${month12.netProfit.toLocaleString()}`);
        console.log(`  Break-even: ${scenario.breakEvenAnalysis.monthsToBreakEven.toFixed(1)} months`);
      }

      // Sensitivity analysis
      console.log('Sensitivity Analysis:');
      scenario.sensitivityAnalysis.scenarios.forEach(sensitivity => {
        const direction = sensitivity.changePercent > 0 ? 'increase' : 'decrease';
        console.log(`  ${Math.abs(sensitivity.changePercent * 100).toFixed(0)}% ${direction}: ${(sensitivity.impactOnRevenue * 100).toFixed(1)}% revenue impact`);
      });
      console.log('');
    });

    // Scenario comparison
    console.log('SCENARIO COMPARISON (12-Month Outlook)');
    console.log('====================================');
    
    const comparison = scenarios.map(scenario => ({
      name: scenario.name,
      revenue: scenario.projections[11]?.totalRevenue || 0,
      customers: scenario.projections[11]?.totalCustomers || 0,
      profit: scenario.projections[11]?.netProfit || 0
    }));

    comparison.sort((a, b) => b.revenue - a.revenue);
    
    comparison.forEach((scenario, index) => {
      console.log(`${index + 1}. ${scenario.name}:`);
      console.log(`   Revenue: $${scenario.revenue.toLocaleString()}`);
      console.log(`   Customers: ${scenario.customers}`);
      console.log(`   Profit: $${scenario.profit.toLocaleString()}`);
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
  console.log('=== Cost Optimization Analysis ===');

  try {
    const cogsBreakdown = await financialModelService.calculateCOGS();

    console.log('Current Cost Structure:');
    console.log('======================');
    console.log(`Total COGS: $${cogsBreakdown.totalCOGS.toLocaleString()}`);
    console.log(`COGS per Customer: $${cogsBreakdown.cogsPerCustomer.toFixed(2)}`);
    console.log(`Gross Margin: ${(cogsBreakdown.marginPercentage * 100).toFixed(1)}%`);
    console.log('');

    console.log('Cost Breakdown:');
    console.log('Infrastructure Costs:');
    Object.entries(cogsBreakdown.infrastructureCosts).forEach(([category, cost]) => {
      console.log(`  ${category}: $${cost.toLocaleString()}`);
    });

    console.log('Support Costs:');
    Object.entries(cogsBreakdown.supportCosts).forEach(([category, cost]) => {
      console.log(`  ${category}: $${cost.toLocaleString()}`);
    });

    console.log('Compliance Costs:');
    Object.entries(cogsBreakdown.complianceCosts).forEach(([category, cost]) => {
      console.log(`  ${category}: $${cost.toLocaleString()}`);
    });

    console.log(`Product Development: $${cogsBreakdown.productDevelopment.toLocaleString()}`);
    console.log(`Third Party Services: $${cogsBreakdown.thirdPartyServices.toLocaleString()}`);
    console.log(`Data Processing: $${cogsBreakdown.dataProcessing.toLocaleString()}`);
    console.log('');

    // Cost optimization recommendations
    const optimizationRecommendations = generateCostOptimizationRecommendations(cogsBreakdown);
    console.log('Cost Optimization Opportunities:');
    optimizationRecommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
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
  console.log('=== COMPLETE FINANCIAL ANALYSIS ===');
  console.log('');

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

    console.log('=== ANALYSIS COMPLETE ===');
    console.log('Key takeaways:');
    console.log(`• ${saasMetrics.segmentBreakdown.startup.customers + saasMetrics.segmentBreakdown.growth.customers + saasMetrics.segmentBreakdown.enterprise.customers} total customers across 3 segments`);
    console.log(`• $${saasMetrics.arr.toLocaleString()} Annual Recurring Revenue`);
    console.log(`• ${(saasMetrics.netRevenueRetention * 100).toFixed(0)}% Net Revenue Retention`);
    console.log(`• ${presentationMetrics.monthsToBreakEven.toFixed(1)} months to break-even`);
    console.log(`• ${presentationMetrics.competitiveAdvantages} key competitive advantages`);

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