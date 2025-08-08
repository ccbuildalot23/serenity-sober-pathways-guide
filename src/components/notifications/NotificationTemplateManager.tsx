import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Copy,
  Eye,
  Mail,
  MessageSquare,
  Smartphone,
  Bell,
  Save,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  comprehensiveNotificationService, 
  _type NotificationTemplate,
  _type NotificationChannel,
  _type NotificationType
} from '@/services/comprehensiveNotificationService';

const notificationTypes: { value: NotificationType; label: string }[] = [
  { value: 'check_in', label: 'Check-in Reminders' },
  { value: 'goal_deadline', label: 'Goal Deadlines' },
  { value: 'appointment', label: 'Appointments' },
  { value: 'crisis', label: 'Crisis Alerts' },
  { value: 'community', label: 'Community Updates' },
  { value: 'provider', label: 'Provider Messages' },
  { value: 'system', label: 'System Notifications' }
];

const channels: { value: NotificationChannel; label: string; icon: React.ReactNode }[] = [
  { value: 'in_app', label: 'In-App', icon: <Bell className="w-4 h-4" /> },
  { value: 'email', label: 'Email', icon: <Mail className="w-4 h-4" /> },
  { value: 'sms', label: 'SMS', icon: <MessageSquare className="w-4 h-4" /> },
  { value: 'push', label: 'Push', icon: <Smartphone className="w-4 h-4" /> }
];

const availableVariables = [
  'user_name',
  'user_email',
  'appointment_date',
  'appointment_time',
  'provider_name',
  'goal_title',
  'deadline_date',
  'mood_rating',
  'check_in_date',
  'crisis_level',
  'support_contact'
];

interface TemplateFormData {
  _name: string;
  _type: string;
  _channel: string;
  _subject_template: string;
  _body_template: string;
  variables: string[];
  _is_active: boolean;
  _language_code: string;
}

