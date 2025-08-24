/**
 * Patient Onboarding Wizard Component
 * Comprehensive onboarding flow for new patients with HIPAA compliance
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GlassCard } from '@/components/ui/GlassCard';
import { 
  User, 
  Shield, 
  Heart, 
  Phone, 
  CreditCard,
  FileText,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Lock,
  Stethoscope,
  Brain,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { phiEncryptionService } from '@/services/phiEncryptionService';
import { hipaaAuditService } from '@/services/hipaaAuditService';
import logger from '@/services/loggerService';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  required: boolean;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome',
    description: 'Let\'s get you started on your recovery journey',
    icon: Heart,
    required: true,
  },
  {
    id: 'personal',
    title: 'Personal Information',
    description: 'Basic information about you',
    icon: User,
    required: true,
  },
  {
    id: 'consent',
    title: 'Privacy & Consent',
    description: 'HIPAA authorization and consent forms',
    icon: Shield,
    required: true,
  },
  {
    id: 'medical',
    title: 'Medical History',
    description: 'Your health background and current medications',
    icon: Stethoscope,
    required: true,
  },
  {
    id: 'mental-health',
    title: 'Mental Health',
    description: 'Mental health and substance use history',
    icon: Brain,
    required: true,
  },
  {
    id: 'emergency',
    title: 'Emergency Contacts',
    description: 'People to contact in case of emergency',
    icon: Phone,
    required: true,
  },
  {
    id: 'insurance',
    title: 'Insurance',
    description: 'Insurance information (optional)',
    icon: CreditCard,
    required: false,
  },
  {
    id: 'preferences',
    title: 'Preferences',
    description: 'Communication and treatment preferences',
    icon: FileText,
    required: false,
  },
  {
    id: 'complete',
    title: 'All Set!',
    description: 'Your onboarding is complete',
    icon: CheckCircle,
    required: true,
  },
];

export const PatientOnboardingWizard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  useEffect(() => {
    // Load saved draft if exists
    loadDraft();
    
    // Auto-save draft every 30 seconds
    const interval = setInterval(() => {
      saveDraft();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [formData]);

  const loadDraft = async () => {
    try {
      const draft = localStorage.getItem('onboarding_draft');
      if (draft) {
        const parsed = JSON.parse(draft);
        setFormData(parsed.data);
        setCurrentStep(parsed.step);
        logger.info('Onboarding draft loaded');
      }
    } catch (error) {
      logger.error('Failed to load onboarding draft', error);
    }
  };

  const saveDraft = async () => {
    try {
      setSavingDraft(true);
      const draft = {
        data: formData,
        step: currentStep,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem('onboarding_draft', JSON.stringify(draft));
      setSavingDraft(false);
    } catch (error) {
      logger.error('Failed to save onboarding draft', error);
      setSavingDraft(false);
    }
  };

  const validateStep = (step: string): boolean => {
    const newErrors: Record<string, string> = {};
    
    switch (step) {
      case 'personal':
        if (!formData.fullName) newErrors.fullName = 'Full name is required';
        if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
        if (!formData.phone) newErrors.phone = 'Phone number is required';
        break;
        
      case 'consent':
        if (!formData.hipaaConsent) newErrors.hipaaConsent = 'HIPAA consent is required';
        if (!formData.termsAccepted) newErrors.termsAccepted = 'Terms must be accepted';
        if (!formData.privacyAccepted) newErrors.privacyAccepted = 'Privacy policy must be accepted';
        break;
        
      case 'emergency':
        if (!formData.emergencyName) newErrors.emergencyName = 'Emergency contact name is required';
        if (!formData.emergencyPhone) newErrors.emergencyPhone = 'Emergency contact phone is required';
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    const step = ONBOARDING_STEPS[currentStep];
    
    if (step.required && !validateStep(step.id)) {
      return;
    }
    
    await saveDraft();
    
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await completeOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = async () => {
    try {
      setLoading(true);
      
      // Encrypt PHI fields
      const encryptedData = await phiEncryptionService.encryptObject(formData, {
        userId: user?.id,
      });
      
      // Save to database
      const { error } = await supabase
        .from('patient_profiles')
        .upsert({
          user_id: user?.id,
          ...encryptedData,
          onboarding_completed: true,
          onboarding_date: new Date().toISOString(),
        });
      
      if (error) throw error;
      
      // Log completion for audit
      await hipaaAuditService.logAccess({
        action: 'ONBOARDING_COMPLETE',
        resourceType: 'patient_profile',
        resourceId: user?.id || '',
        details: { completedSteps: ONBOARDING_STEPS.map(s => s.id) },
      });
      
      // Clear draft
      localStorage.removeItem('onboarding_draft');
      
      logger.info('Patient onboarding completed successfully');
      
      // Navigate to dashboard
      navigate('/patient/dashboard');
    } catch (error) {
      logger.error('Failed to complete onboarding', error);
      setErrors({ submit: 'Failed to complete onboarding. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    const step = ONBOARDING_STEPS[currentStep];
    
    switch (step.id) {
      case 'welcome':
        return <WelcomeStep />;
      case 'personal':
        return <PersonalInfoStep formData={formData} setFormData={setFormData} errors={errors} />;
      case 'consent':
        return <ConsentStep formData={formData} setFormData={setFormData} errors={errors} />;
      case 'medical':
        return <MedicalHistoryStep formData={formData} setFormData={setFormData} errors={errors} />;
      case 'mental-health':
        return <MentalHealthStep formData={formData} setFormData={setFormData} errors={errors} />;
      case 'emergency':
        return <EmergencyContactsStep formData={formData} setFormData={setFormData} errors={errors} />;
      case 'insurance':
        return <InsuranceStep formData={formData} setFormData={setFormData} errors={errors} />;
      case 'preferences':
        return <PreferencesStep formData={formData} setFormData={setFormData} errors={errors} />;
      case 'complete':
        return <CompleteStep />;
      default:
        return null;
    }
  };

  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-lavender-50 to-sky-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Patient Onboarding</h1>
            {savingDraft && (
              <span className="text-sm text-gray-500">Saving draft...</span>
            )}
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2">
            {ONBOARDING_STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center ${
                    index <= currentStep ? 'text-primary' : 'text-gray-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs mt-1 hidden md:block">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard className="p-6">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  {React.createElement(ONBOARDING_STEPS[currentStep].icon, {
                    className: "w-8 h-8 text-primary",
                  })}
                  <div>
                    <CardTitle>{ONBOARDING_STEPS[currentStep].title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {ONBOARDING_STEPS[currentStep].description}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {errors.submit && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errors.submit}</AlertDescription>
                  </Alert>
                )}
                
                {renderStepContent()}
              </CardContent>
            </GlassCard>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={loading}
          >
            {loading ? (
              'Processing...'
            ) : currentStep === ONBOARDING_STEPS.length - 1 ? (
              'Complete'
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Step Components
const WelcomeStep: React.FC = () => (
  <div className="text-center py-8">
    <Heart className="w-16 h-16 text-primary mx-auto mb-4" />
    <h2 className="text-2xl font-bold mb-4">Welcome to Serenity</h2>
    <p className="text-gray-600 mb-6">
      We're here to support you on your recovery journey. This onboarding process will help us
      understand your needs and provide you with the best possible care.
    </p>
    <div className="bg-blue-50 p-4 rounded-lg text-left">
      <h3 className="font-semibold mb-2">What to expect:</h3>
      <ul className="space-y-2 text-sm">
        <li className="flex items-start">
          <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
          <span>Your information is protected by HIPAA compliance</span>
        </li>
        <li className="flex items-start">
          <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
          <span>This process takes about 10-15 minutes</span>
        </li>
        <li className="flex items-start">
          <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
          <span>Your progress is automatically saved</span>
        </li>
      </ul>
    </div>
  </div>
);

const PersonalInfoStep: React.FC<{
  formData: Record<string, any>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  errors: Record<string, string>;
}> = ({ formData, setFormData, errors }) => (
  <div className="space-y-4">
    <div>
      <Label htmlFor="fullName">Full Name *</Label>
      <Input
        id="fullName"
        value={formData.fullName || ''}
        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
        className={errors.fullName ? 'border-red-500' : ''}
      />
      {errors.fullName && <span className="text-red-500 text-sm">{errors.fullName}</span>}
    </div>
    
    <div>
      <Label htmlFor="dateOfBirth">Date of Birth *</Label>
      <Input
        id="dateOfBirth"
        type="date"
        value={formData.dateOfBirth || ''}
        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
        className={errors.dateOfBirth ? 'border-red-500' : ''}
      />
      {errors.dateOfBirth && <span className="text-red-500 text-sm">{errors.dateOfBirth}</span>}
    </div>
    
    <div>
      <Label htmlFor="phone">Phone Number *</Label>
      <Input
        id="phone"
        type="tel"
        value={formData.phone || ''}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        className={errors.phone ? 'border-red-500' : ''}
      />
      {errors.phone && <span className="text-red-500 text-sm">{errors.phone}</span>}
    </div>
    
    <div>
      <Label htmlFor="address">Address</Label>
      <Textarea
        id="address"
        value={formData.address || ''}
        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        rows={3}
      />
    </div>
  </div>
);

const ConsentStep: React.FC<{
  formData: Record<string, any>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  errors: Record<string, string>;
}> = ({ formData, setFormData, errors }) => (
  <div className="space-y-6">
    <Alert>
      <Lock className="h-4 w-4" />
      <AlertDescription>
        Your privacy and data security are our top priorities. All information is encrypted and
        handled in compliance with HIPAA regulations.
      </AlertDescription>
    </Alert>
    
    <div className="space-y-4">
      <div className="flex items-start space-x-2">
        <Checkbox
          id="hipaaConsent"
          checked={formData.hipaaConsent || false}
          onCheckedChange={(checked) => setFormData({ ...formData, hipaaConsent: checked })}
        />
        <Label htmlFor="hipaaConsent" className="text-sm">
          I authorize Serenity to use and disclose my health information for treatment, payment,
          and healthcare operations as described in the HIPAA Notice of Privacy Practices. *
        </Label>
      </div>
      {errors.hipaaConsent && <span className="text-red-500 text-sm">{errors.hipaaConsent}</span>}
      
      <div className="flex items-start space-x-2">
        <Checkbox
          id="termsAccepted"
          checked={formData.termsAccepted || false}
          onCheckedChange={(checked) => setFormData({ ...formData, termsAccepted: checked })}
        />
        <Label htmlFor="termsAccepted" className="text-sm">
          I have read and agree to the <a href="/terms" className="text-primary underline">Terms of Service</a> *
        </Label>
      </div>
      {errors.termsAccepted && <span className="text-red-500 text-sm">{errors.termsAccepted}</span>}
      
      <div className="flex items-start space-x-2">
        <Checkbox
          id="privacyAccepted"
          checked={formData.privacyAccepted || false}
          onCheckedChange={(checked) => setFormData({ ...formData, privacyAccepted: checked })}
        />
        <Label htmlFor="privacyAccepted" className="text-sm">
          I have read and agree to the <a href="/privacy" className="text-primary underline">Privacy Policy</a> *
        </Label>
      </div>
      {errors.privacyAccepted && <span className="text-red-500 text-sm">{errors.privacyAccepted}</span>}
      
      <div className="flex items-start space-x-2">
        <Checkbox
          id="communicationConsent"
          checked={formData.communicationConsent || false}
          onCheckedChange={(checked) => setFormData({ ...formData, communicationConsent: checked })}
        />
        <Label htmlFor="communicationConsent" className="text-sm">
          I consent to receive appointment reminders and recovery support messages via SMS and email
        </Label>
      </div>
    </div>
  </div>
);

const MedicalHistoryStep: React.FC<{
  formData: Record<string, any>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  errors: Record<string, string>;
}> = ({ formData, setFormData }) => (
  <div className="space-y-4">
    <div>
      <Label htmlFor="primaryPhysician">Primary Care Physician</Label>
      <Input
        id="primaryPhysician"
        value={formData.primaryPhysician || ''}
        onChange={(e) => setFormData({ ...formData, primaryPhysician: e.target.value })}
      />
    </div>
    
    <div>
      <Label htmlFor="medications">Current Medications</Label>
      <Textarea
        id="medications"
        value={formData.medications || ''}
        onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
        placeholder="List any medications you're currently taking"
        rows={3}
      />
    </div>
    
    <div>
      <Label htmlFor="allergies">Allergies</Label>
      <Textarea
        id="allergies"
        value={formData.allergies || ''}
        onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
        placeholder="List any known allergies"
        rows={2}
      />
    </div>
    
    <div>
      <Label htmlFor="medicalConditions">Medical Conditions</Label>
      <Textarea
        id="medicalConditions"
        value={formData.medicalConditions || ''}
        onChange={(e) => setFormData({ ...formData, medicalConditions: e.target.value })}
        placeholder="List any current or past medical conditions"
        rows={3}
      />
    </div>
  </div>
);

const MentalHealthStep: React.FC<{
  formData: Record<string, any>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  errors: Record<string, string>;
}> = ({ formData, setFormData }) => (
  <div className="space-y-4">
    <Alert className="mb-4">
      <Brain className="h-4 w-4" />
      <AlertDescription>
        This information helps us provide appropriate support. All information is confidential.
      </AlertDescription>
    </Alert>
    
    <div>
      <Label>Primary reason for seeking support</Label>
      <RadioGroup
        value={formData.primaryReason || ''}
        onValueChange={(value) => setFormData({ ...formData, primaryReason: value })}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="substance-use" id="substance-use" />
          <Label htmlFor="substance-use">Substance use recovery</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="mental-health" id="mental-health" />
          <Label htmlFor="mental-health">Mental health support</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="both" id="both" />
          <Label htmlFor="both">Both substance use and mental health</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="other" id="other" />
          <Label htmlFor="other">Other</Label>
        </div>
      </RadioGroup>
    </div>
    
    <div>
      <Label htmlFor="substanceHistory">Substance use history (if applicable)</Label>
      <Textarea
        id="substanceHistory"
        value={formData.substanceHistory || ''}
        onChange={(e) => setFormData({ ...formData, substanceHistory: e.target.value })}
        placeholder="Please share any relevant history"
        rows={3}
      />
    </div>
    
    <div>
      <Label htmlFor="mentalHealthHistory">Mental health history</Label>
      <Textarea
        id="mentalHealthHistory"
        value={formData.mentalHealthHistory || ''}
        onChange={(e) => setFormData({ ...formData, mentalHealthHistory: e.target.value })}
        placeholder="Please share any relevant history"
        rows={3}
      />
    </div>
    
    <div>
      <Label htmlFor="recoveryGoals">Recovery goals</Label>
      <Textarea
        id="recoveryGoals"
        value={formData.recoveryGoals || ''}
        onChange={(e) => setFormData({ ...formData, recoveryGoals: e.target.value })}
        placeholder="What would you like to achieve?"
        rows={3}
      />
    </div>
  </div>
);

const EmergencyContactsStep: React.FC<{
  formData: Record<string, any>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  errors: Record<string, string>;
}> = ({ formData, setFormData, errors }) => (
  <div className="space-y-4">
    <Alert className="mb-4">
      <Phone className="h-4 w-4" />
      <AlertDescription>
        Emergency contacts will only be contacted in crisis situations or with your permission.
      </AlertDescription>
    </Alert>
    
    <div>
      <Label htmlFor="emergencyName">Emergency Contact Name *</Label>
      <Input
        id="emergencyName"
        value={formData.emergencyName || ''}
        onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
        className={errors.emergencyName ? 'border-red-500' : ''}
      />
      {errors.emergencyName && <span className="text-red-500 text-sm">{errors.emergencyName}</span>}
    </div>
    
    <div>
      <Label htmlFor="emergencyPhone">Emergency Contact Phone *</Label>
      <Input
        id="emergencyPhone"
        type="tel"
        value={formData.emergencyPhone || ''}
        onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
        className={errors.emergencyPhone ? 'border-red-500' : ''}
      />
      {errors.emergencyPhone && <span className="text-red-500 text-sm">{errors.emergencyPhone}</span>}
    </div>
    
    <div>
      <Label htmlFor="emergencyRelationship">Relationship</Label>
      <Input
        id="emergencyRelationship"
        value={formData.emergencyRelationship || ''}
        onChange={(e) => setFormData({ ...formData, emergencyRelationship: e.target.value })}
        placeholder="e.g., Spouse, Parent, Friend"
      />
    </div>
    
    <div>
      <Label htmlFor="secondaryEmergencyName">Secondary Emergency Contact (Optional)</Label>
      <Input
        id="secondaryEmergencyName"
        value={formData.secondaryEmergencyName || ''}
        onChange={(e) => setFormData({ ...formData, secondaryEmergencyName: e.target.value })}
      />
    </div>
    
    <div>
      <Label htmlFor="secondaryEmergencyPhone">Secondary Contact Phone</Label>
      <Input
        id="secondaryEmergencyPhone"
        type="tel"
        value={formData.secondaryEmergencyPhone || ''}
        onChange={(e) => setFormData({ ...formData, secondaryEmergencyPhone: e.target.value })}
      />
    </div>
  </div>
);

const InsuranceStep: React.FC<{
  formData: Record<string, any>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  errors: Record<string, string>;
}> = ({ formData, setFormData }) => (
  <div className="space-y-4">
    <Alert className="mb-4">
      <CreditCard className="h-4 w-4" />
      <AlertDescription>
        Insurance information is optional. You can add this later or pay out-of-pocket.
      </AlertDescription>
    </Alert>
    
    <div>
      <Label htmlFor="insuranceProvider">Insurance Provider</Label>
      <Input
        id="insuranceProvider"
        value={formData.insuranceProvider || ''}
        onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
      />
    </div>
    
    <div>
      <Label htmlFor="insurancePolicyNumber">Policy Number</Label>
      <Input
        id="insurancePolicyNumber"
        value={formData.insurancePolicyNumber || ''}
        onChange={(e) => setFormData({ ...formData, insurancePolicyNumber: e.target.value })}
      />
    </div>
    
    <div>
      <Label htmlFor="insuranceGroupNumber">Group Number</Label>
      <Input
        id="insuranceGroupNumber"
        value={formData.insuranceGroupNumber || ''}
        onChange={(e) => setFormData({ ...formData, insuranceGroupNumber: e.target.value })}
      />
    </div>
    
    <div className="flex items-start space-x-2">
      <Checkbox
        id="noInsurance"
        checked={formData.noInsurance || false}
        onCheckedChange={(checked) => setFormData({ ...formData, noInsurance: checked })}
      />
      <Label htmlFor="noInsurance" className="text-sm">
        I don't have insurance or prefer to pay out-of-pocket
      </Label>
    </div>
  </div>
);

const PreferencesStep: React.FC<{
  formData: Record<string, any>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  errors: Record<string, string>;
}> = ({ formData, setFormData }) => (
  <div className="space-y-4">
    <div>
      <Label>Preferred communication method</Label>
      <RadioGroup
        value={formData.communicationPreference || 'email'}
        onValueChange={(value) => setFormData({ ...formData, communicationPreference: value })}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="email" id="email" />
          <Label htmlFor="email">Email</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="sms" id="sms" />
          <Label htmlFor="sms">SMS/Text</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="phone" id="phone-pref" />
          <Label htmlFor="phone-pref">Phone Call</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="app" id="app" />
          <Label htmlFor="app">In-app notifications only</Label>
        </div>
      </RadioGroup>
    </div>
    
    <div>
      <Label>Notification preferences</Label>
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="appointmentReminders"
            checked={formData.appointmentReminders !== false}
            onCheckedChange={(checked) => setFormData({ ...formData, appointmentReminders: checked })}
          />
          <Label htmlFor="appointmentReminders" className="text-sm">
            Appointment reminders
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="dailyCheckInReminders"
            checked={formData.dailyCheckInReminders !== false}
            onCheckedChange={(checked) => setFormData({ ...formData, dailyCheckInReminders: checked })}
          />
          <Label htmlFor="dailyCheckInReminders" className="text-sm">
            Daily check-in reminders
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="motivationalMessages"
            checked={formData.motivationalMessages !== false}
            onCheckedChange={(checked) => setFormData({ ...formData, motivationalMessages: checked })}
          />
          <Label htmlFor="motivationalMessages" className="text-sm">
            Motivational messages
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="crisisAlerts"
            checked={formData.crisisAlerts !== false}
            onCheckedChange={(checked) => setFormData({ ...formData, crisisAlerts: checked })}
          />
          <Label htmlFor="crisisAlerts" className="text-sm">
            Crisis support alerts
          </Label>
        </div>
      </div>
    </div>
    
    <div>
      <Label htmlFor="timezone">Timezone</Label>
      <select
        id="timezone"
        className="w-full p-2 border rounded"
        value={formData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
      >
        <option value="America/New_York">Eastern Time</option>
        <option value="America/Chicago">Central Time</option>
        <option value="America/Denver">Mountain Time</option>
        <option value="America/Los_Angeles">Pacific Time</option>
        <option value="America/Phoenix">Arizona Time</option>
        <option value="Pacific/Honolulu">Hawaii Time</option>
      </select>
    </div>
  </div>
);

const CompleteStep: React.FC = () => (
  <div className="text-center py-8">
    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
    <h2 className="text-2xl font-bold mb-4">Welcome to Your Recovery Journey!</h2>
    <p className="text-gray-600 mb-6">
      Your onboarding is complete. You're now ready to start using Serenity's features.
    </p>
    <div className="bg-green-50 p-4 rounded-lg text-left">
      <h3 className="font-semibold mb-2">What's next:</h3>
      <ul className="space-y-2 text-sm">
        <li className="flex items-start">
          <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
          <span>Complete your first daily check-in</span>
        </li>
        <li className="flex items-start">
          <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
          <span>Explore recovery tools and resources</span>
        </li>
        <li className="flex items-start">
          <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
          <span>Connect with peer support community</span>
        </li>
        <li className="flex items-start">
          <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
          <span>Schedule your first appointment (if desired)</span>
        </li>
      </ul>
    </div>
  </div>
);

export default PatientOnboardingWizard;