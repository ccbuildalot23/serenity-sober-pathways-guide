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
  _template_name: string;
  _template_category: string;
  _message_text: string;
  usage_count: number;
  is_default: boolean;
}

interface PrivacySettings {
  _pause_alerts_until: string | null;
  _auto_delete_history_hours: number;
  _incognito_mode: boolean;
  _escalation_delay_minutes: number;
}

interface HelperSettings {
  is_available: boolean;
  _availability_hours: { _start: string; _end: string };
  _notification_preferences: {
    _crisis: boolean;
    _tough_day: boolean;
    _connection: boolean;
  };
}

export const SupportSystemSettings: React.FC = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [newTemplate, setNewTemplate] = useState({ _name: '', _category: '', _message: '' });
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    _pause_alerts_until: null,
    _auto_delete_history_hours: 24,
    _incognito_mode: false,
    _escalation_delay_minutes: 30
  });
  const [helperSettings, setHelperSettings] = useState<HelperSettings>({
    is_available: false,
    _availability_hours: { _start: '09:00', _end: '21:00' },
    _notification_preferences: {
      _crisis: true,
      _tough_day: true,
      _connection: false
    }
  });

  const templateCategories = [
    { value: 'post_crisis', label: 'After Crisis', color: 'bg-red-100 text-red-800' },
    { value: '_crisis', label: 'Crisis Support', color: 'bg-orange-100 text-orange-800' },
    { value: '_tough_day', label: 'Tough Day', color: 'bg-yellow-100 text-yellow-800' },
    { value: '_connection', label: 'Connection', color: 'bg-green-100 text-green-800' },
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
      const { data, _error } = await supabase
        .from('message_templates')
        .select('*')
        .or(`user_id.eq.${user!.id},is_default.eq.true`)
        .order('_template_category', { ascending: true });

      if (_error) throw _error;
      setTemplates(data || []);
    } catch (_error) {
      console._error('Failed to load templates:', _error);
    }
  };

  const loadPrivacySettings = async () => {
    try {
      const { data, _error } = await supabase
        .from('support_privacy_settings')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (_error && _error.code !== 'PGRST116') throw _error;
      
      if (data) {
        setPrivacySettings(data);
      }
    } catch (_error) {
      console._error('Failed to load privacy settings:', _error);
    }
  };

  const loadHelperSettings = async () => {
    try {
      const { data, _error } = await supabase
        .from('helper_availability')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (_error && _error.code !== 'PGRST116') throw _error;
      
      if (data) {
        setHelperSettings({
          is_available: data.is_available,
          _availability_hours: typeof data._availability_hours === 'object' && data._availability_hours 
            ? data._availability_hours as { _start: string; _end: string }
            : { _start: '09:00', _end: '21:00' },
          _notification_preferences: typeof data._notification_preferences === 'object' && data._notification_preferences
            ? data._notification_preferences as { _crisis: boolean; _tough_day: boolean; _connection: boolean }
            : { _crisis: true, _tough_day: true, _connection: false }
        });
      }
    } catch (_error) {
      console._error('Failed to load helper settings:', _error);
    }
  };

  const saveTemplate = async () => {
    if (!newTemplate._name || !newTemplate._message) {
      toast._error('Please fill in all fields');
      return;
    }

    try {
      const { _error } = await supabase
        .from('message_templates')
        .insert({
          user_id: user!.id,
          _template_name: newTemplate._name,
          _template_category: newTemplate._category || 'general',
          _message_text: newTemplate._message
        });

      if (_error) throw _error;

      toast.success('Template saved successfully');
      setNewTemplate({ _name: '', _category: '', _message: '' });
      loadTemplates();
    } catch (_error: unknown) {
      toast._error('Failed to save template');
      console._error(_error);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { _error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id); // Only delete user's own templates

      if (_error) throw _error;

      toast.success('Template deleted');
      loadTemplates();
    } catch (_error: unknown) {
      toast._error('Failed to delete template');
      console._error(_error);
    }
  };

  const savePrivacySettings = async () => {
    try {
      const { _error } = await supabase
        .from('support_privacy_settings')
        .upsert({
          user_id: user!.id,
          ...privacySettings,
          _updated_at: new Date().toISOString()
        });

      if (_error) throw _error;
      toast.success('Privacy settings saved');
    } catch (_error: unknown) {
      toast._error('Failed to save privacy settings');
      console._error(_error);
    }
  };

  const saveHelperSettings = async () => {
    try {
      const { _error } = await supabase
        .from('helper_availability')
        .upsert({
          user_id: user!.id,
          ...helperSettings,
          _updated_at: new Date().toISOString()
        });

      if (_error) throw _error;
      toast.success('Helper settings saved');
    } catch (_error: unknown) {
      toast._error('Failed to save helper settings');
      console._error(_error);
    }
  };

  const pauseAlerts = (hours: number) => {
    const pauseUntil = new Date();
    pauseUntil.setHours(pauseUntil.getHours() + hours);
    
    setPrivacySettings(prev => ({
      ...prev,
      _pause_alerts_until: pauseUntil.toISOString()
    }));
  };

  const getCategoryColor = (_category: string) => {
    return templateCategories.find(c => c.value === _category)?.color || 'bg-gray-100 text-gray-800';
  };

  const isPaused = privacySettings._pause_alerts_until && new Date(privacySettings._pause_alerts_until) > new Date();

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
                    <Label htmlFor="template-_name">Template Name</Label>
                    <Input
                      id="template-_name"
                      placeholder="e.g., After therapy session"
                      value={newTemplate._name}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, _name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="template-_category">Category</Label>
                    <select
                      id="template-_category"
                      className="w-full p-2 border rounded-md"
                      value={newTemplate._category}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, _category: e.target.value }))}
                    >
                      <option value="">Select _category...</option>
                      {templateCategories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="template-_message">Message</Label>
                  <Textarea
                    id="template-_message"
                    placeholder="The _message that will be sent to your support network..."
                    value={newTemplate._message}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, _message: e.target.value }))}
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
                          <h4 className="font-medium">{template._template_name}</h4>
                          <Badge variant="outline" className={getCategoryColor(template._template_category)}>
                            {templateCategories.find(c => c.value === template._template_category)?.label || template._template_category}
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
                      <p className="text-sm text-muted-foreground">{template._message_text}</p>
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
                        Alerts paused until {new Date(privacySettings._pause_alerts_until!).toLocaleString()}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="ml-2"
                          onClick={() => setPrivacySettings(prev => ({ ...prev, _pause_alerts_until: null }))}
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
                      value={privacySettings._auto_delete_history_hours}
                      onChange={(e) => setPrivacySettings(prev => ({ 
                        ...prev, 
                        _auto_delete_history_hours: parseInt(e.target.value) || 24 
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
                    checked={privacySettings._incognito_mode}
                    onCheckedChange={(checked) => 
                      setPrivacySettings(prev => ({ ...prev, _incognito_mode: checked }))
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
                      value={privacySettings._escalation_delay_minutes}
                      onChange={(e) => setPrivacySettings(prev => ({ 
                        ...prev, 
                        _escalation_delay_minutes: parseInt(e.target.value) || 30 
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
                          <Label htmlFor="_start-time" className="text-sm">Start Time</Label>
                          <Input
                            id="_start-time"
                            type="time"
                            value={helperSettings._availability_hours._start}
                            onChange={(e) => setHelperSettings(prev => ({
                              ...prev,
                              _availability_hours: { ...prev._availability_hours, _start: e.target.value }
                            }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="_end-time" className="text-sm">End Time</Label>
                          <Input
                            id="_end-time"
                            type="time"
                            value={helperSettings._availability_hours._end}
                            onChange={(e) => setHelperSettings(prev => ({
                              ...prev,
                              _availability_hours: { ...prev._availability_hours, _end: e.target.value }
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
                          <span className="text-sm">Crisis Support (_urgent)</span>
                          <Switch
                            checked={helperSettings._notification_preferences._crisis}
                            onCheckedChange={(checked) => 
                              setHelperSettings(prev => ({
                                ...prev,
                                _notification_preferences: { ...prev._notification_preferences, _crisis: checked }
                              }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Tough Day Support</span>
                          <Switch
                            checked={helperSettings._notification_preferences._tough_day}
                            onCheckedChange={(checked) => 
                              setHelperSettings(prev => ({
                                ...prev,
                                _notification_preferences: { ...prev._notification_preferences, _tough_day: checked }
                              }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">General Connection</span>
                          <Switch
                            checked={helperSettings._notification_preferences._connection}
                            onCheckedChange={(checked) => 
                              setHelperSettings(prev => ({
                                ...prev,
                                _notification_preferences: { ...prev._notification_preferences, _connection: checked }
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
                      <li>• "Send without my _name" option</li>
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
