import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GlassCard } from '@/components/ui/GlassCard';
import { MetricWidget } from '@/components/ui/MetricWidget';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-lavender-50 to-sky-50" data-testid="admin-dashboard">
      {/* Premium Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white/60 backdrop-blur-xl border-b border-white/20 shadow-xl"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-lavender-100/50 via-transparent to-sky-100/50" />
        <div className="relative max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
                <motion.div 
                  className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <Shield className="w-8 h-8 text-white" />
                </motion.div>
                Admin Dashboard
              </h1>
              <p className="mt-3 text-gray-700 text-lg font-medium">
                System management and HIPAA compliance
              </p>
              <p className="mt-1 text-gray-600">
                Ensuring secure operations and data protection
              </p>
            </motion.div>
            
            <div className="flex items-center gap-3 relative">
              <Badge variant="outline" className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                HIPAA Secure
              </Badge>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="retention">Data Retention</TabsTrigger>
          <TabsTrigger value="disposal">Data Disposal</TabsTrigger>
          <TabsTrigger value="backup">Backup & Recovery</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <MetricWidget
              title="Active Users"
              value={1234}
              subtitle="+12% from last month"
              icon={Users}
              gradient="emerald"
              delay={0.5}
              trend={{ value: 12, isPositive: true }}
            />
            <MetricWidget
              title="System Health"
              value="Healthy"
              subtitle="All systems operational"
              icon={CheckCircle}
              gradient="sky"
              delay={0.6}
              trend={{ value: 0, isPositive: true }}
            />
            <MetricWidget
              title="Security Status"
              value="Secure"
              subtitle="No security alerts"
              icon={Shield}
              gradient="indigo"
              delay={0.7}
              trend={{ value: 0, isPositive: true }}
            />
          </motion.div>
        </TabsContent>

        <TabsContent value="retention" className="space-y-4">
          <GlassCard className="p-6 bg-white/80">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                Data Retention Settings
              </h3>
            </div>
            <div className="space-y-4">
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
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                size="sm"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configure Retention Settings
              </Button>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="disposal" className="space-y-4">
          <GlassCard className="p-6 bg-white/80">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-red-400 to-rose-500 rounded-lg">
                  <Trash2 className="w-5 h-5 text-white" />
                </div>
                Data Disposal Management
              </h3>
            </div>
            <div className="space-y-4">
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
                className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white"
                size="sm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Initiate Data Disposal
              </Button>
              <div className="p-4 bg-gradient-to-r from-yellow-50/80 to-amber-50/80 border border-yellow-200 rounded-xl mt-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Important Notice</span>
                </div>
                <p className="text-sm text-yellow-800 mt-1">
                  <span data-testid="disposal-confirmation">
                    Data disposal requires a 30-day waiting period before permanent deletion.
                  </span>
                </p>
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="backup" className="space-y-4">
          <GlassCard className="p-6 bg-white/80">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg">
                  <Database className="w-5 h-5 text-white" />
                </div>
                Backup & Recovery Management
              </h3>
            </div>
            <div className="space-y-4">
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
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                  size="sm"
                >
                  <Database className="w-4 h-4 mr-2" />
                  Manage Backups
                </Button>
                <Button 
                  onClick={handleRecoveryProcedures}
                  data-testid="recovery-procedures"
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Recovery Procedures
                </Button>
              </div>
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
