import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  MessageCircle, 
  Phone, 
  Heart, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  ArrowLeft,
  Bell,
  UserCheck,
  UserX,
  Send
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SupportRequest {
  id: string;
  person_name: string;
  message: string;
  urgency: 'low' | 'medium' | 'high' | 'crisis';
  created_at: string;
  status: 'pending' | 'acknowledged' | 'responded' | 'resolved';
  person_id: string;
}

interface SupportedPerson {
  id: string;
  name: string;
  email: string;
  phone: string;
  relationship: string;
  last_contact: string;
  status: 'active' | 'inactive';
}

const SupporterDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [supportedPersons, setSupportedPersons] = useState<SupportedPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [responseMessage, setResponseMessage] = useState('');

  useEffect(() => {
    if (user) {
      loadSupportRequests();
      loadSupportedPersons();
    }
  }, [user]);

  const loadSupportRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('support_requests')
        .select('*')
        .eq('supporter_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSupportRequests(data || []);
    } catch (error) {
      console.error('Error loading support requests:', error);
      toast.error('Failed to load support requests');
    }
  };

  const loadSupportedPersons = async () => {
    try {
      const { data, error } = await supabase
        .from('supported_persons')
        .select('*')
        .eq('supporter_id', user?.id)
        .order('name');

      if (error) throw error;
      setSupportedPersons(data || []);
    } catch (error) {
      console.error('Error loading supported persons:', error);
      toast.error('Failed to load supported persons');
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToRequest = async (requestId: string) => {
    if (!responseMessage.trim()) {
      toast.error('Please enter a response message');
      return;
    }

    try {
      const { error } = await supabase
        .from('support_responses')
        .insert({
          support_request_id: requestId,
          supporter_id: user?.id,
          message: responseMessage,
          status: 'sent'
        });

      if (error) throw error;

      // Update request status
      await supabase
        .from('support_requests')
        .update({ status: 'responded' })
        .eq('id', requestId);

      toast.success('Response sent successfully');
      setResponseMessage('');
      setSelectedRequest(null);
      loadSupportRequests();
    } catch (error) {
      console.error('Error sending response:', error);
      toast.error('Failed to send response');
    }
  };

  const handleAcknowledgeRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('support_requests')
        .update({ status: 'acknowledged' })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Request acknowledged');
      loadSupportRequests();
    } catch (error) {
      console.error('Error acknowledging request:', error);
      toast.error('Failed to acknowledge request');
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'crisis': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-500';
      case 'responded': return 'bg-blue-500';
      case 'acknowledged': return 'bg-yellow-500';
      case 'pending': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading supporter dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => navigate('/dashboard')}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-2">
                <Heart className="w-6 h-6 text-red-500" />
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Supporter Dashboard
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-sm">
                {supportedPersons.length} Supported Persons
              </Badge>
              <Badge variant="outline" className="text-sm">
                {supportRequests.filter(r => r.status === 'pending').length} Pending Requests
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Support Requests */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-red-500" />
                  <span>Support Requests</span>
                  {supportRequests.filter(r => r.status === 'pending').length > 0 && (
                    <Badge className="bg-red-500 text-white">
                      {supportRequests.filter(r => r.status === 'pending').length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {supportRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No support requests yet</p>
                    <p className="text-sm text-gray-500">You'll see requests here when someone needs your support</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {supportRequests.map((request) => (
                      <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold">{request.person_name}</h4>
                            <Badge className={getUrgencyColor(request.urgency)}>
                              {request.urgency.toUpperCase()}
                            </Badge>
                            <Badge className={getStatusColor(request.status)}>
                              {request.status.toUpperCase()}
                            </Badge>
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(request.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mb-3">{request.message}</p>
                        
                        <div className="flex space-x-2">
                          {request.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleAcknowledgeRequest(request.id)}
                                variant="outline"
                              >
                                <UserCheck className="w-4 h-4 mr-1" />
                                Acknowledge
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => setSelectedRequest(request)}
                              >
                                <Send className="w-4 h-4 mr-1" />
                                Respond
                              </Button>
                            </>
                          )}
                          {request.status === 'acknowledged' && (
                            <Button
                              size="sm"
                              onClick={() => setSelectedRequest(request)}
                            >
                              <Send className="w-4 h-4 mr-1" />
                              Send Response
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Supported Persons */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  <span>Supported Persons</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {supportedPersons.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No supported persons yet</p>
                    <p className="text-sm text-gray-500">People will appear here when they add you to their support network</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {supportedPersons.map((person) => (
                      <div key={person.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{person.name}</h4>
                            <p className="text-sm text-gray-600">{person.relationship}</p>
                          </div>
                          <Badge variant={person.status === 'active' ? 'default' : 'secondary'}>
                            {person.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600">
                          {person.email && (
                            <p>📧 {person.email}</p>
                          )}
                          {person.phone && (
                            <p>📞 {person.phone}</p>
                          )}
                          <p>🕒 Last contact: {new Date(person.last_contact).toLocaleDateString()}</p>
                        </div>
                        
                        <div className="flex space-x-2 mt-3">
                          <Button size="sm" variant="outline">
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Message
                          </Button>
                          <Button size="sm" variant="outline">
                            <Phone className="w-4 h-4 mr-1" />
                            Call
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Response Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Respond to {selectedRequest.person_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Your Response</label>
                  <Textarea
                    value={responseMessage}
                    onChange={(e) => setResponseMessage(e.target.value)}
                    placeholder="Write your supportive message..."
                    rows={4}
                  />
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleRespondToRequest(selectedRequest.id)}
                    className="flex-1"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Response
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedRequest(null);
                      setResponseMessage('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SupporterDashboard;
