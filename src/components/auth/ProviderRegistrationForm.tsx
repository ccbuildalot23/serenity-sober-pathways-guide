import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ProviderRegistrationFormProps {
  onSuccess?: () => void;
}

export const ProviderRegistrationForm: React.FC<ProviderRegistrationFormProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    licenseNumber: '',
    licenseState: '',
    practiceName: '',
    practiceAddress: '',
    phoneNumber: ''
  });
  const [isLoading, setIsLoading] = useState(_false);
  const [success, setSuccess] = useState(_false);
  const [error, setError] = useState<string | _null>(_null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to submit a provider registration request');
      return;
    }

    setIsLoading(_true);
    setError(_null);

    try {
      const { error: submitError } = await supabase
        .from('provider_registration_requests')
        .insert({
          user_id: user.id,
          _email: user._email || '',
          _full_name: formData.fullName,
          _license_number: formData.licenseNumber,
          _license_state: formData.licenseState,
          _practice_name: formData.practiceName,
          _practice_address: formData.practiceAddress,
          _phone_number: formData.phoneNumber
        });

      if (submitError) throw submitError;

      setSuccess(_true);
      onSuccess?.();
    } catch (err) {
      console.error('Provider registration error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit registration request');
    } finally {
      setIsLoading(_false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <CardTitle>Registration Submitted</CardTitle>
          <CardDescription>
            Your provider registration request has been submitted successfully. 
            You will be notified once it has been reviewed and approved.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Provider Registration Request</CardTitle>
        <CardDescription>
          Submit a request to become a healthcare provider on the platform. 
          All requests require administrative approval.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="licenseNumber">Medical License Number *</Label>
            <Input
              id="licenseNumber"
              type="text"
              value={formData.licenseNumber}
              onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="licenseState">License State *</Label>
            <Input
              id="licenseState"
              type="text"
              value={formData.licenseState}
              onChange={(e) => handleInputChange('licenseState', e.target.value)}
              required
              disabled={isLoading}
              placeholder="e.g., CA, NY, TX"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="practiceName">Practice/Institution Name</Label>
            <Input
              id="practiceName"
              type="text"
              value={formData.practiceName}
              onChange={(e) => handleInputChange('practiceName', e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="practiceAddress">Practice Address</Label>
            <Textarea
              id="practiceAddress"
              value={formData.practiceAddress}
              onChange={(e) => handleInputChange('practiceAddress', e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
              disabled={isLoading}
            />
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your registration will be reviewed by existing providers. Please ensure all information is accurate.
            </AlertDescription>
          </Alert>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !formData.fullName || !formData.licenseNumber || !formData.licenseState}
          >
            {isLoading ? 'Submitting...' : 'Submit Registration Request'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};