export function NotificationTemplateManager() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [_loading, setLoading] = useState(_true);
  const [_editingTemplate, setEditingTemplate] = useState<NotificationTemplate | _null>(_null);
  const [isDialogOpen, setIsDialogOpen] = useState(_false);
  const [_formData, setFormData] = useState<TemplateFormData>({
    _name: '',
    _type: 'check_in',
    _channel: 'in_app',
    _subject_template: '',
    _body_template: '',
    variables: [],
    _is_active: _true,
    _language_code: 'en'
  });
  const [previewMode, setPreviewMode] = useState(_false);
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(_true);
      const _data = await comprehensiveNotificationService.getTemplates();
      setTemplates(_data);
    } catch (_error) {
      console._error('Failed to load templates:', _error);
      toast({
        title: 'Error',
        _description: 'Failed to load notification templates',
        _variant: 'destructive'
      });
    } finally {
      setLoading(_false);
    }
  };

  const resetForm = () => {
    setFormData({
      _name: '',
      _type: 'check_in',
      _channel: 'in_app',
      _subject_template: '',
      _body_template: '',
      variables: [],
      _is_active: _true,
      _language_code: 'en'
    });
    setEditingTemplate(_null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(_true);
  };

  const openEditDialog = (template: NotificationTemplate) => {
    setFormData({
      _name: template._name,
      _type: template._type,
      _channel: template._channel,
      _subject_template: template._subject_template || '',
      _body_template: template._body_template,
      variables: Array.isArray(template.variables) ? template.variables as string[] : [],
      _is_active: template._is_active,
      _language_code: template._language_code
    });
    setEditingTemplate(template);
    setIsDialogOpen(_true);
  };

  const closeDialog = () => {
    setIsDialogOpen(_false);
    setPreviewMode(_false);
    resetForm();
  };

  const saveTemplate = async () => {
    try {
      if (_editingTemplate) {
        // Update existing template would require additional API endpoint
        toast({
          title: 'Info',
          _description: 'Template updates are not implemented yet',
          _variant: 'default'
        });
      } else {
        // Create new template
        await comprehensiveNotificationService.createTemplate(_formData);
        toast({
          title: 'Success',
          _description: 'Template created successfully',
          _variant: 'default'
        });
        await loadTemplates();
        closeDialog();
      }
    } catch (_error) {
      console._error('Failed to save template:', _error);
      toast({
        title: 'Error',
        _description: 'Failed to save template',
        _variant: 'destructive'
      });
    }
  };

  const duplicateTemplate = (template: NotificationTemplate) => {
    setFormData({
      _name: `${template._name} (Copy)`,
      _type: template._type,
      _channel: template._channel,
      _subject_template: template._subject_template || '',
      _body_template: template._body_template,
      variables: Array.isArray(template.variables) ? template.variables as string[] : [],
      _is_active: template._is_active,
      _language_code: template._language_code
    });
    setEditingTemplate(_null);
    setIsDialogOpen(_true);
  };

  const toggleVariable = (variable: string) => {
    const newVariables = _formData.variables.includes(variable)
      ? _formData.variables.filter(v => v !== variable)
      : [..._formData.variables, variable];
    
    setFormData({ ..._formData, variables: newVariables });
  };

  const renderPreview = () => {
    const _sampleData = {
      user_name: 'John Doe',
      user_email: 'john.doe@example.com',
      appointment_date: '2024-02-15',
      appointment_time: '2:00 PM',
      provider_name: 'Dr. Smith',
      goal_title: 'Daily Meditation',
      deadline_date: '2024-02-20',
      mood_rating: '7',
      check_in_date: '2024-02-14',
      crisis_level: 'Medium',
      support_contact: 'Crisis Helpline'
    };

    let previewSubject = _formData._subject_template;
    let previewBody = _formData._body_template;

    // Replace variables with sample _data
    Object.entries(_sampleData).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      previewSubject = previewSubject.replace(new RegExp(placeholder, 'g'), value);
      previewBody = previewBody.replace(new RegExp(placeholder, 'g'), value);
    });

    return (
      <div className="space-y-4">
        {_formData._channel === 'email' && _formData._subject_template && (
          <div>
            <Label className="text-sm font-medium">Subject Preview</Label>
            <div className="p-3 bg-muted rounded-md mt-1">
              {previewSubject || 'No subject'}
            </div>
          </div>
        )}
        <div>
          <Label className="text-sm font-medium">Body Preview</Label>
          <div className="p-3 bg-muted rounded-md mt-1 whitespace-pre-wrap">
            {previewBody || 'No content'}
          </div>
        </div>
      </div>
    );
  };

  const getChannelIcon = (_channel: string) => {
    const channelData = channels.find(c => c.value === _channel);
    return channelData?.icon || <Bell className="w-4 h-4" />;
  };

  const getChannelLabel = (_channel: string) => {
    const channelData = channels.find(c => c.value === _channel);
    return channelData?.label || _channel;
  };

  const getTypeLabel = (_type: string) => {
    const typeData = notificationTypes.find(t => t.value === _type);
    return typeData?.label || _type;
  };

  if (_loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Notification Templates</CardTitle>
              <CardDescription>
                Manage reusable templates for different types of notifications
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Variables</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template._name}</TableCell>
                  <TableCell>{getTypeLabel(template._type)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getChannelIcon(template._channel)}
                      {getChannelLabel(template._channel)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge _variant={template._is_active ? "default" : "secondary"}>
                      {template._is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>{template._language_code.toUpperCase()}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(template.variables) && (template.variables as string[]).map((variable) => (
                        <Badge key={variable} _variant="outline" className="text-xs">
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        _variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(template)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        _variant="ghost"
                        size="sm"
                        onClick={() => duplicateTemplate(template)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {_editingTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
            <DialogDescription>
              Create reusable notification templates with dynamic variables
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {!previewMode ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Template Name</Label>
                    <Input
                      value={_formData._name}
                      onChange={(e) => setFormData({ ..._formData, _name: e.target.value })}
                      placeholder="e.g., Daily Check-in Reminder"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={_formData._type}
                      onValueChange={(value) => setFormData({ ..._formData, _type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {notificationTypes.map((_type) => (
                          <SelectItem key={_type.value} value={_type.value}>
                            {_type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Channel</Label>
                    <Select
                      value={_formData._channel}
                      onValueChange={(value) => setFormData({ ..._formData, _channel: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {channels.map((_channel) => (
                          <SelectItem key={_channel.value} value={_channel.value}>
                            <div className="flex items-center gap-2">
                              {_channel.icon}
                              {_channel.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select
                      value={_formData._language_code}
                      onValueChange={(value) => setFormData({ ..._formData, _language_code: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Active</Label>
                    <Switch
                      checked={_formData._is_active}
                      onCheckedChange={(checked) => setFormData({ ..._formData, _is_active: checked })}
                    />
                  </div>
                </div>

                {(_formData._channel === 'email') && (
                  <div className="space-y-2">
                    <Label>Subject Template</Label>
                    <Input
                      value={_formData._subject_template}
                      onChange={(e) => setFormData({ ..._formData, _subject_template: e.target.value })}
                      placeholder="e.g., Daily Check-in Reminder - {{user_name}}"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Body Template</Label>
                  <Textarea
                    value={_formData._body_template}
                    onChange={(e) => setFormData({ ..._formData, _body_template: e.target.value })}
                    placeholder="Hi {{user_name}}, this is your daily check-in reminder..."
                    rows={6}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Available Variables</Label>
                  <p className="text-sm text-muted-foreground">
                    Select variables to include in your template. Use them in your content with {`{{variable_name}}`}
                  </p>
                    <div className="flex flex-wrap gap-2">
                      {availableVariables.map((variable) => (
                        <Badge
                          key={variable}
                          _variant={_formData.variables.includes(variable) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleVariable(variable)}
                        >
                          {variable}
                        </Badge>
                      ))}
                    </div>
                </div>
              </>
            ) : (
              renderPreview()
            )}
          </div>

          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <Button
                _variant="outline"
                onClick={() => setPreviewMode(!previewMode)}
              >
                <Eye className="w-4 h-4 mr-2" />
                {previewMode ? 'Edit' : 'Preview'}
              </Button>
              <div className="flex gap-2">
                <Button _variant="outline" onClick={closeDialog}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={saveTemplate}>
                  <Save className="w-4 h-4 mr-2" />
                  {_editingTemplate ? 'Update' : 'Create'} Template
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}