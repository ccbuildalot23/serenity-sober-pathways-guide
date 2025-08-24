/**
 * Financial Model Types
 * 
 * Comprehensive type definitions for financial modeling, metrics,
 * and reporting in the Serenity platform.
 */

// Re-export all financial types from the service for easy importing
export type {
  LTVMetrics,
  CACMetrics,
  COGSBreakdown,
  InfrastructureCosts,
  SupportCosts,
  ComplianceCosts,
  CACBreakdown,
  CohortData,
  SaaSMetrics,
  SegmentMetrics,
  ProviderSegment,
  PricingTier,
  FinancialScenario,
  ScenarioAssumptions,
  FinancialProjection,
  SensitivityAnalysis,
  SensitivityScenario,
  BreakEvenAnalysis,
  InvestorReport,
  ExecutiveSummary,
  UnitEconomics,
  CohortAnalysis,
  CompetitiveAnalysis,
  CompetitorMetrics,
  RiskFactor
} from '@/services/FinancialModelService';

// Additional financial metric types for specific use cases

export interface RevenueMetrics {
  monthly: MonthlyRevenue[];
  quarterly: QuarterlyRevenue[];
  annual: AnnualRevenue[];
  growth: GrowthMetrics;
}

export interface MonthlyRevenue {
  month: string; // YYYY-MM format
  newBusinessRevenue: number;
  expansionRevenue: number;
  churnedRevenue: number;
  contractedRevenue: number;
  netNewRevenue: number;
  totalRevenue: number;
}

export interface QuarterlyRevenue {
  quarter: string; // Q1 2025 format
  totalRevenue: number;
  yearOverYearGrowth: number;
  quarterOverQuarterGrowth: number;
}

export interface AnnualRevenue {
  year: number;
  totalRevenue: number;
  recurringRevenue: number;
  oneTimeRevenue: number;
  yearOverYearGrowth: number;
}

export interface GrowthMetrics {
  monthlyGrowthRate: number;
  quarterlyGrowthRate: number;
  annualGrowthRate: number;
  compoundAnnualGrowthRate: number; // CAGR
}

export interface CustomerMetrics {
  totalCustomers: number;
  newCustomers: number;
  churnedCustomers: number;
  reactivatedCustomers: number;
  customerGrowthRate: number;
  customerLifetimeMonths: number;
  segmentDistribution: Record<ProviderSegment, number>;
}

export interface ProfitabilityMetrics {
  grossProfit: number;
  grossMargin: number;
  operatingProfit: number;
  operatingMargin: number;
  netProfit: number;
  netMargin: number;
  ebitda: number;
  ebitdaMargin: number;
}

export interface CashFlowMetrics {
  operatingCashFlow: number;
  freeCashFlow: number;
  cashBurnRate: number;
  monthsOfCashRemaining: number;
  cashConversionCycle: number;
}

export interface FinancialHealth {
  quickRatio: number;
  currentRatio: number;
  debtToEquityRatio: number;
  returnOnAssets: number;
  returnOnEquity: number;
  workingCapital: number;
}

export interface Forecasting {
  revenue: ForecastData[];
  customers: ForecastData[];
  costs: ForecastData[];
  profitability: ForecastData[];
  confidence: ForecastConfidence;
}

export interface ForecastData {
  period: string;
  actualValue?: number;
  forecastValue: number;
  lowerBound: number;
  upperBound: number;
  variance?: number;
}

export interface ForecastConfidence {
  overall: number; // 0-1 scale
  revenue: number;
  customers: number;
  costs: number;
  factors: ConfidenceFactor[];
}

export interface ConfidenceFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
}

// Pricing and revenue optimization types

export interface PricingOptimization {
  currentPricing: PricingTier[];
  recommendedPricing: PricingTier[];
  impactAnalysis: PricingImpact;
  elasticityAnalysis: PriceElasticity[];
}

export interface PricingImpact {
  revenueChange: number;
  customerImpact: number;
  competitiveResponse: string;
  implementationRisk: 'low' | 'medium' | 'high';
}

export interface PriceElasticity {
  segment: ProviderSegment;
  elasticity: number; // % change in demand / % change in price
  priceOptimizationRange: {
    min: number;
    max: number;
    optimal: number;
  };
}

// Financial reporting and compliance types

export interface FinancialStatement {
  period: string;
  incomeStatement: IncomeStatement;
  balanceSheet: BalanceSheet;
  cashFlowStatement: CashFlowStatement;
  notes: string[];
}

export interface IncomeStatement {
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  operatingExpenses: OperatingExpenses;
  operatingIncome: number;
  otherIncomeExpense: number;
  netIncome: number;
}

