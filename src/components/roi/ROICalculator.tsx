import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calculator,
  DollarSign,
  TrendingUp,
  Users,
  Clock,
  Target,
  ChartBar,
  Zap,
  ArrowRight,
  Check,
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

interface ROIInputs {
  currentPatients: number;
  averageSessionRate: number;
  sessionsPerMonth: number;
  currentRetentionRate: number;
  referralRate: number;
  adminHoursPerWeek: number;
  selectedPlan: 'professional' | 'practice' | 'enterprise';
}

interface ROIResults {
  monthlyRevenueLift: number;
  annualRevenueLift: number;
  retentionValueIncrease: number;
  adminTimeSavings: number;
  referralRevenueIncrease: number;
  totalAnnualValue: number;
  planCost: number;
  netROI: number;
  roiPercentage: number;
  breakEvenMonths: number;
  fiveYearNPV: number;
}

const PRICING_PLANS = {
  professional: {
    name: 'Professional',
    price: 299,
    annualPrice: 3588,
    features: [
      'Up to 50 patients',
      'Basic analytics',
      'Crisis support system',
      'Standard integrations'
    ],
    retentionLift: 0.10,
    referralLift: 0.15,
    adminSavings: 5
  },
  practice: {
    name: 'Practice',
    price: 599,
    annualPrice: 7188,
    features: [
      'Up to 200 patients',
      'Advanced analytics',
      'Dual AI support',
      'CPT code automation',
      'Priority support'
    ],
    retentionLift: 0.15,
    referralLift: 0.25,
    adminSavings: 10
  },
  enterprise: {
    name: 'Enterprise',
    price: 1999,
    annualPrice: 23988,
    features: [
      'Unlimited patients',
      'Custom analytics',
      'API access',
      'Custom integrations',
      'Dedicated support',
      'Training included'
    ],
    retentionLift: 0.20,
    referralLift: 0.35,
    adminSavings: 20
  }
};

// Based on research: $4.5-9k annual value per retained patient
const PATIENT_LIFETIME_VALUE = 6750; // Average of $4.5k-9k
const HOURLY_ADMIN_COST = 35;
const AVERAGE_REFERRAL_VALUE = 2000;

