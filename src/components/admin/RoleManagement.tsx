import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { UserRole, DEFAULT_PERMISSIONS, hasPermission } from "@/types/userRoles";
import { 
  Users, 
  Shield, 
  Eye, 
  Settings,
  User,
  UserCog,
  Stethoscope,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  Key
} from 'lucide-react';

interface RoleTestUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: string[];
}

const RoleManagement: React.FC = () => {
  const { toast } = useToast();
  const { role: currentRole, switchRole, isProvider } = useUserRole();
  const [selectedRole, setSelectedRole] = useState<UserRole>('patient');
  const [testUsers] = useState<RoleTestUser[]>([
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah.patient@example.com',
      role: 'patient',
      permissions: ['canAccessOwnData', 'canSubmitCheckIns', 'canManageSupportNetwork', 'canViewOwnProgress']
    },
    {
      id: '2',
      name: 'Dr. Michael Chen',
      email: 'dr.chen@clinic.com',
      role: 'provider',
      permissions: ['canAccessPatientDashboards', 'canViewCheckInPatterns', 'canManageCarePlans', 'canAccessCrisisNotifications']
    },
    {
      id: '3',
      name: 'Emma Wilson',
      email: 'emma.support@family.com',
      role: 'support_member',
      permissions: ['canReceiveCrisisAlerts', 'canViewLimitedProgress', 'canAccessCareNavigation']
    }
  ]);

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'patient': return <User className="w-4 h-4" />;
      case 'provider': return <Stethoscope className="w-4 h-4" />;
      case 'support_member': return <Users className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'patient': return 'default';
      case 'provider': return 'destructive';
      case 'support_member': return 'secondary';
      default: return 'outline';
    }
  };

  const getHipaaLevel = (role: UserRole) => {
    return DEFAULT_PERMISSIONS[role].hipaaAccessLevel;
  };

  const getHipaaLevelColor = (level: string) => {
    switch (level) {
      case 'full': return 'text-green-600';
      case 'limited': return 'text-yellow-600';
      case 'none': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const handleRoleSwitch = async (newRole: UserRole) => {
    if (import.meta.env.DEV) {
      await switchRole(newRole);
      toast({
        title: "Role Switched",
        description: `You are now viewing as: ${newRole}`,
      });
    } else {
      toast({
        title: "Role Switch Disabled",
        description: "Role switching is only available in development mode",
        variant: "destructive",
      });
    }
  };

  const analyzePermissions = (role: UserRole) => {
    const permissions = DEFAULT_PERMISSIONS[role];
    const enabledPermissions = Object.entries(permissions)
      .filter(([key, value]) => typeof value === 'boolean' && value)
      .map(([key]) => key);
    
    return enabledPermissions;
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          Role Management & Permission System
        </h1>
        <p className="text-muted-foreground">
          Three-tier permission system with granular access controls and HIPAA compliance
        </p>
      </div>

      {/* Current Role Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Current Session
          </CardTitle>
          <CardDescription>Your current role and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Badge variant={getRoleColor(currentRole)} className="flex items-center gap-1">
                {getRoleIcon(currentRole)}
                {currentRole.replace('_', ' ')}
              </Badge>
              <Badge variant="outline" className={getHipaaLevelColor(getHipaaLevel(currentRole))}>
                HIPAA: {getHipaaLevel(currentRole)}
              </Badge>
            </div>
            
            {import.meta.env.DEV && (
              <div className="flex items-center gap-2">
                <Label htmlFor="role-switch">Test Role:</Label>
                <Select value={currentRole} onValueChange={handleRoleSwitch}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient">Patient</SelectItem>
                    <SelectItem value="provider">Provider</SelectItem>
                    <SelectItem value="support_member">Support Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {analyzePermissions(currentRole).map((permission) => (
              <div key={permission} className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span className="text-muted-foreground">{permission.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Role Comparison Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Permission Matrix
          </CardTitle>
          <CardDescription>Granular access controls across user roles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Patient Permissions */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="default" className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Patient
                </Badge>
                <Badge variant="outline" className="text-green-600">HIPAA: Full</Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  Access Own Data
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  Submit Check-ins
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  Manage Support Network
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  View Own Progress
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  Patient Dashboards (No)
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  Clinical Tools (No)
                </div>
              </div>
            </div>

            <Separator />

            {/* Provider Permissions */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="destructive" className="flex items-center gap-1">
                  <Stethoscope className="w-3 h-3" />
                  Provider
                </Badge>
                <Badge variant="outline" className="text-green-600">HIPAA: Full</Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  Patient Dashboards
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  Check-in Patterns
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  Manage Care Plans
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  Crisis Notifications
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  Clinical Documentation
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  Personal Recovery Tools (No)
                </div>
              </div>
            </div>

            <Separator />

            {/* Support Member Permissions */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Support Member
                </Badge>
                <Badge variant="outline" className="text-yellow-600">HIPAA: Limited</Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  Crisis Alerts Only
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  Limited Progress View
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  Care Navigation
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  Personal Health Info (No)
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  Clinical Data (No)
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  Direct Patient Data (No)
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            Sample Test Users
          </CardTitle>
          <CardDescription>Example users for testing each role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {testUsers.map((user) => (
              <div key={user.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-semibold">{user.name}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleColor(user.role)} className="flex items-center gap-1">
                      {getRoleIcon(user.role)}
                      {user.role.replace('_', ' ')}
                    </Badge>
                    {import.meta.env.DEV && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleRoleSwitch(user.role)}
                      >
                        Switch to Role
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="text-sm">
                  <p className="font-medium mb-1">Key Permissions:</p>
                  <div className="flex flex-wrap gap-2">
                    {user.permissions.map((permission) => (
                      <Badge key={permission} variant="outline" className="text-xs">
                        {permission.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Sharing Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Granular Data Sharing Controls
          </CardTitle>
          <CardDescription>Patient-controlled data sharing permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium">With Support Network</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="share-milestones">Share Milestones</Label>
                    <Switch id="share-milestones" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="share-crisis">Crisis Alerts</Label>
                    <Switch id="share-crisis" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="share-mood">General Mood Trends</Label>
                    <Switch id="share-mood" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="share-checkins">Check-in Status</Label>
                    <Switch id="share-checkins" defaultChecked />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium">With Healthcare Providers</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="provider-full">Full Clinical Access</Label>
                    <Switch id="provider-full" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="provider-assessments">Assessment Results</Label>
                    <Switch id="provider-assessments" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="provider-patterns">Behavioral Patterns</Label>
                    <Switch id="provider-patterns" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="provider-billing">Billing Information</Label>
                    <Switch id="provider-billing" defaultChecked />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* HIPAA Compliance Notice */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100">
              HIPAA-Compliant Role-Based Access Control
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
              All data access is logged and audited. Support network members receive only 
              non-PHI information with explicit patient consent. Healthcare providers have 
              full clinical access under treatment authorization. Patient consent can be 
              modified at any time through granular controls.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleManagement;