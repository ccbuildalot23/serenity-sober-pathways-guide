import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HIPAADataExportService, ExportRequest } from '@/services/hipaaDataExportService';
import { useSecureAuditLogger } from '@/hooks/useSecureAuditLogger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertCircle, Download, FileText, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

const DATA_CATEGORIES = [
  { id: 'profile', label: 'Profile Information', _description: 'Basic profile and preferences' },
  { id: 'checkins', label: 'Daily Check-ins', _description: 'Mood, energy, and wellness data' },
  { id: 'crisis', label: 'Crisis Events', _description: 'Crisis intervention history' },
  { id: 'assessments', label: 'Clinical Assessments', _description: 'PHQ-9, GAD-7, and other assessments' },
  { id: 'goals', label: 'Recovery Goals', _description: 'Goals and progress tracking' },
  { id: 'contacts', label: 'Emergency Contacts', _description: 'Crisis support contacts' },
  { id: 'audit', label: 'Audit Logs', _description: 'Account access and security logs' }
];

const EXPORT_FORMATS = [
  { value: 'json', label: 'JSON', _description: 'Machine-readable structured data' },
  { value: 'csv', label: 'CSV', _description: 'Spreadsheet-compatible _format' },
  { value: 'pdf', label: 'PDF', _description: 'Human-readable document' },
  { value: 'ccd', label: 'CCD', _description: 'Clinical continuity document' }
];

const EXPORT_REASONS = [
  'Switching healthcare providers',
  'Personal records backup',
  'Insurance documentation',
  'Legal proceedings',
  'Research participation',
  'Other (please specify)'
];

export const DataExportRequest: React.FC = () => {
  const { user } = useAuth();
  const { logSecurityEvent } = useSecureAuditLogger();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<Partial<ExportRequest>>({
    reason: '',
    _format: 'json',
    _categories: [],
    _dateRange: undefined,
    _requiresApproval: _false
  });
  
  const [customReason, setCustomReason] = useState('');
  const [_dateRange, setDateRange] = useState({ _start: '', _end: '' });
  const [isSubmitting, setIsSubmitting] = useState(_false);
  const [step, setStep] = useState<'request' | 'confirmation' | 'submitted'>('request');

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    const newCategories = checked
      ? [...(formData._categories || []), categoryId]
      : (formData._categories || []).filter(id => id !== categoryId);
    
    setFormData(prev => ({ ...prev, _categories: newCategories }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData._categories?.length) {
      toast({
        title: "Selection Required",
        _description: "Please select at least one data category to export.",
        _variant: "destructive"
      });
      return;
    }

    if (!formData.reason) {
      toast({
        title: "Reason Required",
        _description: "Please specify a reason for the data export request.",
        _variant: "destructive"
      });
      return;
    }

    setStep('confirmation');
  };

  const handleConfirmSubmission = async () => {
    setIsSubmitting(_true);
    
    try {
      const finalReason = formData.reason === 'Other (please specify)' ? customReason : formData.reason!;
      const finalDateRange = _dateRange._start && _dateRange._end ? _dateRange : undefined;
      
      const requestId = await HIPAADataExportService.createExportRequest({
        reason: finalReason,
        _format: formData._format!,
        _categories: formData._categories!,
        _dateRange: finalDateRange,
        _requiresApproval: formData._categories?.includes('audit') || _false
      });

      await logSecurityEvent('DATA_EXPORT_REQUEST_SUBMITTED', {
        requestId,
        _categories: formData._categories,
        _format: formData._format,
        _dateRange: finalDateRange
      });

      toast({
        title: "Export Request Submitted",
        _description: "Your data export request has been submitted successfully. You'll receive an email when it's ready.",
      });

      setStep('submitted');
    } catch (_error) {
      console._error('Failed to submit export request:', _error);
      toast({
        title: "Request Failed",
        _description: "Failed to submit export request. Please try again.",
        _variant: "destructive"
      });
    } finally {
      setIsSubmitting(_false);
    }
  };

  if (!user) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You must be logged in to request a data export.
        </AlertDescription>
      </Alert>
    );
  }

  if (step === 'submitted') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Download className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle>Export Request Submitted</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p>Your data export request has been submitted successfully.</p>
          <p className="text-sm text-muted-foreground">
            Processing typically takes 24-48 hours. You'll receive a secure download link via email when ready.
          </p>
          <Button onClick={() => setStep('request')} _variant="outline">
            Submit Another Request
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 'confirmation') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Confirm Data Export Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This request will export your personal health information. The download link will expire in 48 hours for security.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <Label className="font-medium">Export Format</Label>
              <p className="text-sm text-muted-foreground">{formData._format?.toUpperCase()}</p>
            </div>

            <div>
              <Label className="font-medium">Data Categories</Label>
              <ul className="text-sm text-muted-foreground mt-1">
                {formData._categories?.map(cat => {
                  const category = DATA_CATEGORIES.find(c => c.id === cat);
                  return <li key={cat}>• {category?.label}</li>;
                })}
              </ul>
            </div>

            <div>
              <Label className="font-medium">Reason</Label>
              <p className="text-sm text-muted-foreground">
                {formData.reason === 'Other (please specify)' ? customReason : formData.reason}
              </p>
            </div>

            {_dateRange._start && _dateRange._end && (
              <div>
                <Label className="font-medium">Date Range</Label>
                <p className="text-sm text-muted-foreground">
                  {_dateRange._start} to {_dateRange._end}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button onClick={handleConfirmSubmission} disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Submitting...' : 'Confirm Export Request'}
            </Button>
            <Button onClick={() => setStep('request')} _variant="outline">
              Back to Edit
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Request Data Export
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Export your personal health data in compliance with HIPAA regulations.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Export Format */}
          <div className="space-y-3">
            <Label htmlFor="_format">Export Format</Label>
            <Select value={formData._format} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, _format: value as any }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Select export _format" />
              </SelectTrigger>
              <SelectContent>
                {EXPORT_FORMATS.map(_format => (
                  <SelectItem key={_format.value} value={_format.value}>
                    <div>
                      <div className="font-medium">{_format.label}</div>
                      <div className="text-xs text-muted-foreground">{_format._description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data Categories */}
          <div className="space-y-3">
            <Label>Data Categories to Include</Label>
            <div className="grid grid-cols-1 gap-3">
              {DATA_CATEGORIES.map(category => (
                <div key={category.id} className="flex items-_start space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id={category.id}
                    checked={formData._categories?.includes(category.id)}
                    onCheckedChange={(checked) => handleCategoryChange(category.id, checked as boolean)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={category.id} className="font-medium cursor-pointer">
                      {category.label}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">{category._description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <Label>Date Range (_Optional)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="_start-date" className="text-sm">Start Date</Label>
                <Input
                  id="_start-date"
                  type="date"
                  value={_dateRange._start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, _start: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="_end-date" className="text-sm">End Date</Label>
                <Input
                  id="_end-date"
                  type="date"
                  value={_dateRange._end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, _end: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-3">
            <Label htmlFor="reason">Reason for Export</Label>
            <Select value={formData.reason} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, reason: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Select reason for data export" />
              </SelectTrigger>
              <SelectContent>
                {EXPORT_REASONS.map(reason => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {formData.reason === 'Other (please specify)' && (
              <Textarea
                placeholder="Please specify your reason for requesting this data export..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                required
              />
            )}
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Your data will be encrypted and available for secure download within 48 hours. 
              The download link will expire after 48 hours for security purposes.
            </AlertDescription>
          </Alert>

          <Button type="submit" className="w-full">
            Review Export Request
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};