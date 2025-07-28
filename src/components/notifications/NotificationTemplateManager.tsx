import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  type NotificationTemplate,
  type NotificationChannel,
  type NotificationType
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
  name: string;
  type: string;
  channel: string;
  subject_template: string;
  body_template: string;
  variables: string[];
  is_active: boolean;
  language_code: string;
}

export function NotificationTemplateManager() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    type: 'check_in',
    channel: 'in_app',
    subject_template: '',
    body_template: '',
    variables: [],
    is_active: true,
    language_code: 'en'
  });
  const [previewMode, setPreviewMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await comprehensiveNotificationService.getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification templates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'check_in',
      channel: 'in_app',
      subject_template: '',
      body_template: '',
      variables: [],
      is_active: true,
      language_code: 'en'
    });
    setEditingTemplate(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (template: NotificationTemplate) => {
    setFormData({
      name: template.name,
      type: template.type,
      channel: template.channel,
      subject_template: template.subject_template || '',
      body_template: template.body_template,
      variables: Array.isArray(template.variables) ? template.variables as string[] : [],
      is_active: template.is_active,
      language_code: template.language_code
    });
    setEditingTemplate(template);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setPreviewMode(false);
    resetForm();
  };

  const saveTemplate = async () => {
    try {
      if (editingTemplate) {
        // Update existing template would require additional API endpoint
        toast({
          title: 'Info',
          description: 'Template updates are not implemented yet',
          variant: 'default'
        });
      } else {
        // Create new template
        await comprehensiveNotificationService.createTemplate(formData);
        toast({
          title: 'Success',
          description: 'Template created successfully',
          variant: 'default'
        });
        await loadTemplates();
        closeDialog();
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive'
      });
    }
  };

  const duplicateTemplate = (template: NotificationTemplate) => {
    setFormData({
      name: `${template.name} (Copy)`,
      type: template.type,
      channel: template.channel,
      subject_template: template.subject_template || '',
      body_template: template.body_template,
      variables: Array.isArray(template.variables) ? template.variables as string[] : [],
      is_active: template.is_active,
      language_code: template.language_code
    });
    setEditingTemplate(null);
    setIsDialogOpen(true);
  };

  const toggleVariable = (variable: string) => {
    const newVariables = formData.variables.includes(variable)
      ? formData.variables.filter(v => v !== variable)
      : [...formData.variables, variable];
    
    setFormData({ ...formData, variables: newVariables });
  };

  const renderPreview = () => {
    const sampleData = {
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

    let previewSubject = formData.subject_template;
    let previewBody = formData.body_template;

    // Replace variables with sample data
    Object.entries(sampleData).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      previewSubject = previewSubject.replace(new RegExp(placeholder, 'g'), value);
      previewBody = previewBody.replace(new RegExp(placeholder, 'g'), value);
    });

    return (
      <div className="space-y-4">
        {formData.channel === 'email' && formData.subject_template && (
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

  const getChannelIcon = (channel: string) => {
    const channelData = channels.find(c => c.value === channel);
    return channelData?.icon || <Bell className="w-4 h-4" />;
  };

  const getChannelLabel = (channel: string) => {
    const channelData = channels.find(c => c.value === channel);
    return channelData?.label || channel;
  };

  const getTypeLabel = (type: string) => {
    const typeData = notificationTypes.find(t => t.value === type);
    return typeData?.label || type;
  };

  if (loading) {
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
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>{getTypeLabel(template.type)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getChannelIcon(template.channel)}
                      {getChannelLabel(template.channel)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.is_active ? "default" : "secondary"}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>{template.language_code.toUpperCase()}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(template.variables) && (template.variables as string[]).map((variable) => (
                        <Badge key={variable} variant="outline" className="text-xs">
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(template)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
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
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
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
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Daily Check-in Reminder"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {notificationTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
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
                      value={formData.channel}
                      onValueChange={(value) => setFormData({ ...formData, channel: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {channels.map((channel) => (
                          <SelectItem key={channel.value} value={channel.value}>
                            <div className="flex items-center gap-2">
                              {channel.icon}
                              {channel.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select
                      value={formData.language_code}
                      onValueChange={(value) => setFormData({ ...formData, language_code: value })}
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
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>
                </div>

                {(formData.channel === 'email') && (
                  <div className="space-y-2">
                    <Label>Subject Template</Label>
                    <Input
                      value={formData.subject_template}
                      onChange={(e) => setFormData({ ...formData, subject_template: e.target.value })}
                      placeholder="e.g., Daily Check-in Reminder - {{user_name}}"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Body Template</Label>
                  <Textarea
                    value={formData.body_template}
                    onChange={(e) => setFormData({ ...formData, body_template: e.target.value })}
                    placeholder="Hi {{user_name}}, this is your daily check-in reminder..."
                    rows={6}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Available Variables</Label>
                  <p className="text-sm text-muted-foreground">
                    Select variables to include in your template. Use them in your content with {{variable_name}}
                  </p>
                    <div className="flex flex-wrap gap-2">
                      {availableVariables.map((variable) => (
                        <Badge
                          key={variable}
                          variant={formData.variables.includes(variable) ? "default" : "outline"}
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
                variant="outline"
                onClick={() => setPreviewMode(!previewMode)}
              >
                <Eye className="w-4 h-4 mr-2" />
                {previewMode ? 'Edit' : 'Preview'}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={closeDialog}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={saveTemplate}>
                  <Save className="w-4 h-4 mr-2" />
                  {editingTemplate ? 'Update' : 'Create'} Template
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}