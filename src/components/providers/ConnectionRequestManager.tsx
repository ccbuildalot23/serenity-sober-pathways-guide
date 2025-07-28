import React, { useState, useEffect } from 'react';
import { Clock, Check, X, MessageSquare, User, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ProviderService } from '@/services/providerService';
import type { ProviderConnectionRequest } from '@/types/provider';
import { useToast } from '@/hooks/use-toast';

export const ConnectionRequestManager: React.FC = () => {
  const [requests, setRequests] = useState<ProviderConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [responseMessage, setResponseMessage] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const data = await ProviderService.getMyConnectionRequests();
      setRequests(data);
    } catch (error) {
      console.error('Failed to load connection requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (requestId: string, status: 'approved' | 'declined') => {
    try {
      await ProviderService.respondToConnectionRequest(requestId, status, responseMessage);
      
      toast({
        title: status === 'approved' ? 'Connection approved' : 'Connection declined',
        description: `You have ${status} the connection request.`
      });

      setSelectedRequest(null);
      setResponseMessage('');
      loadRequests(); // Refresh the list
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to respond to connection request.',
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'approved': return <Check className="w-4 h-4" />;
      case 'declined': return <X className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Connection Requests
        </CardTitle>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-4" />
            <p>No connection requests found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">Connection Request</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {new Date(request.requested_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <Badge className={getStatusColor(request.status)}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(request.status)}
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </div>
                  </Badge>
                </div>

                {request.request_message && (
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm">{request.request_message}</p>
                  </div>
                )}

                {request.provider_response && (
                  <div className="bg-blue-50 p-3 rounded-md">
                    <p className="text-sm font-medium mb-1">Your response:</p>
                    <p className="text-sm">{request.provider_response}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Requested data sharing:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      {request.share_daily_checkins ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <X className="w-4 h-4 text-red-600" />
                      )}
                      Daily check-ins
                    </div>
                    <div className="flex items-center gap-2">
                      {request.share_mood_data ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <X className="w-4 h-4 text-red-600" />
                      )}
                      Mood data
                    </div>
                    <div className="flex items-center gap-2">
                      {request.share_goal_progress ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <X className="w-4 h-4 text-red-600" />
                      )}
                      Goal progress
                    </div>
                    <div className="flex items-center gap-2">
                      {request.share_crisis_events ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <X className="w-4 h-4 text-red-600" />
                      )}
                      Crisis events
                    </div>
                  </div>
                </div>

                {request.status === 'pending' && (
                  <div className="flex gap-2 pt-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          onClick={() => setSelectedRequest(request.id)}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Approve Connection Request</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            You're about to approve this connection request. The patient will be able to share their selected data with you.
                          </p>
                          <div>
                            <label className="text-sm font-medium">Response message (optional)</label>
                            <Textarea
                              placeholder="Welcome! I look forward to working with you..."
                              value={responseMessage}
                              onChange={(e) => setResponseMessage(e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div className="flex gap-3">
                            <Button 
                              onClick={() => handleResponse(request.id, 'approved')}
                              className="flex-1"
                            >
                              Approve Connection
                            </Button>
                            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedRequest(request.id)}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Decline
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Decline Connection Request</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Reason for declining (optional)</label>
                            <Textarea
                              placeholder="Thank you for your interest. Unfortunately..."
                              value={responseMessage}
                              onChange={(e) => setResponseMessage(e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div className="flex gap-3">
                            <Button 
                              variant="destructive"
                              onClick={() => handleResponse(request.id, 'declined')}
                              className="flex-1"
                            >
                              Decline Request
                            </Button>
                            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};