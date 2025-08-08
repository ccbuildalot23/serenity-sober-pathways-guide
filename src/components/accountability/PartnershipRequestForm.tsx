import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Clock, Users, Mail, Search } from 'lucide-react';
import { AccountabilityService, SupportAgreementTemplate } from '@/services/accountabilityService';
import { toast } from 'sonner';

interface PartnershipRequestFormProps {
  onClose: () => void;
  onSubmit: () => void;
}

const PartnershipRequestForm: React.FC<PartnershipRequestFormProps> = ({ onClose, onSubmit }) => {
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<SupportAgreementTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<SupportAgreementTemplate | null>(null);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [loading, setLoading] = useState(_false);
  
  // Privacy settings
  const [_privacySettings, setPrivacySettings] = useState({
    _share_mood: _true,
    _share_progress: _true,
    _share_goals: _false,
    _share_streaks: _true,
    _notification_level: 'summary' as 'minimal' | 'summary' | 'detailed'
  });

  // Check-in _schedule
  const [_schedule, setSchedule] = useState({
    _frequency: 'daily',
    _times: ['09:00'],
    _timezone: 'UTC'
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await AccountabilityService.getSupportAgreementTemplates();
      setTemplates(data);
      if (data.length > 0) {
        setSelectedTemplate(data[0]);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load agreement templates');
    }
  };

  const handleSubmit = async () => {
    if (!selectedTemplate || !partnerEmail) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(_true);
    try {
      // In a real app, you'd look up the partner by email
      // For demo purposes, we'll use a placeholder partner ID
      const _partnerId = 'demo-partner-id';
      
      await AccountabilityService.requestPartnership(
        _partnerId,
        selectedTemplate.template_content,
        _schedule,
        _privacySettings
      );

      toast.success('Partnership request sent successfully!');
      onSubmit();
    } catch (error) {
      console.error('Error sending partnership request:', error);
      toast.error('Failed to send partnership request');
    } finally {
      setLoading(_false);
    }
  };

  const addCheckInTime = () => {
    setSchedule(prev => ({
      ...prev,
      _times: [...prev._times, '18:00']
    }));
  };

  const removeCheckInTime = (_index: number) => {
    setSchedule(prev => ({
      ...prev,
      _times: prev._times.filter((_, i) => i !== _index)
    }));
  };

  const updateCheckInTime = (_index: number, time: string) => {
    setSchedule(prev => ({
      ...prev,
      _times: prev._times.map((t, i) => i === _index ? time : t)
    }));
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Request Accountability Partnership
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Progress */}
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3, 4].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= stepNum ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {stepNum}
                </div>
                {stepNum < 4 && (
                  <div className={`w-8 h-0.5 ${step > stepNum ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Search className="w-5 h-5 mr-2" />
                Find Your Partner
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="partner-email">Partner's Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="partner-email"
                      type="email"
                      placeholder="partner@example.com"
                      value={partnerEmail}
                      onChange={(e) => setPartnerEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    We'll send them an invitation to connect with you
                  </p>
                </div>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Finding the Right Partner</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Choose someone you trust and who supports your recovery</li>
                      <li>• Consider their availability for regular check-ins</li>
                      <li>• Ensure they understand the commitment involved</li>
                      <li>• Both parties must agree to the support agreement</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Choose Support Agreement</h3>
              
              <div className="grid gap-4">
                {templates.map((template) => (
                  <Card 
                    key={template.id}
                    className={`cursor-pointer transition-all ${
                      selectedTemplate?.id === template.id 
                        ? 'ring-2 ring-blue-500 border-blue-200' 
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>{template.title}</span>
                        {selectedTemplate?.id === template.id && (
                          <Badge variant="default">Selected</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                      
                      {selectedTemplate?.id === template.id && (
                        <div className="space-y-3 mt-4 pt-4 border-t">
                          <div>
                            <h5 className="font-medium text-sm mb-2">Key Commitments:</h5>
                            <ul className="text-xs text-gray-600 space-y-1">
                              {template.template_content.commitments?.slice(0, 3).map((commitment: string, _index: number) => (
                                <li key={_index}>• {commitment}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Set Check-in Schedule
              </h3>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Daily Check-in Times</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Frequency</Label>
                    <Select value={_schedule._frequency} onValueChange={(value) => 
                      setSchedule(prev => ({ ...prev, _frequency: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekdays">Weekdays Only</SelectItem>
                        <SelectItem value="flexible">Flexible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Check-in Times</Label>
                    <div className="space-y-2">
                      {_schedule._times.map((time, _index) => (
                        <div key={_index} className="flex items-center space-x-2">
                          <Input
                            type="time"
                            value={time}
                            onChange={(e) => updateCheckInTime(_index, e.target.value)}
                            className="flex-1"
                          />
                          {_schedule._times.length > 1 && (
                            <Button 
                              type="button"
                              variant="outline" 
                              size="sm"
                              onClick={() => removeCheckInTime(_index)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                      
                      {_schedule._times.length < 3 && (
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm" 
                          onClick={addCheckInTime}
                        >
                          Add Another Time
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Privacy & Sharing Settings
              </h3>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">What to Share</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Share Mood Levels</Label>
                        <p className="text-sm text-gray-600">Let your partner see your daily mood ratings</p>
                      </div>
                      <Switch
                        checked={_privacySettings._share_mood}
                        onCheckedChange={(checked) => 
                          setPrivacySettings(prev => ({ ...prev, _share_mood: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Share Progress Updates</Label>
                        <p className="text-sm text-gray-600">Share general progress summaries</p>
                      </div>
                      <Switch
                        checked={_privacySettings._share_progress}
                        onCheckedChange={(checked) => 
                          setPrivacySettings(prev => ({ ...prev, _share_progress: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Share Recovery Goals</Label>
                        <p className="text-sm text-gray-600">Let your partner see your specific goals</p>
                      </div>
                      <Switch
                        checked={_privacySettings._share_goals}
                        onCheckedChange={(checked) => 
                          setPrivacySettings(prev => ({ ...prev, _share_goals: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Share Streak Information</Label>
                        <p className="text-sm text-gray-600">Share your check-in streaks and milestones</p>
                      </div>
                      <Switch
                        checked={_privacySettings._share_streaks}
                        onCheckedChange={(checked) => 
                          setPrivacySettings(prev => ({ ...prev, _share_streaks: checked }))
                        }
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Label>Notification Detail Level</Label>
                    <Select 
                      value={_privacySettings._notification_level} 
                      onValueChange={(value) => 
                        setPrivacySettings(prev => ({ 
                          ...prev, 
                          _notification_level: value as 'minimal' | 'summary' | 'detailed' 
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minimal">Minimal (Basic activity only)</SelectItem>
                        <SelectItem value="summary">Summary (Include mood if shared)</SelectItem>
                        <SelectItem value="detailed">Detailed (All shared information)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <h4 className="font-medium text-green-900 mb-2">🔒 Your Privacy is Protected</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Sensitive data is encrypted and only you can access the full details</li>
                    <li>• Your partner only sees what you choose to share</li>
                    <li>• You can change these settings anytime</li>
                    <li>• All notifications respect your privacy preferences</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <Button 
              variant="outline" 
              onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </Button>
            
            {step < 4 ? (
              <Button 
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !partnerEmail}
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                disabled={loading || !selectedTemplate}
              >
                {loading ? 'Sending Request...' : 'Send Partnership Request'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PartnershipRequestForm;