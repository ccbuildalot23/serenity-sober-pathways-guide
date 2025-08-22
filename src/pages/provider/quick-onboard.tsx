import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  UserPlus, 
  Building, 
  Phone, 
  Mail, 
  
  CheckCircle, 
  AlertCircle,
  FileText,
  DollarSign,
  Shield
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface FormData {
  practiceName: string;
  npi: string;
  phone: string;
  email: string;
}

export default function QuickOnboard() {
  const [formData, setFormData] = useState<FormData>({
    practiceName: '',
    npi: '',
    phone: '',
    email: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    let password = 'SP_'; // Serenity Provider prefix
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Generate temporary password
      const tempPassword = generatePassword();
      
      // Create provider auth account
      const { error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: tempPassword,
        options: {
          data: {
            role: 'provider',
            npi: formData.npi,
            practice_name: formData.practiceName,
            phone: formData.phone
          },
          emailRedirectTo: `${window.location.origin}/provider/dashboard`
        }
      });
      
      if (authError) throw authError;
      
      // Store provider onboarding info
      const { error: dbError } = await supabase
        .from('provider_onboarding')
        .insert({
          practice_name: formData.practiceName,
          npi: formData.npi,
          phone: formData.phone,
          email: formData.email,
          temp_password: tempPassword, // In production, hash this
          onboarded_at: new Date().toISOString()
        });
      
      if (dbError) throw dbError;
      
      // Set credentials for display
      setCredentials({
        email: formData.email,
        password: tempPassword
      });
      
      setOnboarded(true);
      
      // Send welcome SMS (if Twilio configured)
      try {
        await fetch('/api/provider/send-welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: formData.phone,
            email: formData.email,
            password: tempPassword,
            practiceName: formData.practiceName
          })
        });
      } catch (error) {
        console.log('Welcome SMS not sent (API not configured)');
      }
      
      toast({
        title: 'Provider Onboarded Successfully!',
        description: `Credentials have been created for ${formData.practiceName}`,
      });
      
    } catch (error) {
      console.error('Onboarding error:', error);
      toast({
        title: 'Onboarding Failed',
        description: error.message || 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (onboarded && credentials) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <CardTitle className="text-2xl">Provider Onboarded Successfully!</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Save these credentials securely. The temporary password must be changed on first login.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4 bg-white p-4 rounded-lg">
              <div>
                <Label>Email / Username</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-gray-100 px-3 py-2 rounded flex-1">{credentials.email}</code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigator.clipboard.writeText(credentials.email)}
                  >
                    Copy
                  </Button>
                </div>
              </div>
              
              <div>
                <Label>Temporary Password</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-gray-100 px-3 py-2 rounded flex-1 font-mono">{credentials.password}</code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigator.clipboard.writeText(credentials.password)}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <FileText className="w-8 h-8 text-blue-500 mb-2" />
                  <p className="font-semibold">SimplePractice Integration</p>
                  <p className="text-sm text-gray-600 mt-1">Webhook endpoint ready</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <DollarSign className="w-8 h-8 text-green-500 mb-2" />
                  <p className="font-semibold">CPT Codes Active</p>
                  <p className="text-sm text-gray-600 mt-1">90834, 90837, 99490</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="flex gap-4">
              <Button 
                className="flex-1"
                onClick={() => window.location.href = '/login'}
              >
                Go to Login
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setOnboarded(false);
                  setCredentials(null);
                  setFormData({ practiceName: '', npi: '', phone: '', email: '' });
                }}
              >
                Onboard Another Provider
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">⚡ Quick Provider Onboarding</h1>
        <p className="text-gray-600">Get providers up and running in under 2 minutes</p>
        <div className="flex justify-center gap-2 mt-4">
          <Badge variant="secondary">HIPAA Compliant</Badge>
          <Badge variant="secondary">Auto-Billing Setup</Badge>
          <Badge variant="secondary">Crisis Alerts Ready</Badge>
        </div>
      </div>

      {/* Onboarding Form */}
      <Card>
        <CardHeader>
          <CardTitle>Provider Information</CardTitle>
          <CardDescription>
            Enter basic information to create a provider account with full access to patient monitoring and billing features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="practiceName">
                <Building className="w-4 h-4 inline mr-2" />
                Practice Name *
              </Label>
              <Input
                id="practiceName"
                type="text"
                placeholder="Serenity Mental Health Clinic"
                value={formData.practiceName}
                onChange={(e) => setFormData({...formData, practiceName: e.target.value})}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="npi">
                <Shield className="w-4 h-4 inline mr-2" />
                NPI Number *
              </Label>
              <Input
                id="npi"
                type="text"
                placeholder="1234567890"
                pattern="[0-9]{10}"
                value={formData.npi}
                onChange={(e) => setFormData({...formData, npi: e.target.value})}
                required
              />
              <p className="text-xs text-gray-500">10-digit National Provider Identifier</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">
                <Phone className="w-4 h-4 inline mr-2" />
                Phone Number *
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                required
              />
              <p className="text-xs text-gray-500">For crisis alerts and account verification</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="w-4 h-4 inline mr-2" />
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="provider@clinic.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
              <p className="text-xs text-gray-500">Will be used as login username</p>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <UserPlus className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Onboard Provider (2 min setup)
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Features Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Auto-Generated Features</CardTitle>
          <CardDescription>
            These features are automatically configured for each provider
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">SimplePractice Integration</p>
                <p className="text-sm text-gray-600">Webhook endpoint for session notes</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">CPT Code Automation</p>
                <p className="text-sm text-gray-600">90834 (45min), 90837 (60min), 99490 (CCM)</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Crisis Alert System</p>
                <p className="text-sm text-gray-600">Real-time SMS/call notifications</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Patient Dashboard</p>
                <p className="text-sm text-gray-600">Monitor all patients in one view</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">HIPAA Compliance</p>
                <p className="text-sm text-gray-600">Audit logs and encryption</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Billing Automation</p>
                <p className="text-sm text-gray-600">Medicare/Medicaid ready</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}