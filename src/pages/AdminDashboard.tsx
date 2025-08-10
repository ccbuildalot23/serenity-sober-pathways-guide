import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, Database, Clock, Trash2, Download, 
  Settings, AlertTriangle, CheckCircle, Users
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [disposalReason, setDisposalReason] = useState('');
  const [backupStatus, setBackupStatus] = useState('Last backup: Today');
  const [recoveryPlan, setRecoveryPlan] = useState('RTO: 4 hours, RPO: 1 hour');

  useEffect(() => {
    // Simulate loading admin data
    console.log('Admin dashboard loaded for user:', user?.email);
  }, [user]);

  const handleDataRetentionSettings = () => {
    setActiveTab('retention');
  };

  const handleDataDisposal = () => {
    setActiveTab('disposal');
  };

  const handleBackupManagement = () => {
    setActiveTab('backup');
  };

  const handleRecoveryProcedures = () => {
    setActiveTab('recovery');
  };

  const initiateDisposal = () => {
    // Simulate disposal initiation
    console.log('Initiating data disposal with reason:', disposalReason);
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="admin-dashboard">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Badge variant="outline" className="text-green-600">
          <Shield className="w-4 h-4 mr-2" />
          HIPAA Compliant
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="retention">Data Retention</TabsTrigger>
          <TabsTrigger value="disposal">Data Disposal</TabsTrigger>
          <TabsTrigger value="backup">Backup & Recovery</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,234</div>
                <p className="text-xs text-muted-foreground">+12% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Healthy</div>
                <p className="text-xs text-muted-foreground">All systems operational</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Security Status</CardTitle>
                <Shield className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">Secure</div>
                <p className="text-xs text-muted-foreground">No security alerts</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="retention" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Data Retention Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Retention Policy</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    <span data-testid="retention-policy">7 years</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Data Categories</label>
                  <div className="mt-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Patient Records</span>
                      <Badge>7 years</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Audit Logs</span>
                      <Badge>7 years</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>System Logs</span>
                      <Badge>2 years</Badge>
                    </div>
                  </div>
                </div>
              </div>
              <Button 
                onClick={handleDataRetentionSettings}
                data-testid="data-retention-settings"
                className="w-full"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configure Retention Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disposal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Data Disposal Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Disposal Reason</label>
                <Textarea
                  placeholder="Enter reason for data disposal..."
                  value={disposalReason}
                  onChange={(e) => setDisposalReason(e.target.value)}
                  data-testid="disposal-reason"
                  className="mt-1"
                />
              </div>
              <Button 
                onClick={initiateDisposal}
                data-testid="initiate-disposal"
                className="w-full"
                variant="destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Initiate Data Disposal
              </Button>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="font-medium">Important Notice</span>
                </div>
                <p className="text-sm text-yellow-800 mt-1">
                  <span data-testid="disposal-confirmation">
                    Data disposal requires a 30-day waiting period before permanent deletion.
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Backup & Recovery Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Backup Status</label>
                  <div className="mt-1 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span data-testid="backup-status">{backupStatus}</span>
                    </div>
                    <div className="mt-2">
                      <span data-testid="backup-encrypted" className="text-sm text-green-700">
                        ✓ Encrypted backup stored securely
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Recovery Plan</label>
                  <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <span data-testid="recovery-plan">{recoveryPlan}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleBackupManagement}
                  data-testid="backup-management"
                  className="flex-1"
                >
                  <Database className="w-4 h-4 mr-2" />
                  Manage Backups
                </Button>
                <Button 
                  onClick={handleRecoveryProcedures}
                  data-testid="recovery-procedures"
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Recovery Procedures
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
