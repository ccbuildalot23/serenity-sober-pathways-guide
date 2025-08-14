/**
 * Enhanced Provider Onboarding Component
 * Integrates with PredictiveSalesEngine and CRM for seamless onboarding
 * Includes ROI calculator, pricing tier selection, and conversion tracking
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ProviderOnboardingService } from '@/services/ProviderOnboardingService';
import { PredictiveSalesEngine } from '@/services/PredictiveSalesEngine';
import { CRMIntegrationService } from '@/services/CRMIntegrationService';
import { ROIValidationService } from '@/services/ROIValidationService';
import { FinancialModelService } from '@/services/FinancialModelService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, Calculator, TrendingUp, Users, Shield, Zap, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface PracticeInfo {
  name: string;
  size: number;
  specialty: string;
  location: {
    state: string;
    city: string;
    zipCode: string;
  };
  currentPatients: number;
  monthlyRevenue: number;
  averageSessionFee: number;
  insuranceAccepted: string[];
  currentChallenges: string[];
}

interface ROIProjection {
  monthlyRevenueLift: number;
  efficiencyGains: number;
  retentionImprovement: number;
  newPatientCapacity: number;
  costSavings: number;
  paybackPeriodMonths: number;
  fiveYearNPV: number;
  roiPercentage: number;
}

interface PricingTier {
  id: string;
  name: string;
  price: number;
  features: string[];
  recommended?: boolean;
}

const EnhancedProviderOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [practiceInfo, setPracticeInfo] = useState<PracticeInfo>({
    name: '',
    size: 1,
    specialty: '',
    location: { state: '', city: '', zipCode: '' },
    currentPatients: 0,
    monthlyRevenue: 0,
    averageSessionFee: 150,
    insuranceAccepted: [],
    currentChallenges: []
  });
  const [selectedTier, setSelectedTier] = useState<string>('professional');
  const [roiProjection, setRoiProjection] = useState<ROIProjection | null>(null);
  const [leadScore, setLeadScore] = useState<number>(0);
  const [conversionProbability, setConversionProbability] = useState<number>(0);
  const [competitorComparison, setCompetitorComparison] = useState<any>(null);
  const [onboardingId, setOnboardingId] = useState<string>('');

  const onboardingService = new ProviderOnboardingService();
  const salesEngine = new PredictiveSalesEngine();
  const crmService = new CRMIntegrationService();
  const roiService = new ROIValidationService();
  const financialModel = new FinancialModelService();

  const pricingTiers: PricingTier[] = [
    {
      id: 'professional',
      name: 'Professional',
      price: 299,
      features: [
        'Up to 50 patients',
        'Clinical documentation',
        'Basic billing support',
        'HIPAA compliance',
        'Email support'
      ]
    },
    {
      id: 'practice',
      name: 'Practice',
      price: 599,
      features: [
        'Unlimited patients',
        'AI-powered insights',
        'Advanced billing',
        'Care coordination',
        'Priority support',
        'Custom integrations'
      ],
      recommended: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 1999,
      features: [
        'Multi-location support',
        'White-label options',
        'Dedicated success manager',
        'Custom BAA',
        'SLA guarantees',
        '24/7 phone support'
      ]
    }
  ];

  const specialties = [
    'Psychiatry',
    'Psychology',
    'Addiction Medicine',
    'Family Medicine',
    'Internal Medicine',
    'Counseling',
    'Social Work',
    'Other'
  ];

  const challenges = [
    'Patient engagement',
    'Documentation burden',
    'Billing complexity',
    'Care coordination',
    'Compliance management',
    'Patient retention',
    'Crisis management',
    'Technology adoption'
  ];

  useEffect(() => {
    if (practiceInfo.monthlyRevenue > 0 && practiceInfo.currentPatients > 0) {
      calculateROI();
      scoreProspect();
    }
  }, [practiceInfo]);

  const calculateROI = async () => {
    try {
      const projection = await roiService.calculateProviderROI({
        practiceSize: practiceInfo.size,
        currentPatients: practiceInfo.currentPatients,
        monthlyRevenue: practiceInfo.monthlyRevenue,
        averageSessionFee: practiceInfo.averageSessionFee,
        specialty: practiceInfo.specialty,
        location: practiceInfo.location,
        selectedTier
      });

      setRoiProjection(projection);

      // Calculate conversion probability
      const probability = await salesEngine.predictConversionProbability({
        leadScore,
        roiProjection: projection.roiPercentage,
        practiceSize: practiceInfo.size,
        engagement: 'high'
      });

      setConversionProbability(probability);

      // Get competitor comparison
      const comparison = await roiService.getCompetitorComparison({
        specialty: practiceInfo.specialty,
        region: practiceInfo.location.state
      });

      setCompetitorComparison(comparison);
    } catch (error) {
      console.error('ROI calculation error:', error);
    }
  };

  const scoreProspect = async () => {
    try {
      const score = await salesEngine.scoreProspect({
        practiceSize: practiceInfo.size,
        monthlyRevenue: practiceInfo.monthlyRevenue,
        patientCount: practiceInfo.currentPatients,
        specialty: practiceInfo.specialty,
        challenges: practiceInfo.currentChallenges,
        engagementLevel: 'high'
      });

      setLeadScore(score.score);

      // Update CRM with lead score
      await crmService.updateLeadScore({
        email: (await supabase.auth.getUser()).data.user?.email || '',
        score: score.score,
        factors: score.factors
      });
    } catch (error) {
      console.error('Lead scoring error:', error);
    }
  };

  const startOnboarding = async () => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Start onboarding process
      const onboarding = await onboardingService.startOnboarding({
        providerId: user.user.id,
        practiceInfo,
        selectedTier,
        referralSource: 'organic'
      });

      setOnboardingId(onboarding.id);

      // Create CRM lead
      const lead = await crmService.createLead({
        firstName: user.user.user_metadata.full_name?.split(' ')[0] || '',
        lastName: user.user.user_metadata.full_name?.split(' ')[1] || '',
        email: user.user.email || '',
        organization: practiceInfo.name,
        practiceSize: practiceInfo.size,
        monthlyPatients: practiceInfo.currentPatients,
        interests: practiceInfo.currentChallenges,
        score: leadScore,
        metadata: {
          roiProjection: roiProjection?.fiveYearNPV,
          conversionProbability,
          selectedTier
        }
      });

      // Track in sales engine
      await salesEngine.trackEngagement({
        leadId: lead.id,
        action: 'onboarding_started',
        metadata: {
          tier: selectedTier,
          roiProjection: roiProjection?.roiPercentage
        }
      });

      setCurrentStep(2);
    } catch (error) {
      console.error('Onboarding error:', error);
      toast.error('Failed to start onboarding');
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async (paymentInfo: any) => {
    setLoading(true);
    try {
      // Complete onboarding
      const completion = await onboardingService.completeOnboarding({
        onboardingId,
        paymentMethod: paymentInfo.method,
        billingAddress: paymentInfo.address
      });

      // Update CRM
      await crmService.updateLeadStatus({
        leadId: onboardingId,
        status: 'closed_won',
        dealValue: roiProjection?.fiveYearNPV || 0
      });

      // Track conversion
      await salesEngine.trackConversion({
        leadId: onboardingId,
        tier: selectedTier,
        value: pricingTiers.find(t => t.id === selectedTier)?.price || 0,
        roiRealized: roiProjection?.roiPercentage || 0
      });

      // Generate financial forecast
      await financialModel.addCustomer({
        customerId: completion.providerId,
        tier: selectedTier,
        mrr: pricingTiers.find(t => t.id === selectedTier)?.price || 0,
        startDate: new Date()
      });

      toast.success('Welcome to Serenity! Your practice is now set up.');
      navigate('/provider/dashboard');
    } catch (error) {
      console.error('Completion error:', error);
      toast.error('Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const renderPracticeInfoStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Tell us about your practice</CardTitle>
          <CardDescription>
            Help us understand your needs to provide personalized recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="practice-name">Practice Name</Label>
              <Input
                id="practice-name"
                value={practiceInfo.name}
                onChange={(e) => setPracticeInfo({ ...practiceInfo, name: e.target.value })}
                placeholder="Serenity Mental Health"
              />
            </div>
            <div>
              <Label htmlFor="practice-size">Number of Providers</Label>
              <Input
                id="practice-size"
                type="number"
                value={practiceInfo.size}
                onChange={(e) => setPracticeInfo({ ...practiceInfo, size: parseInt(e.target.value) })}
                min={1}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="specialty">Primary Specialty</Label>
            <Select
              value={practiceInfo.specialty}
              onValueChange={(value) => setPracticeInfo({ ...practiceInfo, specialty: value })}
            >
              <SelectTrigger id="specialty">
                <SelectValue placeholder="Select specialty" />
              </SelectTrigger>
              <SelectContent>
                {specialties.map((specialty) => (
                  <SelectItem key={specialty} value={specialty.toLowerCase()}>
                    {specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={practiceInfo.location.state}
                onChange={(e) => setPracticeInfo({
                  ...practiceInfo,
                  location: { ...practiceInfo.location, state: e.target.value }
                })}
                placeholder="CA"
                maxLength={2}
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={practiceInfo.location.city}
                onChange={(e) => setPracticeInfo({
                  ...practiceInfo,
                  location: { ...practiceInfo.location, city: e.target.value }
                })}
                placeholder="San Francisco"
              />
            </div>
            <div>
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                value={practiceInfo.location.zipCode}
                onChange={(e) => setPracticeInfo({
                  ...practiceInfo,
                  location: { ...practiceInfo.location, zipCode: e.target.value }
                })}
                placeholder="94102"
                maxLength={5}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="patients">Current Active Patients</Label>
              <Input
                id="patients"
                type="number"
                value={practiceInfo.currentPatients}
                onChange={(e) => setPracticeInfo({ ...practiceInfo, currentPatients: parseInt(e.target.value) })}
                min={0}
              />
            </div>
            <div>
              <Label htmlFor="revenue">Monthly Revenue</Label>
              <Input
                id="revenue"
                type="number"
                value={practiceInfo.monthlyRevenue}
                onChange={(e) => setPracticeInfo({ ...practiceInfo, monthlyRevenue: parseInt(e.target.value) })}
                min={0}
                placeholder="25000"
              />
            </div>
          </div>

          <div>
            <Label>Current Challenges (select all that apply)</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {challenges.map((challenge) => (
                <label key={challenge} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={practiceInfo.currentChallenges.includes(challenge)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPracticeInfo({
                          ...practiceInfo,
                          currentChallenges: [...practiceInfo.currentChallenges, challenge]
                        });
                      } else {
                        setPracticeInfo({
                          ...practiceInfo,
                          currentChallenges: practiceInfo.currentChallenges.filter(c => c !== challenge)
                        });
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{challenge}</span>
                </label>
              ))}
            </div>
          </div>

          <Button
            onClick={startOnboarding}
            disabled={!practiceInfo.name || !practiceInfo.specialty || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculating your ROI...
              </>
            ) : (
              <>
                Calculate My ROI
                <TrendingUp className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderROIStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {roiProjection && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Your Personalized ROI Projection
                <Badge variant="default" className="text-lg">
                  {roiProjection.roiPercentage}% ROI
                </Badge>
              </CardTitle>
              <CardDescription>
                Based on your practice profile and market data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">
                    ${roiProjection.monthlyRevenueLift.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Monthly Revenue Increase</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Zap className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">
                    {roiProjection.efficiencyGains}%
                  </div>
                  <div className="text-sm text-gray-600">Efficiency Gain</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-600">
                    +{roiProjection.newPatientCapacity}
                  </div>
                  <div className="text-sm text-gray-600">Patient Capacity</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <Shield className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-orange-600">
                    {roiProjection.paybackPeriodMonths} mo
                  </div>
                  <div className="text-sm text-gray-600">Payback Period</div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">5-Year Net Present Value</div>
                  <div className="text-3xl font-bold text-gray-900">
                    ${roiProjection.fiveYearNPV.toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Choose Your Plan</CardTitle>
              <CardDescription>
                Select the tier that best fits your practice needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {pricingTiers.map((tier) => (
                  <div
                    key={tier.id}
                    className={`relative rounded-lg border-2 p-6 cursor-pointer transition-all ${
                      selectedTier === tier.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTier(tier.id)}
                  >
                    {tier.recommended && (
                      <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        Recommended
                      </Badge>
                    )}
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold">{tier.name}</h3>
                      <div className="mt-2">
                        <span className="text-3xl font-bold">${tier.price}</span>
                        <span className="text-gray-600">/month</span>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-between items-center">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setCurrentStep(3)}>
                  Continue to Payment
                  <TrendingUp className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {competitorComparison && (
            <Card>
              <CardHeader>
                <CardTitle>Market Comparison</CardTitle>
                <CardDescription>
                  How Serenity compares to alternatives in your market
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(competitorComparison).map(([competitor, data]: [string, any]) => (
                    <div key={competitor} className="flex items-center justify-between">
                      <span className="font-medium">{competitor}</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={data.value} className="w-32" />
                        <span className="text-sm text-gray-600">{data.value}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {leadScore > 0 && (
            <Alert>
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>Your practice scores <strong>{leadScore}/100</strong> for Serenity fit</span>
                  <Badge variant="outline">
                    {conversionProbability}% likely to benefit
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </motion.div>
  );

  const renderPaymentStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Complete Your Setup</CardTitle>
          <CardDescription>
            Enter payment information to activate your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Payment form would go here */}
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Payment integration would be implemented here with Stripe or similar provider
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => completeOnboarding({
                method: 'credit_card',
                address: {
                  street: '123 Main St',
                  city: practiceInfo.location.city,
                  state: practiceInfo.location.state,
                  zipCode: practiceInfo.location.zipCode
                }
              })}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up your account...
                </>
              ) : (
                <>
                  Complete Setup
                  <CheckCircle className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to Serenity
          </h1>
          <p className="text-lg text-gray-600">
            Join thousands of providers transforming mental health care
          </p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`flex-1 ${step < 3 ? 'mr-4' : ''}`}
              >
                <div className="relative">
                  <div
                    className={`h-2 rounded-full ${
                      step <= currentStep ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  />
                  <div
                    className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step <= currentStep
                        ? 'bg-primary text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {step}
                  </div>
                </div>
                <div className="text-center mt-4">
                  <div className="text-sm font-medium">
                    {step === 1 && 'Practice Info'}
                    {step === 2 && 'ROI & Pricing'}
                    {step === 3 && 'Setup'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {currentStep === 1 && renderPracticeInfoStep()}
          {currentStep === 2 && renderROIStep()}
          {currentStep === 3 && renderPaymentStep()}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EnhancedProviderOnboarding;