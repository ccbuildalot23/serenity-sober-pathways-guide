/**
 * Provider Onboarding Component
 * Displays pricing tiers, calculates ROI, and educates about tri-user architecture
 * Integrates with ROIValidationService for real-time financial validation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Shield, 
  Activity,
  Brain,
  Clock,
  Award,
  AlertCircle,
  ChevronRight,
  Calculator,
  Sparkles
} from 'lucide-react';
import { ROIValidationService } from '@/services/ROIValidationService';
import { supabase } from '@/integrations/supabase/client';
import { enhancedSecurityAuditService } from '@/services/EnhancedSecurityAuditService';

interface PricingTier {
  id: 'starter' | 'professional' | 'enterprise';
  name: string;
  price: number;
  description: string;
  features: string[];
  patientLimit: number;
  supportLevel: string;
  setupFee: number;
  recommended?: boolean;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

interface PracticeMetrics {
  monthlyPatients: number;
  averageSessionsPerPatient: number;
  currentNoShowRate: number;
  averageReimbursementRate: number;
  patientRetentionRate: number;
  referralSourceCount: number;
}

interface ROIProjection {
  monthlyRevenue: number;
  platformCost: number;
  netBenefit: number;
  roiMultiple: number;
  paybackPeriod: number;
  fiveYearValue: number;
  breakEvenMonth: number;
}

export const ProviderOnboarding: React.FC = () => {
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [practiceMetrics, setPracticeMetrics] = useState<PracticeMetrics>({
    monthlyPatients: 100,
    averageSessionsPerPatient: 8,
    currentNoShowRate: 15,
    averageReimbursementRate: 150,
    patientRetentionRate: 70,
    referralSourceCount: 5
  });
  const [roiProjection, setRoiProjection] = useState<ROIProjection | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showROIDetails, setShowROIDetails] = useState(false);

  const roiService = new ROIValidationService();

  const pricingTiers: PricingTier[] = [
    {
      id: 'starter',
      name: 'Starter',
      price: 299,
      description: 'Perfect for solo practitioners',
      features: [
        'Up to 50 active patients',
        'Crisis detection & response',
        'Daily check-in system',
        'Basic analytics',
        'Email support',
        'HIPAA compliance',
        'Mobile app access'
      ],
      patientLimit: 50,
      supportLevel: 'Email',
      setupFee: 0
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 599,
      description: 'Ideal for growing practices',
      features: [
        'Up to 200 active patients',
        'Advanced crisis AI',
        'Clinical documentation automation',
        'CPT/ICD-10 code suggestions',
        'Priority support',
        'Custom integrations',
        'Team collaboration tools',
        'Advanced analytics & insights'
      ],
      patientLimit: 200,
      supportLevel: 'Priority',
      setupFee: 299,
      recommended: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 1999,
      description: 'For large practices & organizations',
      features: [
        'Unlimited patients',
        'White-label options',
        'Dedicated success manager',
        'Custom AI training',
        'API access',
        'Multi-location support',
        '24/7 phone support',
        'Compliance reporting',
        'Revenue optimization AI'
      ],
      patientLimit: -1,
      supportLevel: '24/7 Dedicated',
      setupFee: 999
    }
  ];

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Serenity',
      description: 'Learn about our tri-user architecture',
      completed: currentStep > 0
    },
    {
      id: 'metrics',
      title: 'Practice Metrics',
      description: 'Tell us about your practice',
      completed: currentStep > 1
    },
    {
      id: 'pricing',
      title: 'Select Your Plan',
      description: 'Choose the right tier for your practice',
      completed: currentStep > 2
    },
    {
      id: 'roi',
      title: 'ROI Validation',
      description: 'See your projected returns',
      completed: currentStep > 3
    },
    {
      id: 'setup',
      title: 'Account Setup',
      description: 'Configure your practice account',
      completed: currentStep > 4
    }
  ];

  useEffect(() => {
    if (practiceMetrics.monthlyPatients > 0) {
      calculateROI();
    }
  }, [practiceMetrics, selectedTier, calculateROI]);

  const calculateROI = useCallback(async () => {
    if (!selectedTier) return;
    
    setIsCalculating(true);
    try {
      const validation = await roiService.validateProviderROI({
        monthlyPatients: practiceMetrics.monthlyPatients,
        averageSessionsPerPatient: practiceMetrics.averageSessionsPerPatient,
        averageReimbursementRate: practiceMetrics.averageReimbursementRate,
        platformCost: selectedTier.price,
        currentNoShowRate: practiceMetrics.currentNoShowRate / 100,
        currentReadmissionRate: 0.2, // Default
        patientRetentionRate: practiceMetrics.patientRetentionRate / 100
      });

      const projection: ROIProjection = {
        monthlyRevenue: validation.metrics.additionalRevenue,
        platformCost: selectedTier.price,
        netBenefit: validation.metrics.netBenefit,
        roiMultiple: validation.metrics.roiMultiple,
        paybackPeriod: validation.metrics.paybackPeriod,
        fiveYearValue: validation.projectedOutcomes.fiveYearValue,
        breakEvenMonth: Math.ceil(selectedTier.price / validation.metrics.netBenefit)
      };

      setRoiProjection(projection);
    } catch (error) {
      console.error('ROI calculation error:', error);
    } finally {
      setIsCalculating(false);
    }
  }, [selectedTier, practiceMetrics, roiService]);

  const renderWelcomeStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to Serenity Sober Pathways
        </h2>
        <p className="text-lg text-gray-600">
          The HIPAA-compliant platform that transforms mental health & addiction recovery
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <Users className="h-10 w-10 text-blue-600 mb-2" />
            <CardTitle className="text-lg">Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Engage patients with daily check-ins, crisis support, and peer connections
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              <li>• One-tap crisis alerts</li>
              <li>• Mood & symptom tracking</li>
              <li>• Milestone celebrations</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <Shield className="h-10 w-10 text-green-600 mb-2" />
            <CardTitle className="text-lg">Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Streamline operations with AI-powered documentation and analytics
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              <li>• Automated clinical notes</li>
              <li>• CPT/ICD-10 suggestions</li>
              <li>• Real-time dashboards</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <Activity className="h-10 w-10 text-purple-600 mb-2" />
            <CardTitle className="text-lg">Support Network</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Enable family & friends to provide timely support when needed
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              <li>• Crisis notifications</li>
              <li>• Progress updates</li>
              <li>• Coordinated care</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>Key Innovation:</strong> Our tri-user architecture ensures 24/7 support coverage 
          while reducing provider burden and improving patient outcomes.
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderMetricsStep = () => (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Tell Us About Your Practice
        </h3>
        <p className="text-gray-600">
          We'll use this information to calculate your personalized ROI projection
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="monthly-patients">Active Patients per Month</Label>
          <Input
            id="monthly-patients"
            type="number"
            value={practiceMetrics.monthlyPatients}
            onChange={(e) => setPracticeMetrics(prev => ({
              ...prev,
              monthlyPatients: parseInt(e.target.value) || 0
            }))}
            placeholder="100"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sessions">Average Sessions per Patient</Label>
          <Input
            id="sessions"
            type="number"
            value={practiceMetrics.averageSessionsPerPatient}
            onChange={(e) => setPracticeMetrics(prev => ({
              ...prev,
              averageSessionsPerPatient: parseInt(e.target.value) || 0
            }))}
            placeholder="8"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reimbursement">Average Reimbursement Rate ($)</Label>
          <Input
            id="reimbursement"
            type="number"
            value={practiceMetrics.averageReimbursementRate}
            onChange={(e) => setPracticeMetrics(prev => ({
              ...prev,
              averageReimbursementRate: parseInt(e.target.value) || 0
            }))}
            placeholder="150"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="no-show">Current No-Show Rate (%)</Label>
          <Input
            id="no-show"
            type="number"
            value={practiceMetrics.currentNoShowRate}
            onChange={(e) => setPracticeMetrics(prev => ({
              ...prev,
              currentNoShowRate: parseInt(e.target.value) || 0
            }))}
            placeholder="15"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="retention">Patient Retention Rate (%)</Label>
          <Input
            id="retention"
            type="number"
            value={practiceMetrics.patientRetentionRate}
            onChange={(e) => setPracticeMetrics(prev => ({
              ...prev,
              patientRetentionRate: parseInt(e.target.value) || 0
            }))}
            placeholder="70"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="referrals">Number of Referral Sources</Label>
          <Input
            id="referrals"
            type="number"
            value={practiceMetrics.referralSourceCount}
            onChange={(e) => setPracticeMetrics(prev => ({
              ...prev,
              referralSourceCount: parseInt(e.target.value) || 0
            }))}
            placeholder="5"
          />
        </div>
      </div>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Brain className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                Industry Benchmark
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Practices using Serenity see an average 23% reduction in no-shows 
                and 31% improvement in patient retention within 6 months.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPricingStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Choose Your Plan
        </h3>
        <p className="text-gray-600">
          All plans include HIPAA compliance, crisis detection, and mobile apps
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {pricingTiers.map((tier) => (
          <Card 
            key={tier.id}
            className={`relative cursor-pointer transition-all ${
              selectedTier?.id === tier.id 
                ? 'ring-2 ring-blue-500 shadow-lg' 
                : 'hover:shadow-md'
            } ${tier.recommended ? 'border-blue-500' : ''}`}
            onClick={() => setSelectedTier(tier)}
          >
            {tier.recommended && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-500 text-white">
                  MOST POPULAR
                </Badge>
              </div>
            )}
            
            <CardHeader>
              <CardTitle className="text-xl">{tier.name}</CardTitle>
              <div className="mt-4">
                <span className="text-3xl font-bold">${tier.price}</span>
                <span className="text-gray-500">/month</span>
              </div>
              {tier.setupFee > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  + ${tier.setupFee} one-time setup
                </p>
              )}
              <CardDescription className="mt-2">
                {tier.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <ul className="space-y-2">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <div className="mt-6 pt-6 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Patient Limit</span>
                  <span className="font-medium">
                    {tier.patientLimit === -1 ? 'Unlimited' : tier.patientLimit}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-gray-600">Support</span>
                  <span className="font-medium">{tier.supportLevel}</span>
                </div>
              </div>
              
              {selectedTier?.id === tier.id && (
                <div className="mt-4">
                  <Badge className="w-full justify-center bg-blue-100 text-blue-700">
                    Selected
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderROIStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Your ROI Projection
        </h3>
        <p className="text-gray-600">
          Based on your practice metrics and selected plan
        </p>
      </div>

      {isCalculating ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Calculating your ROI...</p>
          </div>
        </div>
      ) : roiProjection ? (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-green-600">
                      +${roiProjection.monthlyRevenue.toLocaleString()}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Platform Cost</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${roiProjection.platformCost}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">ROI Multiple</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {roiProjection.roiMultiple.toFixed(1)}x
                    </p>
                  </div>
                  <Sparkles className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Break Even</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {roiProjection.breakEvenMonth} mo
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <Award className="h-6 w-6 text-green-600 mr-2" />
                5-Year Value Projection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700 mb-2">
                ${roiProjection.fiveYearValue.toLocaleString()}
              </div>
              <p className="text-sm text-green-600">
                Total value generated over 5 years from improved outcomes, 
                reduced no-shows, and increased patient retention
              </p>
              
              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>No-show reduction</span>
                    <span className="font-medium">23%</span>
                  </div>
                  <Progress value={23} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Patient retention improvement</span>
                    <span className="font-medium">31%</span>
                  </div>
                  <Progress value={31} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Documentation time saved</span>
                    <span className="font-medium">40%</span>
                  </div>
                  <Progress value={40} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={() => setShowROIDetails(!showROIDetails)}
            variant="outline"
            className="w-full"
          >
            <Calculator className="h-4 w-4 mr-2" />
            {showROIDetails ? 'Hide' : 'Show'} Detailed Calculations
          </Button>

          {showROIDetails && (
            <Card>
              <CardHeader>
                <CardTitle>ROI Calculation Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current monthly revenue</span>
                    <span>${(practiceMetrics.monthlyPatients * practiceMetrics.averageSessionsPerPatient * practiceMetrics.averageReimbursementRate).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Revenue lost to no-shows</span>
                    <span className="text-red-600">-${(practiceMetrics.monthlyPatients * practiceMetrics.averageSessionsPerPatient * practiceMetrics.averageReimbursementRate * practiceMetrics.currentNoShowRate / 100).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Recovered with Serenity (23% reduction)</span>
                    <span className="text-green-600">+${(practiceMetrics.monthlyPatients * practiceMetrics.averageSessionsPerPatient * practiceMetrics.averageReimbursementRate * practiceMetrics.currentNoShowRate * 0.23 / 100).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Additional sessions from retention</span>
                    <span className="text-green-600">+${(practiceMetrics.monthlyPatients * 2 * practiceMetrics.averageReimbursementRate * 0.31).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-medium">
                    <span>Net monthly benefit</span>
                    <span className="text-green-600">${roiProjection.netBenefit.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please complete the practice metrics step to see your ROI projection
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  const renderSetupStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Let's Set Up Your Account
        </h3>
        <p className="text-gray-600">
          We'll guide you through the setup process step by step
        </p>
      </div>

      <div className="space-y-4">
        {[
          { title: 'Practice Information', time: '2 min', icon: Users },
          { title: 'HIPAA Compliance', time: '5 min', icon: Shield },
          { title: 'Team Members', time: '3 min', icon: Users },
          { title: 'Integration Setup', time: '5 min', icon: Activity },
          { title: 'Customize Workflows', time: '10 min', icon: Brain }
        ].map((step, idx) => (
          <Card key={idx} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <step.icon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">{step.title}</p>
                  <p className="text-sm text-gray-500">{step.time}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Alert className="border-green-200 bg-green-50">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-900">
          <strong>Success Manager Available:</strong> Your dedicated success manager 
          will be available throughout setup to ensure smooth onboarding.
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderWelcomeStep();
      case 1:
        return renderMetricsStep();
      case 2:
        return renderPricingStep();
      case 3:
        return renderROIStep();
      case 4:
        return renderSetupStep();
      default:
        return renderWelcomeStep();
    }
  };

  const handleNext = async () => {
    if (currentStep === 2 && !selectedTier) {
      console.error('Please select a pricing tier to continue');
      return;
    }

    if (currentStep === 4) {
      // Complete onboarding
      await completeOnboarding();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const completeOnboarding = async () => {
    if (!selectedTier) return;

    try {
      // Log onboarding completion
      await enhancedSecurityAuditService.logSecurityEvent(
        'PROVIDER_ONBOARDING_COMPLETE',
        {
          tier: selectedTier.id,
          price: selectedTier.price,
          roiMultiple: roiProjection?.roiMultiple,
          practiceSize: practiceMetrics.monthlyPatients
        },
        'low'
      );

      // Store onboarding data
      const { data: profile } = await supabase.auth.getUser();
      if (profile?.user) {
        await supabase.from('provider_onboarding').insert({
          provider_id: profile.user.id,
          selected_tier: selectedTier.id,
          practice_metrics: practiceMetrics,
          roi_projection: roiProjection,
          completed_at: new Date().toISOString()
        });
      }

      // Redirect to dashboard
      window.location.href = '/provider-dashboard';
    } catch (error) {
      console.error('Onboarding completion error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {onboardingSteps.map((step, idx) => (
              <div
                key={step.id}
                className={`flex items-center ${
                  idx < onboardingSteps.length - 1 ? 'flex-1' : ''
                }`}
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    idx <= currentStep
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'bg-white border-gray-300 text-gray-500'
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{idx + 1}</span>
                  )}
                </div>
                {idx < onboardingSteps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      idx < currentStep ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            {onboardingSteps.map((step) => (
              <div key={step.id} className="text-center" style={{ width: '20%' }}>
                <p className="text-sm font-medium text-gray-900">{step.title}</p>
                <p className="text-xs text-gray-500 mt-1">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          {renderCurrentStep()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
          >
            Previous
          </Button>

          <div className="flex items-center space-x-2">
            {onboardingSteps.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full ${
                  idx === currentStep ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <Button
            onClick={handleNext}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {currentStep === 4 ? 'Complete Setup' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
};