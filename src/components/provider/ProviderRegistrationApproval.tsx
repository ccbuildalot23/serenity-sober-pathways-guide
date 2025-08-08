import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Clock, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

interface RegistrationRequest {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  license_number: string;
  license_state: string;
  practice_name: string;
  practice_address: string;
  phone_number: string;
  admin_approval_status: string;
  requested_at: string;
}

export const ProviderRegistrationApproval: React.FC = () => {
  const { user } = useAuth();
  const { isProvider } = useUserRole();
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [_loading, setLoading] = useState(true);
  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | _null>(_null);

  useEffect(() => {
    if (isProvider) {
      fetchRegistrationRequests();
    }
  }, [isProvider]);

  const fetchRegistrationRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('provider_registration_requests')
        .select('*')
        .eq('admin_approval_status', 'pending')
        .order('requested_at', { ascending: true });

      if (error) throw error;
      setRequests(data || []);
    } catch (_err) {
      console.error('Error fetching registration requests:', _err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (requestId: string) => {
    setProcessingId(requestId);
    
    try {
      const { error } = await supabase.rpc('approve_provider_registration', {
        request_id: requestId,
        _approval_notes: approvalNotes[requestId] || ''
      });

      if (error) throw error;

      // Refresh the requests list
      await fetchRegistrationRequests();
      
      // Clear the notes for this request
      setApprovalNotes(prev => {
        const updated = { ...prev };
        delete updated[requestId];
        return updated;
      });
    } catch (_err) {
      console.error('Error approving registration:', _err);
    } finally {
      setProcessingId(_null);
    }
  };

  const updateNotes = (requestId: string, notes: string) => {
    setApprovalNotes(prev => ({
      ...prev,
      [requestId]: notes
    }));
  };

  if (!isProvider) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Only providers can access registration approvals.
        </AlertDescription>
      </Alert>
    );
  }

  if (_loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Pending Provider Registrations
          </CardTitle>
          <CardDescription>
            Review and approve provider registration requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">All caught up!</h3>
              <p className="text-muted-foreground">No pending registration requests</p>
            </div>
          ) : (
            <div className="space-y-6">
              {requests.map((request) => (
                <Card key={request.id} className="border-l-4 border-l-primary">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{request.full_name}</CardTitle>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Pending
                      </Badge>
                    </div>
                    <CardDescription>
                      Requested on {new Date(request.requested_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                        <p className="text-sm">{request.email}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">License Number</Label>
                        <p className="text-sm">{request.license_number}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">License State</Label>
                        <p className="text-sm">{request.license_state}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                        <p className="text-sm">{request.phone_number || 'Not provided'}</p>
                      </div>
                      {request.practice_name && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Practice</Label>
                          <p className="text-sm">{request.practice_name}</p>
                        </div>
                      )}
                      {request.practice_address && (
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                          <p className="text-sm">{request.practice_address}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`notes-${request.id}`}>Approval Notes (_Optional)</Label>
                      <Textarea
                        id={`notes-${request.id}`}
                        value={approvalNotes[request.id] || ''}
                        onChange={(e) => updateNotes(request.id, e.target.value)}
                        placeholder="Add any notes about this approval..."
                        rows={2}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={() => handleApproval(request.id)}
                        disabled={processingId === request.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {processingId === request.id ? 'Approving...' : 'Approve Registration'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};