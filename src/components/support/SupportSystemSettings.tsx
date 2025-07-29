import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  Eye, 
  EyeOff,
  Clock,
  Shield,
  Bell,
  Users,
  Settings,
  Heart
} from 'lucide-react';
import { toast } from 'sonner';

interface MessageTemplate {
  id: string;
  template_name: string;
  template_category: string;
  message_text: string;
  usage_count: number;
  is_default: boolean;
}

interface PrivacySettings {
  pause_alerts_until: string | null;
  auto_delete_history_hours: number;
  incognito_mode: boolean;
  escalation_delay_minutes: number;
}

interface HelperSettings {
  is_available: boolean;
  availability_hours: { start: string; end: string };
  notification_preferences: {
    crisis: boolean;
    tough_day: boolean;
    connection: boolean;
  };
}

export const SupportSystemSettings: React.FC = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [newTemplate, setNewTemplate] = useState({ name: '', category: '', message: '' });
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    pause_alerts_until: null,
    auto_delete_history_hours: 24,
    incognito_mode: false,
    escalation_delay_minutes: 30
  });
  const [helperSettings, setHelperSettings] = useState<HelperSettings>({
    is_available: false,
    availability_hours: { start: '09:00', end: '21:00' },
    notification_preferences: {
      crisis: true,
      tough_day: true,
      connection: false
    }
  });

  const templateCategories = [
    { value: 'post_crisis', label: 'After Crisis', color: 'bg-red-100 text-red-800' },
    { value: 'crisis', label: 'Crisis Support', color: 'bg-orange-100 text-orange-800' },
    { value: 'tough_day', label: 'Tough Day', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'connection', label: 'Connection', color: 'bg-green-100 text-green-800' },
    { value: 'gratitude', label: 'Gratitude', color: 'bg-purple-100 text-purple-800' },
    { value: 'general', label: 'General', color: 'bg-blue-100 text-blue-800' }
  ];

  useEffect(() => {
    if (user) {
      loadTemplates();
      loadPrivacySettings();
      loadHelperSettings();
    }
  }, [user]);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .or(`user_id.eq.${user!.id},is_default.eq.true`)
        .order('template_category', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const loadPrivacySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('support_privacy_settings')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setPrivacySettings(data);
      }
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
    }
  };

  const loadHelperSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('helper_availability')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setHelperSettings({
          is_available: data.is_available,
          availability_hours: typeof data.availability_hours === 'object' && data.availability_hours 
            ? data.availability_hours as { start: string; end: string }
            : { start: '09:00', end: '21:00' },
          notification_preferences: typeof data.notification_preferences === 'object' && data.notification_preferences
            ? data.notification_preferences as { crisis: boolean; tough_day: boolean; connection: boolean }
            : { crisis: true, tough_day: true, connection: false }
        });
      }
    } catch (error) {
      console.error('Failed to load helper settings:', error);
    }
  };

  const saveTemplate = async () => {
    if (!newTemplate.name || !newTemplate.message) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('message_templates')
        .insert({
          user_id: user!.id,
          template_name: newTemplate.name,
          template_category: newTemplate.category || 'general',
          message_text: newTemplate.message
        });

      if (error) throw error;

      toast.success('Template saved successfully');
      setNewTemplate({ name: '', category: '', message: '' });
      loadTemplates();
    } catch (error: any) {
      toast.error('Failed to save template');
      console.error(error);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id); // Only delete user's own templates

      if (error) throw error;

      toast.success('Template deleted');
      loadTemplates();
    } catch (error: any) {
      toast.error('Failed to delete template');
      console.error(error);
    }
  };

  const savePrivacySettings = async () => {
    try {
      const { error } = await supabase
        .from('support_privacy_settings')
        .upsert({
          user_id: user!.id,
          ...privacySettings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success('Privacy settings saved');
    } catch (error: any) {
      toast.error('Failed to save privacy settings');
      console.error(error);
    }
  };

  const saveHelperSettings = async () => {
    try {
      const { error } = await supabase
        .from('helper_availability')
        .upsert({
          user_id: user!.id,
          ...helperSettings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success('Helper settings saved');
    } catch (error: any) {
      toast.error('Failed to save helper settings');
      console.error(error);
    }
  };

  const pauseAlerts = (hours: number) => {
    const pauseUntil = new Date();
    pauseUntil.setHours(pauseUntil.getHours() + hours);
    
    setPrivacySettings(prev => ({
      ...prev,
      pause_alerts_until: pauseUntil.toISOString()
    }));
  };

  const getCategoryColor = (category: string) => {
    return templateCategories.find(c => c.value === category)?.color || 'bg-gray-100 text-gray-800';
  };

  const isPaused = privacySettings.pause_alerts_until && new Date(privacySettings.pause_alerts_until) > new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Support System Settings</h1>
          <p className="text-muted-foreground">
            Customize your support experience and help others in their recovery
          </p>
        </div>

        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="helper" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Helper Mode
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          {/* Message Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create Custom Message Template
                </CardTitle>
                <CardDescription>
                  Pre-write messages for different situations to make reaching out easier
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input
                      id="template-name"
                      placeholder="e.g., After therapy session"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="template-category">Category</Label>
                    <select
                      id="template-category"
                      className="w-full p-2 border rounded-md"
                      value={newTemplate.category}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
                    >
                      <option value="">Select category...</option>
                      {templateCategories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="template-message">Message</Label>
                  <Textarea
                    id="template-message"
                    placeholder="The message that will be sent to your support network..."
                    value={newTemplate.message}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, message: e.target.value }))}
                    rows={3}
                  />
                </div>
                <Button onClick={saveTemplate} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save Template
                </Button>
              </CardContent>
            </Card>

            {/* Existing Templates */}
            <Card>
              <CardHeader>
                <CardTitle>Your Message Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div key={template.id} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{template.template_name}</h4>
                          <Badge variant="outline" className={getCategoryColor(template.template_category)}>
                            {templateCategories.find(c => c.value === template.template_category)?.label || template.template_category}
                          </Badge>
                          {template.is_default && (
                            <Badge variant="outline">Default</Badge>
                          )}
                        </div>
                        {!template.is_default && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => deleteTemplate(template.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{template.message_text}</p>
                      <div className="text-xs text-muted-foreground">
                        Used {template.usage_count} times
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Settings Tab */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy & Timing Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Pause Alerts */}
                <div className="space-y-3">
                  <Label>Pause Alerts Temporarily</Label>
                  {isPaused ? (
                    <Alert className="border-orange-200 bg-orange-50">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800">
                        Alerts paused until {new Date(privacySettings.pause_alerts_until!).toLocaleString()}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="ml-2"
                          onClick={() => setPrivacySettings(prev => ({ ...prev, pause_alerts_until: null }))}
                        >
                          Resume Now
                        </Button>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => pauseAlerts(2)}>Pause 2h</Button>
                      <Button variant="outline" onClick={() => pauseAlerts(8)}>Pause 8h</Button>
                      <Button variant="outline" onClick={() => pauseAlerts(24)}>Pause 24h</Button>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Auto-delete History */}
                <div className="space-y-3">
                  <Label>Auto-delete Support History</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      value={privacySettings.auto_delete_history_hours}
                      onChange={(e) => setPrivacySettings(prev => ({ 
                        ...prev, 
                        auto_delete_history_hours: parseInt(e.target.value) || 24 
                      }))}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">hours after sending</span>
                  </div>
                </div>

                <Separator />

                {/* Incognito Mode */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Incognito Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      No record kept of support requests
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings.incognito_mode}
                    onCheckedChange={(checked) => 
                      setPrivacySettings(prev => ({ ...prev, incognito_mode: checked }))
                    }
                  />
                </div>

                <Separator />

                {/* Escalation Delay */}
                <div className="space-y-3">
                  <Label>Escalation Delay</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      value={privacySettings.escalation_delay_minutes}
                      onChange={(e) => setPrivacySettings(prev => ({ 
                        ...prev, 
                        escalation_delay_minutes: parseInt(e.target.value) || 30 
                      }))}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">
                      minutes before alerting additional contacts
                    </span>
                  </div>
                </div>

                <Button onClick={savePrivacySettings} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save Privacy Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Helper Mode Tab */}
          <TabsContent value="helper" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Reciprocal Support Network
                </CardTitle>
                <CardDescription>
                  Help others in their recovery journey while strengthening your own
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Helper Availability */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>I'm Available to Help Others</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive anonymous support requests from the community
                    </p>
                  </div>
                  <Switch
                    checked={helperSettings.is_available}
                    onCheckedChange={(checked) => 
                      setHelperSettings(prev => ({ ...prev, is_available: checked }))
                    }
                  />
                </div>

                {helperSettings.is_available && (
                  <>
                    <Separator />

                    {/* Availability Hours */}
                    <div className="space-y-3">
                      <Label>Available Hours</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="start-time" className="text-sm">Start Time</Label>
                          <Input
                            id="start-time"
                            type="time"
                            value={helperSettings.availability_hours.start}
                            onChange={(e) => setHelperSettings(prev => ({
                              ...prev,
                              availability_hours: { ...prev.availability_hours, start: e.target.value }
                            }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="end-time" className="text-sm">End Time</Label>
                          <Input
                            id="end-time"
                            type="time"
                            value={helperSettings.availability_hours.end}
                            onChange={(e) => setHelperSettings(prev => ({
                              ...prev,
                              availability_hours: { ...prev.availability_hours, end: e.target.value }
                            }))}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Notification Preferences */}
                    <div className="space-y-4">
                      <Label>Support Request Types to Receive</Label>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Crisis Support (urgent)</span>
                          <Switch
                            checked={helperSettings.notification_preferences.crisis}
                            onCheckedChange={(checked) => 
                              setHelperSettings(prev => ({
                                ...prev,
                                notification_preferences: { ...prev.notification_preferences, crisis: checked }
                              }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Tough Day Support</span>
                          <Switch
                            checked={helperSettings.notification_preferences.tough_day}
                            onCheckedChange={(checked) => 
                              setHelperSettings(prev => ({
                                ...prev,
                                notification_preferences: { ...prev.notification_preferences, tough_day: checked }
                              }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">General Connection</span>
                          <Switch
                            checked={helperSettings.notification_preferences.connection}
                            onCheckedChange={(checked) => 
                              setHelperSettings(prev => ({
                                ...prev,
                                notification_preferences: { ...prev.notification_preferences, connection: checked }
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <Button onClick={saveHelperSettings} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save Helper Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Smart Notification Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    Advanced anonymity and rotation features coming soon:
                    <ul className="mt-2 space-y-1 text-sm">
                      <li>• "Send without my name" option</li>
                      <li>• Group alert: "Someone in your network needs support"</li>
                      <li>• Rotating support to prevent overwhelming one person</li>
                      <li>• "Alert sponsor only" toggle</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
