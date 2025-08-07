/**
 * Crisis Notification Dashboard
 * 
 * Real-time dashboard for crisis management showing active alerts,
 * supporter responses, and system status. Integrates with both
 * in-app notifications and MCP systems.
 */

import React, { useState } from 'react';
import { 
  Bell, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  MapPin,
  Phone,
  MessageSquare,
  Activity,
  AlertCircle,
  Zap,
  Shield,
  Heart
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

import { useCrisisManagement } from '@/hooks/useCrisisManagement';
import { cn } from '@/lib/utils';

const CrisisNotificationDashboard: React.FC = () => {
  const {
    activeCrisis,
    crisisStatus,
    isLoadingStatus,
    connectionStatus,
    notifications,
    unreadCount,
    createCrisisAlert,
    respondToAlert,
    escalateAlert,
    resolveAlert,
    acknowledgeNotification,
    markNotificationRead,
    clearNotifications,
    isCreatingAlert,
    isResponding,
    isEscalating,
    isResolving,
    error,
    clearError,
    systemHealth
  } = useCrisisManagement(activeCrisis?.id);

  const [selectedTab, setSelectedTab] = useState('overview');
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [escalationDialogOpen, setEscalationDialogOpen] = useState(false);
  const [resolutionDialogOpen, setResolutionDialogOpen] = useState(false);
  const [createAlertDialogOpen, setCreateAlertDialogOpen] = useState(false);

  // Form states
  const [responseForm, setResponseForm] = useState({
    type: 'acknowledged' as const,
    message: ''
  });
  const [escalationForm, setEscalationForm] = useState({
    type: 'next_tier' as const,
    reason: ''
  });
  const [resolutionForm, setResolutionForm] = useState({
    description: '',
    followUpNeeded: false
  });
  const [alertForm, setAlertForm] = useState({
    severity: 'medium' as const,
    message: '',
    customMessage: ''
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'text-green-600';
      case 'escalated': return 'text-red-600';
      case 'acknowledged': return 'text-blue-600';
      case 'notified': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const handleCreateAlert = async () => {
    try {
      await createCrisisAlert({
        severity: alertForm.severity,
        message: alertForm.message,
        customMessage: alertForm.customMessage
      });
      setCreateAlertDialogOpen(false);
      setAlertForm({ severity: 'medium', message: '', customMessage: '' });
      toast.success('Crisis alert sent to support network');
    } catch (error) {
      console.error('Error creating alert:', error);
    }
  };

  const handleRespond = async () => {
    if (!activeCrisis) return;
    
    try {
      await respondToAlert(activeCrisis.id, responseForm);
      setResponseDialogOpen(false);
      setResponseForm({ type: 'acknowledged', message: '' });
    } catch (error) {
      console.error('Error responding to alert:', error);
    }
  };

  const handleEscalate = async () => {
    if (!activeCrisis) return;
    
    try {
      await escalateAlert(activeCrisis.id, escalationForm);
      setEscalationDialogOpen(false);
      setEscalationForm({ type: 'next_tier', reason: '' });
    } catch (error) {
      console.error('Error escalating alert:', error);
    }
  };

  const handleResolve = async () => {
    if (!activeCrisis) return;
    
    try {
      await resolveAlert(activeCrisis.id, resolutionForm);
      setResolutionDialogOpen(false);
      setResolutionForm({ description: '', followUpNeeded: false });
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Crisis Management Center</h1>
            <p className="text-gray-600">Real-time crisis support coordination</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className={cn(
            "flex items-center space-x-2 px-3 py-1 rounded-full text-sm",
            connectionStatus.connected 
              ? "bg-green-100 text-green-700" 
              : "bg-red-100 text-red-700"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full",
              connectionStatus.connected ? "bg-green-500" : "bg-red-500"
            )} />
            <span>{connectionStatus.connected ? 'Connected' : 'Disconnected'}</span>
          </div>
          
          {/* Notifications */}
          <div className="relative">
            <Button variant="outline" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </div>
          
          {/* Create Alert */}
          <Dialog open={createAlertDialogOpen} onOpenChange={setCreateAlertDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Create Alert
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Crisis Alert</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Severity Level</Label>
                  <Select value={alertForm.severity} onValueChange={(value: any) => 
                    setAlertForm(prev => ({ ...prev, severity: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Need to talk</SelectItem>
                      <SelectItem value="medium">Medium - Feeling struggling</SelectItem>
                      <SelectItem value="high">High - Need support now</SelectItem>
                      <SelectItem value="critical">Critical - Emergency help</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Message</Label>
                  <Textarea
                    placeholder="What's happening? Your support network wants to help..."
                    value={alertForm.message}
                    onChange={(e) => setAlertForm(prev => ({ ...prev, message: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label>Custom Message (optional)</Label>
                  <Textarea
                    placeholder="Personal message to your supporters..."
                    value={alertForm.customMessage}
                    onChange={(e) => setAlertForm(prev => ({ ...prev, customMessage: e.target.value }))}
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setCreateAlertDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateAlert}
                    disabled={isCreatingAlert || !alertForm.message}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isCreatingAlert ? 'Sending...' : 'Send Alert'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* System Health Status */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <span className="font-medium">In-App System</span>
              </div>
              <Badge variant={systemHealth.inApp ? 'default' : 'destructive'}>
                {systemHealth.inApp ? 'Healthy' : 'Error'}
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                <span className="font-medium">MCP System</span>
              </div>
              <Badge variant={systemHealth.mcp ? 'default' : 'destructive'}>
                {systemHealth.mcp ? 'Healthy' : 'Error'}
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-green-600" />
                <span className="font-medium">Overall Status</span>
              </div>
              <Badge variant={systemHealth.overall ? 'default' : 'destructive'}>
                {systemHealth.overall ? 'Operational' : 'Degraded'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="active">Active Crisis</TabsTrigger>
          <TabsTrigger value="responses">Responses</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2 text-red-600" />
                  Active Crises
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {activeCrisis ? 1 : 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {activeCrisis ? `${activeCrisis.severity} severity` : 'No active crises'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Users className="h-4 w-4 mr-2 text-blue-600" />
                  Responders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {activeCrisis?.responderCount || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Support network active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Bell className="h-4 w-4 mr-2 text-yellow-600" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {notifications.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {unreadCount} unread
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  Response Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {crisisStatus?.summary?.totalResponders ? '< 2min' : '-'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average response
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {notifications.length > 0 ? (
                <div className="space-y-3">
                  {notifications.slice(0, 5).map((notification) => (
                    <div key={notification.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-2",
                        notification.severity === 'critical' ? 'bg-red-500' :
                        notification.severity === 'high' ? 'bg-orange-500' :
                        notification.severity === 'medium' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      )} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{notification.title}</h4>
                          <span className="text-xs text-gray-500">
                            {new Date(notification.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{notification.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Crisis Tab */}
        <TabsContent value="active" className="space-y-6">
          {activeCrisis ? (
            <>
              {/* Crisis Details */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <AlertTriangle className={cn(
                        "h-5 w-5",
                        activeCrisis.severity === 'critical' ? 'text-red-600' :
                        activeCrisis.severity === 'high' ? 'text-orange-600' :
                        'text-yellow-600'
                      )} />
                      <span>Active Crisis Alert</span>
                      <Badge variant={getSeverityColor(activeCrisis.severity) as any}>
                        {activeCrisis.severity.toUpperCase()}
                      </Badge>
                    </CardTitle>
                    <div className="flex space-x-2">
                      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Respond
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Respond to Crisis</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Response Type</Label>
                              <Select value={responseForm.type} onValueChange={(value: any) => 
                                setResponseForm(prev => ({ ...prev, type: value }))
                              }>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="acknowledged">I see this</SelectItem>
                                  <SelectItem value="on_my_way">On my way</SelectItem>
                                  <SelectItem value="made_contact">Made contact</SelectItem>
                                  <SelectItem value="needs_help">Need help</SelectItem>
                                  <SelectItem value="call_911">Call 911</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label>Message</Label>
                              <Textarea
                                placeholder="Additional message..."
                                value={responseForm.message}
                                onChange={(e) => setResponseForm(prev => ({ ...prev, message: e.target.value }))}
                              />
                            </div>
                            
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" onClick={() => setResponseDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button onClick={handleRespond} disabled={isResponding}>
                                {isResponding ? 'Responding...' : 'Send Response'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog open={escalationDialogOpen} onOpenChange={setEscalationDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Escalate
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Escalate Crisis</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Escalation Type</Label>
                              <Select value={escalationForm.type} onValueChange={(value: any) => 
                                setEscalationForm(prev => ({ ...prev, type: value }))
                              }>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="next_tier">Next tier supporters</SelectItem>
                                  <SelectItem value="professional">Professional services</SelectItem>
                                  <SelectItem value="emergency_services">Emergency services</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label>Reason</Label>
                              <Textarea
                                placeholder="Why is escalation needed?"
                                value={escalationForm.reason}
                                onChange={(e) => setEscalationForm(prev => ({ ...prev, reason: e.target.value }))}
                              />
                            </div>
                            
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" onClick={() => setEscalationDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button 
                                onClick={handleEscalate} 
                                disabled={isEscalating || !escalationForm.reason}
                                className="bg-orange-600 hover:bg-orange-700"
                              >
                                {isEscalating ? 'Escalating...' : 'Escalate'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {activeCrisis.status !== 'resolved' && (
                        <Dialog open={resolutionDialogOpen} onOpenChange={setResolutionDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Resolve
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Resolve Crisis</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Resolution Description</Label>
                                <Textarea
                                  placeholder="How was the crisis resolved?"
                                  value={resolutionForm.description}
                                  onChange={(e) => setResolutionForm(prev => ({ ...prev, description: e.target.value }))}
                                />
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={resolutionForm.followUpNeeded}
                                  onChange={(e) => setResolutionForm(prev => ({ ...prev, followUpNeeded: e.target.checked }))}
                                />
                                <Label>Follow-up needed</Label>
                              </div>
                              
                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => setResolutionDialogOpen(false)}>
                                  Cancel
                                </Button>
                                <Button 
                                  onClick={handleResolve} 
                                  disabled={isResolving || !resolutionForm.description}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {isResolving ? 'Resolving...' : 'Resolve Crisis'}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Crisis Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className={getStatusColor(activeCrisis.status)}>
                            {activeCrisis.status}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tier:</span>
                          <span>{activeCrisis.tier}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Created:</span>
                          <span>{new Date(activeCrisis.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Support Network</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Notified:</span>
                          <span>{activeCrisis.supportersNotified}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Responded:</span>
                          <span>{activeCrisis.responderCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Escalations:</span>
                          <span>{activeCrisis.escalationLevel}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Message</h4>
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        {activeCrisis.message || 'No message provided'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Progress Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Crisis Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      <div>
                        <span className="font-medium">Crisis Alert Created</span>
                        <span className="text-sm text-gray-500 ml-2">
                          {new Date(activeCrisis.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    {activeCrisis.status !== 'created' && (
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                        <div>
                          <span className="font-medium">Support Network Notified</span>
                          <span className="text-sm text-gray-500 ml-2">
                            {activeCrisis.supportersNotified} supporters contacted
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {activeCrisis.responderCount > 0 && (
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full" />
                        <div>
                          <span className="font-medium">First Response Received</span>
                          <span className="text-sm text-gray-500 ml-2">
                            {activeCrisis.responderCount} responder(s)
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {activeCrisis.status === 'resolved' && (
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-green-600 rounded-full" />
                        <div>
                          <span className="font-medium">Crisis Resolved</span>
                          <span className="text-sm text-gray-500 ml-2">
                            Support provided successfully
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Heart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No Active Crisis</h3>
                <p className="text-gray-600 mb-4">
                  Your support network is ready when you need them.
                </p>
                <Button 
                  onClick={() => setCreateAlertDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Create Support Request
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Responses Tab */}
        <TabsContent value="responses" className="space-y-6">
          {crisisStatus?.responses ? (
            <div className="grid gap-4">
              {crisisStatus.responses.map((response) => (
                <Card key={response.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <Avatar>
                          <AvatarFallback>
                            {response.supporterName?.charAt(0) || 'S'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">
                              {response.supporterName || 'Support Member'}
                            </span>
                            {response.isPrimary && (
                              <Badge variant="default" size="sm">Primary</Badge>
                            )}
                            <Badge 
                              variant={response.responseType === 'made_contact' ? 'default' : 'secondary'}
                              size="sm"
                            >
                              {response.responseType.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {response.message}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {new Date(response.respondedAt).toLocaleString()}
                            </span>
                            {response.location && (
                              <span className="flex items-center">
                                <MapPin className="h-3 w-3 mr-1" />
                                Location shared
                              </span>
                            )}
                            {response.estimatedArrival && (
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                ETA: {new Date(response.estimatedArrival).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No Responses Yet</h3>
                <p className="text-gray-600">
                  Responses from your support network will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Real-time Notifications</h3>
            {notifications.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearNotifications}>
                Clear All
              </Button>
            )}
          </div>

          {notifications.length > 0 ? (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <Card key={notification.id} className={cn(
                  "cursor-pointer hover:bg-gray-50 transition-colors",
                  !notification.read && "border-blue-500 bg-blue-50"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium">{notification.title}</span>
                          <Badge 
                            variant={getSeverityColor(notification.severity) as any}
                            size="sm"
                          >
                            {notification.severity}
                          </Badge>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {new Date(notification.createdAt).toLocaleString()}
                          </span>
                          {notification.actionRequired && (
                            <div className="space-x-2">
                              {notification.actions?.map((action) => (
                                <Button
                                  key={action.id}
                                  size="sm"
                                  variant={action.primary ? "default" : "outline"}
                                  onClick={() => {
                                    if (action.type === 'acknowledge') {
                                      acknowledgeNotification(notification.id);
                                    }
                                  }}
                                >
                                  {action.label}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No Notifications</h3>
                <p className="text-gray-600">
                  Real-time notifications will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button onClick={clearError} className="ml-2 text-red-500 hover:text-red-700">
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrisisNotificationDashboard;