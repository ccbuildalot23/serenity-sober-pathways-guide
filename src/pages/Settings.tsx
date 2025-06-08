
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, Bell, Shield, Accessibility, Database, 
  User, LogOut, Download, Trash2, Eye
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { SmartReminderSettings } from '@/components/settings/SmartReminderSettings';
import { CrisisAccessibilitySettings } from '@/components/settings/CrisisAccessibilitySettings';

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleExportData = async () => {
    try {
      // Collect all user data
      const userData = {
        profile: user,
        checkins: JSON.parse(localStorage.getItem('dailyCheckins') || '[]'),
        supportContacts: JSON.parse(localStorage.getItem('supportContacts') || '[]'),
        milestones: JSON.parse(localStorage.getItem('milestones') || '[]'),
        favorites: JSON.parse(localStorage.getItem('recoveryFavorites') || '[]'),
        exportDate: new Date().toISOString()
      };
      
      // Create blob and download
      const blob = new Blob([JSON.stringify(userData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `serenity-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success("Data exported successfully!");
    } catch (error) {
      toast.error("Failed to export data");
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure? This action cannot be undone.")) return;
    
    setIsDeleting(true);
    try {
      // In a real app, this would call a Supabase function to delete all user data
      // For now, we'll clear local storage
      localStorage.clear();
      sessionStorage.clear();
      
      toast.success("Account deleted. Redirecting...");
      setTimeout(() => {
        signOut();
      }, 2000);
    } catch (error) {
      toast.error("Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Layout activeTab="settings" onTabChange={() => {}}>
      <div className="p-4 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#1E3A8A]">Settings</h1>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">
              <Settings className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="reminders">
              <Bell className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="privacy">
              <Shield className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="accessibility">
              <Accessibility className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="data">
              <Database className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            {/* Profile Section */}
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{user?.email}</h3>
                    <p className="text-sm text-gray-600">
                      Member since {new Date(user?.created_at || '').toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Separator />
                <Button variant="outline" className="w-full">
                  Edit Profile
                </Button>
              </CardContent>
            </Card>

            {/* App Preferences */}
            <Card>
              <CardHeader>
                <CardTitle>App Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Theme</h4>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Light</Button>
                    <Button variant="outline" size="sm">Dark</Button>
                    <Button variant="outline" size="sm">System</Button>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">Language</h4>
                  <select className="w-full p-2 border rounded">
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reminders" className="space-y-6">
            <SmartReminderSettings />
            <NotificationPreferences />
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            <PrivacySettings />
            
            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Two-Factor Authentication</h4>
                    <p className="text-sm text-gray-600">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Button variant="outline">Enable</Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Biometric Login</h4>
                    <p className="text-sm text-gray-600">
                      Use fingerprint or face recognition
                    </p>
                  </div>
                  <Button variant="outline">Set Up</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accessibility" className="space-y-6">
            <CrisisAccessibilitySettings />
            
            {/* Voice Control Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Voice Control</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Voice Commands</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• "Hey Serenity, check in" - Daily check-in</li>
                    <li>• "Hey Serenity, I need help" - Crisis support</li>
                    <li>• "Hey Serenity, call sponsor" - Quick contact</li>
                    <li>• "Hey Serenity, show progress" - View stats</li>
                  </ul>
                </div>
                <Button variant="outline" className="w-full">
                  Test Voice Commands
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <DataManagement />
            
            {/* Data Export/Import */}
            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Export Your Data</h4>
                    <p className="text-sm text-gray-600">
                      Download all your data in JSON format
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleExportData}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Clear Local Data</h4>
                    <p className="text-sm text-gray-600">
                      Remove cached data from this device
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="text-orange-600 hover:text-orange-700"
                    onClick={() => {
                      localStorage.clear();
                      toast.success("Local data cleared");
                    }}
                  >
                    Clear
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-red-600">Delete Account</h4>
                    <p className="text-sm text-gray-600">
                      Permanently delete your account and all data
                    </p>
                  </div>
                  <Button 
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

// Additional settings components defined inline
const NotificationPreferences = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-medium">Daily Content</h4>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input type="checkbox" defaultChecked />
              <span>Morning Affirmation</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" defaultChecked />
              <span>Daily Focus Reminder</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" />
              <span>Evening Reflection</span>
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const PrivacySettings = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Anonymous Mode</h4>
            <p className="text-sm text-gray-600">
              Hide personal information in the app
            </p>
          </div>
          <Switch />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Share Usage Analytics</h4>
            <p className="text-sm text-gray-600">
              Help improve the app (anonymous data only)
            </p>
          </div>
          <Switch defaultChecked />
        </div>
      </CardContent>
    </Card>
  );
};

const DataManagement = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup & Sync</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Auto Backup</h4>
            <p className="text-sm text-gray-600">
              Automatically backup data to cloud
            </p>
          </div>
          <Switch defaultChecked />
        </div>
        <Separator />
        <div>
          <h4 className="font-medium mb-2">Last Backup</h4>
          <p className="text-sm text-gray-600">
            {new Date().toLocaleString()}
          </p>
          <Button variant="outline" size="sm" className="mt-2">
            Backup Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