export function ROICalculator() {
  const [inputs, setInputs] = useState<ROIInputs>({
    currentPatients: 40,
    averageSessionRate: 150,
    sessionsPerMonth: 3,
    currentRetentionRate: 70,
    referralRate: 10,
    adminHoursPerWeek: 15,
    selectedPlan: 'practice'
  });

  const [results, setResults] = useState<ROIResults | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    calculateROI();
  }, [inputs]);

  const calculateROI = () => {
    const plan = PRICING_PLANS[inputs.selectedPlan];
    
    // Retention value increase
    const improvedRetention = inputs.currentRetentionRate + (plan.retentionLift * 100);
    const retentionDifference = improvedRetention - inputs.currentRetentionRate;
    const additionalRetainedPatients = (inputs.currentPatients * retentionDifference) / 100;
    const retentionValueIncrease = additionalRetainedPatients * PATIENT_LIFETIME_VALUE;
    
    // Revenue from increased retention (monthly sessions)
    const monthlyRetentionRevenue = additionalRetainedPatients * 
      inputs.averageSessionRate * inputs.sessionsPerMonth;
    
    // Referral revenue increase
    const improvedReferralRate = inputs.referralRate + (plan.referralLift * inputs.referralRate);
    const additionalReferrals = ((improvedReferralRate - inputs.referralRate) / 100) * inputs.currentPatients;
    const annualReferralRevenue = additionalReferrals * AVERAGE_REFERRAL_VALUE;
    
    // Admin time savings
    const weeklyHoursSaved = plan.adminSavings;
    const annualHoursSaved = weeklyHoursSaved * 52;
    const adminTimeSavings = annualHoursSaved * HOURLY_ADMIN_COST;
    
    // Total calculations
    const monthlyRevenueLift = monthlyRetentionRevenue + (annualReferralRevenue / 12);
    const annualRevenueLift = monthlyRevenueLift * 12;
    const totalAnnualValue = annualRevenueLift + adminTimeSavings;
    const netROI = totalAnnualValue - plan.annualPrice;
    const roiPercentage = (netROI / plan.annualPrice) * 100;
    const breakEvenMonths = plan.annualPrice / monthlyRevenueLift;
    
    // 5-year NPV calculation (assuming 10% discount rate)
    const discountRate = 0.10;
    let fiveYearNPV = 0;
    for (let year = 1; year <= 5; year++) {
      const yearValue = totalAnnualValue - plan.annualPrice;
      fiveYearNPV += yearValue / Math.pow(1 + discountRate, year);
    }
    
    setResults({
      monthlyRevenueLift,
      annualRevenueLift,
      retentionValueIncrease,
      adminTimeSavings,
      referralRevenueIncrease: annualReferralRevenue,
      totalAnnualValue,
      planCost: plan.annualPrice,
      netROI,
      roiPercentage,
      breakEvenMonths,
      fiveYearNPV
    });
  };

  const generateProjectionData = () => {
    if (!results) return [];
    
    const data = [];
    for (let month = 0; month <= 24; month++) {
      const revenue = month * results.monthlyRevenueLift;
      const cost = month === 0 ? 0 : (month / 12) * PRICING_PLANS[inputs.selectedPlan].annualPrice;
      data.push({
        month,
        revenue,
        cost,
        netValue: revenue - cost
      });
    }
    return data;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Calculator className="h-6 w-6" />
                ROI Calculator
              </CardTitle>
              <CardDescription className="mt-2">
                Calculate your return on investment with Serenity's mental health platform
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {results && `${results.roiPercentage.toFixed(0)}% ROI`}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Input Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Your Practice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Your Plan</label>
            <Tabs value={inputs.selectedPlan} onValueChange={(v) => setInputs({...inputs, selectedPlan: v as any})}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="professional">Professional</TabsTrigger>
                <TabsTrigger value="practice">Practice</TabsTrigger>
                <TabsTrigger value="enterprise">Enterprise</TabsTrigger>
              </TabsList>
              <TabsContent value={inputs.selectedPlan} className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">
                        {PRICING_PLANS[inputs.selectedPlan].name}
                      </h3>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          ${PRICING_PLANS[inputs.selectedPlan].price}/mo
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ${PRICING_PLANS[inputs.selectedPlan].annualPrice}/year
                        </div>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {PRICING_PLANS[inputs.selectedPlan].features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Input Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Current Patients</label>
                <span className="text-sm font-bold">{inputs.currentPatients}</span>
              </div>
              <Slider
                value={[inputs.currentPatients]}
                onValueChange={([v]) => setInputs({...inputs, currentPatients: v})}
                min={10}
                max={200}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Average Session Rate</label>
                <span className="text-sm font-bold">${inputs.averageSessionRate}</span>
              </div>
              <Slider
                value={[inputs.averageSessionRate]}
                onValueChange={([v]) => setInputs({...inputs, averageSessionRate: v})}
                min={50}
                max={300}
                step={10}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Sessions per Patient/Month</label>
                <span className="text-sm font-bold">{inputs.sessionsPerMonth}</span>
              </div>
              <Slider
                value={[inputs.sessionsPerMonth]}
                onValueChange={([v]) => setInputs({...inputs, sessionsPerMonth: v})}
                min={1}
                max={8}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Current Retention Rate</label>
                <span className="text-sm font-bold">{inputs.currentRetentionRate}%</span>
              </div>
              <Slider
                value={[inputs.currentRetentionRate]}
                onValueChange={([v]) => setInputs({...inputs, currentRetentionRate: v})}
                min={40}
                max={90}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Referral Rate</label>
                <span className="text-sm font-bold">{inputs.referralRate}%</span>
              </div>
              <Slider
                value={[inputs.referralRate]}
                onValueChange={([v]) => setInputs({...inputs, referralRate: v})}
                min={5}
                max={30}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Admin Hours/Week</label>
                <span className="text-sm font-bold">{inputs.adminHoursPerWeek}h</span>
              </div>
              <Slider
                value={[inputs.adminHoursPerWeek]}
                onValueChange={([v]) => setInputs({...inputs, adminHoursPerWeek: v})}
                min={5}
                max={40}
                step={5}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      {results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle className="text-xl">Your ROI Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <div className="text-3xl font-bold text-green-600">
                    {formatCurrency(results.netROI)}
                  </div>
                  <div className="text-sm text-muted-foreground">Annual Net ROI</div>
                </div>

                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <Zap className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <div className="text-3xl font-bold text-blue-600">
                    {results.roiPercentage.toFixed(0)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Return on Investment</div>
                </div>

                <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <div className="text-3xl font-bold text-purple-600">
                    {results.breakEvenMonths.toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground">Months to Break Even</div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="mt-6 space-y-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? 'Hide' : 'Show'} Detailed Breakdown
                  <ArrowRight className={`ml-2 h-4 w-4 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
                </Button>

                {showDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3 pt-4 border-t"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Revenue from Retention Improvement</span>
                      <span className="font-semibold">{formatCurrency(results.annualRevenueLift)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Referral Revenue Increase</span>
                      <span className="font-semibold">{formatCurrency(results.referralRevenueIncrease)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Admin Time Savings</span>
                      <span className="font-semibold">{formatCurrency(results.adminTimeSavings)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t">
                      <span className="text-sm font-medium">Total Annual Value</span>
                      <span className="font-bold text-lg">{formatCurrency(results.totalAnnualValue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Serenity Platform Cost</span>
                      <span className="font-bold text-red-600">-{formatCurrency(results.planCost)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t">
                      <span className="font-medium">Net Annual ROI</span>
                      <span className="font-bold text-xl text-green-600">{formatCurrency(results.netROI)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">5-Year NPV (10% discount)</span>
                      <span className="font-semibold">{formatCurrency(results.fiveYearNPV)}</span>
                    </div>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Projection Chart */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>24-Month Revenue Projection</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={generateProjectionData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" label={{ value: 'Months', position: 'insideBottom', offset: -5 }} />
                <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stackId="1"
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.6}
                  name="Cumulative Revenue"
                />
                <Area 
                  type="monotone" 
                  dataKey="cost" 
                  stackId="2"
                  stroke="#ef4444" 
                  fill="#ef4444" 
                  fillOpacity={0.6}
                  name="Platform Cost"
                />
                <Line 
                  type="monotone" 
                  dataKey="netValue" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Net Value"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Call to Action */}
      <Alert className="border-primary">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <strong>Ready to transform your practice?</strong>
              <p className="text-sm mt-1">
                Based on your inputs, Serenity can deliver a {results?.roiPercentage.toFixed(0)}% ROI 
                with {formatCurrency(results?.netROI || 0)} in annual value.
              </p>
            </div>
            <Button className="ml-4">
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}