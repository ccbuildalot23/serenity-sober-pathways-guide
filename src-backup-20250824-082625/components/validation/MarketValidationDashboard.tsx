import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, XCircle, Users, DollarSign, Activity, Clock } from 'lucide-react';
import { marketValidationService, type TherapistProfile, type ValidationResults, type MarketValidationResults } from '@/services/marketValidationService';

export const MarketValidationDashboard: React.FC = () => {
  const [therapists, setTherapists] = useState<TherapistProfile[]>([]);
  const [validationReport, setValidationReport] = useState<MarketValidationResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeInterview, setActiveInterview] = useState<string | null>(null);
  const [interviewResponses, setInterviewResponses] = useState<Partial<ValidationResults>>({});

  useEffect(() => {
    loadTherapists();
  }, []);

  const loadTherapists = async () => {
    try {
      // In production, this would call the service to get therapists from database
      // For now, we'll simulate with empty array
      setTherapists([]);
    } catch (error) {
      console.error('Failed to load therapists:', error);
    }
  };

  const addTherapist = async (profile: Omit<TherapistProfile, 'id' | 'interviewCompleted'>) => {
    try {
      const newTherapist = await marketValidationService.createTherapistProfile(profile);
      setTherapists(prev => [...prev, newTherapist]);
    } catch (error) {
      console.error('Failed to add therapist:', error);
    }
  };

  const conductInterview = async (therapistId: string, responses: Omit<ValidationResults, 'validatedAt'>) => {
    try {
      setLoading(true);
      await marketValidationService.conductValidationInterview(therapistId, responses);
      
      // Update local state
      setTherapists(prev => prev.map(t => 
        t.id === therapistId 
          ? { ...t, interviewCompleted: true, validationData: { ...responses, validatedAt: new Date() }}
          : t
      ));
      
      setActiveInterview(null);
      setInterviewResponses({});
    } catch (error) {
      console.error('Failed to conduct interview:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    try {
      setLoading(true);
      const report = await marketValidationService.generateValidationReport();
      setValidationReport(report);
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Need at least 10 completed interviews to generate report');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: 'GO' | 'PIVOT' | 'STOP') => {
    switch (status) {
      case 'GO':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'PIVOT':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'STOP':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const interviewQuestions = marketValidationService.getInterviewQuestions();
  const completedInterviews = therapists.filter(t => t.interviewCompleted).length;
  const progressPercentage = (completedInterviews / 10) * 100;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Market Validation Dashboard</h1>
          <p className="text-gray-600">Validate business model assumptions before full implementation</p>
        </div>
        <Badge variant={completedInterviews >= 10 ? "default" : "secondary"}>
          {completedInterviews}/10 Interviews Complete
        </Badge>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Validation Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Interview Progress</span>
                <span>{completedInterviews}/10 completed</span>
              </div>
              <Progress value={progressPercentage} className="w-full" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{completedInterviews}</div>
                <div className="text-sm text-gray-600">Interviews</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {therapists.filter(t => t.validationData?.referralLossConfirmed).length}
                </div>
                <div className="text-sm text-gray-600">Validated Losses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {therapists.filter(t => t.validationData?.willingToPayTier !== 'None').length}
                </div>
                <div className="text-sm text-gray-600">Willing to Pay</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {therapists.filter(t => (t.validationData?.crisisWorkflowPriority || 0) >= 4).length}
                </div>
                <div className="text-sm text-gray-600">Crisis Priority</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add New Therapist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Add Therapist for Interview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TherapistForm onAdd={addTherapist} />
        </CardContent>
      </Card>

      {/* Therapist List */}
      <Card>
        <CardHeader>
          <CardTitle>Therapist Interviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {therapists.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No therapists added yet. Add therapists above to begin validation.</p>
            ) : (
              therapists.map(therapist => (
                <div key={therapist.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">{therapist.name}</h3>
                    <p className="text-sm text-gray-600">{therapist.practiceType} • {therapist.yearsExperience} years • {therapist.substanceAbuseClients} SA clients</p>
                    {therapist.validationData && (
                      <div className="flex gap-2 mt-2">
                        <Badge variant={therapist.validationData.referralLossConfirmed ? "default" : "secondary"}>
                          Loss: ${(therapist.validationData.estimatedAnnualLoss / 1000).toFixed(0)}K
                        </Badge>
                        <Badge variant={therapist.validationData.willingToPayTier !== 'None' ? "default" : "secondary"}>
                          {therapist.validationData.willingToPayTier}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {therapist.interviewCompleted ? (
                      <Badge variant="default">Completed</Badge>
                    ) : (
                      <Button onClick={() => setActiveInterview(therapist.id)} size="sm">
                        Conduct Interview
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Report */}
      {completedInterviews >= 5 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Validation Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            {validationReport ? (
              <ValidationReport report={validationReport} />
            ) : (
              <div className="text-center py-8">
                <Button onClick={generateReport} disabled={loading}>
                  {loading ? 'Generating...' : 'Generate Validation Report'}
                </Button>
                <p className="text-sm text-gray-600 mt-2">
                  Analyze {completedInterviews} completed interviews
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Interview Modal */}
      {activeInterview && (
        <InterviewModal
          therapistId={activeInterview}
          therapist={therapists.find(t => t.id === activeInterview)!}
          questions={interviewQuestions}
          onComplete={conductInterview}
          onClose={() => setActiveInterview(null)}
          loading={loading}
        />
      )}
    </div>
  );
};

// Therapist Form Component
const TherapistForm: React.FC<{
  onAdd: (profile: Omit<TherapistProfile, 'id' | 'interviewCompleted'>) => void;
}> = ({ onAdd }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    practiceType: 'solo' as const,
    yearsExperience: 0,
    substanceAbuseClients: 0,
    currentEHR: '',
    revenueRange: '$50K-$100K' as const,
    location: '',
    timezone: 'EST'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    setFormData({
      name: '',
      email: '',
      practiceType: 'solo',
      yearsExperience: 0,
      substanceAbuseClients: 0,
      currentEHR: '',
      revenueRange: '$50K-$100K',
      location: '',
      timezone: 'EST'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          required
        />
      </div>
      <div>
        <Label htmlFor="practiceType">Practice Type</Label>
        <Select value={formData.practiceType} onValueChange={(value: any) => setFormData(prev => ({ ...prev, practiceType: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solo">Solo Practice</SelectItem>
            <SelectItem value="group">Group Practice</SelectItem>
            <SelectItem value="hospital">Hospital</SelectItem>
            <SelectItem value="community">Community Center</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="yearsExperience">Years Experience</Label>
        <Input
          id="yearsExperience"
          type="number"
          value={formData.yearsExperience}
          onChange={(e) => setFormData(prev => ({ ...prev, yearsExperience: Number(e.target.value) }))}
          required
        />
      </div>
      <div>
        <Label htmlFor="substanceAbuseClients">SA Clients</Label>
        <Input
          id="substanceAbuseClients"
          type="number"
          value={formData.substanceAbuseClients}
          onChange={(e) => setFormData(prev => ({ ...prev, substanceAbuseClients: Number(e.target.value) }))}
          required
        />
      </div>
      <div>
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
          required
        />
      </div>
      <div className="md:col-span-3">
        <Button type="submit" className="w-full">Add Therapist</Button>
      </div>
    </form>
  );
};

// Validation Report Component
const ValidationReport: React.FC<{ report: MarketValidationResults }> = ({ report }) => {
  return (
    <div className="space-y-6">
      {/* Go/No-Go Decision */}
      <div className="text-center p-6 border rounded-lg bg-gray-50">
        <div className="flex items-center justify-center gap-3 mb-4">
          {getStatusIcon(report.goNoGoRecommendation)}
          <h2 className="text-2xl font-bold">
            Recommendation: {report.goNoGoRecommendation}
          </h2>
        </div>
        <p className="text-lg text-gray-600">
          Confidence Score: {report.confidenceScore.toFixed(1)}%
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                ${(report.averageReferralLoss / 1000).toFixed(0)}K
              </div>
              <p className="text-sm text-gray-600">Avg Referral Loss</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {report.pricingAcceptance.professional.toFixed(0)}%
              </div>
              <p className="text-sm text-gray-600">Professional Tier</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                ${(report.maxImplementationFee.average / 1000).toFixed(0)}K
              </div>
              <p className="text-sm text-gray-600">Avg Implementation</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {report.crisisWorkflowValidation.responseTimeRequirements}ms
              </div>
              <p className="text-sm text-gray-600">Crisis Response</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Factors */}
      {report.riskFactors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Risk Factors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.riskFactors.map((risk, index) => (
                <li key={index} className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* CPT Validation */}
      <Card>
        <CardHeader>
          <CardTitle>CPT Code Validation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>Status: <Badge variant={report.cptReimbursementValidation.confirmed ? "default" : "secondary"}>
              {report.cptReimbursementValidation.confirmed ? "Confirmed" : "Needs Validation"}
            </Badge></p>
            <p>Average Rate: ${report.cptReimbursementValidation.averageRate.toFixed(2)}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
              {Object.entries(report.cptReimbursementValidation.ratesByCode).map(([code, rate]) => (
                <div key={code} className="text-sm">
                  <span className="font-mono">{code}:</span> ${rate.toFixed(2)}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Interview Modal Component
const InterviewModal: React.FC<{
  therapistId: string;
  therapist: TherapistProfile;
  questions: { category: string; questions: string[] }[];
  onComplete: (therapistId: string, responses: Omit<ValidationResults, 'validatedAt'>) => void;
  onClose: () => void;
  loading: boolean;
}> = ({ therapistId, therapist, questions, onComplete, onClose, loading }) => {
  const [responses, setResponses] = useState<Partial<ValidationResults>>({
    referralLossConfirmed: false,
    estimatedAnnualLoss: 0,
    willingToPayTier: 'None',
    maxImplementationFee: 0,
    cptCodeFamiliarity: 1,
    crisisWorkflowPriority: 1,
    currentBillingChallenges: [],
    featureImportance: {
      aiTherapy: 1,
      peerSupport: 1,
      telehealth: 1,
      billing: 1,
      crisis: 1,
      mobile: 1,
      analytics: 1
    },
    implementationTimeline: '1-3 months'
  });

  const handleSubmit = () => {
    onComplete(therapistId, responses as Omit<ValidationResults, 'validatedAt'>);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Interview: {therapist.name}</h2>
          <Button variant="ghost" onClick={onClose}>×</Button>
        </div>

        <div className="space-y-6">
          {/* Key Questions */}
          <div>
            <h3 className="font-semibold mb-4">Referral Loss Validation</h3>
            <div className="space-y-4">
              <div>
                <Label>Do you lose revenue from substance abuse referrals?</Label>
                <Select 
                  value={responses.referralLossConfirmed ? "yes" : "no"} 
                  onValueChange={(value) => setResponses(prev => ({ ...prev, referralLossConfirmed: value === "yes" }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Estimated Annual Loss ($)</Label>
                <Input
                  type="number"
                  value={responses.estimatedAnnualLoss}
                  onChange={(e) => setResponses(prev => ({ ...prev, estimatedAnnualLoss: Number(e.target.value) }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Willing to Pay Tier</Label>
                <Select 
                  value={responses.willingToPayTier} 
                  onValueChange={(value: any) => setResponses(prev => ({ ...prev, willingToPayTier: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">Not interested</SelectItem>
                    <SelectItem value="Professional">Professional ($299/mo)</SelectItem>
                    <SelectItem value="Practice">Practice ($599/mo)</SelectItem>
                    <SelectItem value="Enterprise">Enterprise ($1,999/mo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Max Implementation Fee ($)</Label>
                <Input
                  type="number"
                  value={responses.maxImplementationFee}
                  onChange={(e) => setResponses(prev => ({ ...prev, maxImplementationFee: Number(e.target.value) }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>CPT Code Familiarity (1-5 scale)</Label>
                <Select 
                  value={responses.cptCodeFamiliarity?.toString()} 
                  onValueChange={(value) => setResponses(prev => ({ ...prev, cptCodeFamiliarity: Number(value) as any }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Not familiar</SelectItem>
                    <SelectItem value="2">2 - Slightly familiar</SelectItem>
                    <SelectItem value="3">3 - Moderately familiar</SelectItem>
                    <SelectItem value="4">4 - Very familiar</SelectItem>
                    <SelectItem value="5">5 - Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Crisis Workflow Priority (1-5 scale)</Label>
                <Select 
                  value={responses.crisisWorkflowPriority?.toString()} 
                  onValueChange={(value) => setResponses(prev => ({ ...prev, crisisWorkflowPriority: Number(value) as any }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Low priority</SelectItem>
                    <SelectItem value="2">2 - Some importance</SelectItem>
                    <SelectItem value="3">3 - Moderate importance</SelectItem>
                    <SelectItem value="4">4 - High importance</SelectItem>
                    <SelectItem value="5">5 - Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving...' : 'Complete Interview'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

function getStatusIcon(status: 'GO' | 'PIVOT' | 'STOP') {
  switch (status) {
    case 'GO':
      return <CheckCircle className="w-8 h-8 text-green-500" />;
    case 'PIVOT':
      return <AlertTriangle className="w-8 h-8 text-yellow-500" />;
    case 'STOP':
      return <XCircle className="w-8 h-8 text-red-500" />;
  }
}

export default MarketValidationDashboard;