export interface OperatingExpenses {
  salesAndMarketing: number;
  researchAndDevelopment: number;
  generalAndAdministrative: number;
  total: number;
}

export interface BalanceSheet {
  assets: Assets;
  liabilities: Liabilities;
  equity: Equity;
}

export interface Assets {
  currentAssets: CurrentAssets;
  nonCurrentAssets: NonCurrentAssets;
  totalAssets: number;
}

export interface CurrentAssets {
  cash: number;
  accountsReceivable: number;
  prepaidExpenses: number;
  total: number;
}

export interface NonCurrentAssets {
  propertyPlantEquipment: number;
  intangibleAssets: number;
  total: number;
}

export interface Liabilities {
  currentLiabilities: CurrentLiabilities;
  nonCurrentLiabilities: NonCurrentLiabilities;
  totalLiabilities: number;
}

export interface CurrentLiabilities {
  accountsPayable: number;
  accruedExpenses: number;
  deferredRevenue: number;
  total: number;
}

export interface NonCurrentLiabilities {
  longTermDebt: number;
  total: number;
}

export interface Equity {
  shareCapital: number;
  retainedEarnings: number;
  total: number;
}

export interface CashFlowStatement {
  operatingActivities: number;
  investingActivities: number;
  financingActivities: number;
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
}

// Investor and valuation types

export interface ValuationMetrics {
  revenueMultiple: number;
  ebitdaMultiple: number;
  priceToSalesRatio: number;
  enterpriseValue: number;
  discountedCashFlow: DCFValuation;
  comparableCompanyAnalysis: ComparableCompany[];
}

export interface DCFValuation {
  projectionYears: number;
  terminalGrowthRate: number;
  discountRate: number;
  presentValue: number;
  terminalValue: number;
  enterpriseValue: number;
  equityValue: number;
}

export interface ComparableCompany {
  name: string;
  revenueMultiple: number;
  ebitdaMultiple: number;
  growthRate: number;
  margin: number;
  marketCap: number;
}

export interface InvestmentRounds {
  seed?: InvestmentRound;
  seriesA?: InvestmentRound;
  seriesB?: InvestmentRound;
  seriesC?: InvestmentRound;
}

export interface InvestmentRound {
  amount: number;
  valuation: number;
  investors: Investor[];
  useOfFunds: UseOfFunds;
  date: Date;
}

export interface Investor {
  name: string;
  type: 'angel' | 'vc' | 'strategic' | 'institution';
  amount: number;
  ownership: number;
}

export interface UseOfFunds {
  productDevelopment: number;
  salesAndMarketing: number;
  hiring: number;
  workingCapital: number;
  other: number;
}

// Financial model configuration and settings

export interface FinancialModelConfig {
  reportingCurrency: string;
  fiscalYearEnd: string;
  reportingFrequency: 'monthly' | 'quarterly' | 'annually';
  forecastHorizon: number; // months
  confidenceInterval: number; // 0.9 for 90%
  segmentationStrategy: 'size' | 'industry' | 'geography' | 'custom';
  pricingStrategy: 'value' | 'cost-plus' | 'competitive' | 'dynamic';
}

export interface FinancialAlerts {
  churnThreshold: number;
  growthThreshold: number;
  marginThreshold: number;
  cashFlowThreshold: number;
  enabled: boolean;
  recipients: string[];
}

// Performance benchmarks and KPIs

export interface PerformanceBenchmarks {
  industry: IndustryBenchmarks;
  stage: StageBenchmarks;
  size: SizeBenchmarks;
}

export interface IndustryBenchmarks {
  averageLTV: number;
  averageCAC: number;
  averageChurnRate: number;
  averageGrossMargin: number;
  averageNRR: number;
  source: string;
  lastUpdated: Date;
}

export interface StageBenchmarks {
  stage: 'seed' | 'early' | 'growth' | 'mature';
  expectedGrowthRate: number;
  expectedBurnRate: number;
  expectedEfficiency: number;
}

export interface SizeBenchmarks {
  revenueRange: string;
  medianMetrics: Record<string, number>;
  percentileMetrics: Record<string, Record<string, number>>;
}

// Export utility types for the financial model

export type FinancialPeriod = 'monthly' | 'quarterly' | 'annually';
export type MetricTrend = 'improving' | 'stable' | 'declining';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type FinancialStatus = 'healthy' | 'warning' | 'critical';

export interface MetricWithTrend<T = number> {
  value: T;
  trend: MetricTrend;
  changePercent: number;
  confidence: ConfidenceLevel;
}

export interface FinancialSummary {
  status: FinancialStatus;
  keyMetrics: Record<string, MetricWithTrend>;
  alerts: string[];
  recommendations: string[];
  lastUpdated: Date;
}