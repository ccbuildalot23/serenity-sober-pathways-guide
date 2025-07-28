import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Upload, 
  Mic, 
  Calendar, 
  MapPin, 
  Shield, 
  Clock,
  Sparkles,
  Camera,
  Users,
  Globe,
  Eye
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  milestone: boolean;
}

interface Milestone {
  id: string;
  title: string;
  date: string;
  description: string;
  category: string;
}

const StorySubmissionFlow = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [storyData, setStoryData] = useState({
    title: '',
    content: '',
    category: '',
    substance_type: '',
    recovery_length_days: '',
    age_group: '',
    anonymity_level: 'first_name',
    sharing_level: 'public',
    photo_url: '',
    audio_url: '',
    timeline_data: [] as TimelineEvent[],
    milestones: [] as Milestone[],
    expires_at: '',
    consent_for_featuring: false,
    tags: [] as string[]
  });

  const [newTimelineEvent, setNewTimelineEvent] = useState({
    date: '',
    title: '',
    description: '',
    milestone: false
  });

  const [newMilestone, setNewMilestone] = useState({
    title: '',
    date: '',
    description: '',
    category: ''
  });

  const [newTag, setNewTag] = useState('');

  const categories = [
    { value: 'milestone', label: '🏆 Milestone Achievement' },
    { value: 'breakthrough', label: '💡 Personal Breakthrough' },
    { value: 'daily_victory', label: '🌟 Daily Victory' },
    { value: 'relationship', label: '❤️ Relationship Healing' },
    { value: 'health', label: '💪 Health & Wellness' },
    { value: 'career', label: '🎯 Career & Goals' },
    { value: 'spiritual', label: '🕊️ Spiritual Growth' },
    { value: 'family', label: '👨‍👩‍👧‍👦 Family Reconnection' }
  ];

  const substances = [
    'Alcohol', 'Cocaine', 'Heroin', 'Prescription Drugs', 
    'Marijuana', 'Methamphetamine', 'Other', 'Multiple Substances'
  ];

  const ageGroups = [
    '18-25', '26-35', '36-45', '46-55', '56-65', '65+'
  ];

  const milestoneCategories = [
    'Sobriety', 'Health', 'Relationships', 'Career', 'Personal Growth', 'Spiritual'
  ];

  const addTimelineEvent = () => {
    if (newTimelineEvent.title && newTimelineEvent.date) {
      const event: TimelineEvent = {
        id: Date.now().toString(),
        ...newTimelineEvent
      };
      setStoryData(prev => ({
        ...prev,
        timeline_data: [...prev.timeline_data, event]
      }));
      setNewTimelineEvent({ date: '', title: '', description: '', milestone: false });
    }
  };

  const addMilestone = () => {
    if (newMilestone.title && newMilestone.date) {
      const milestone: Milestone = {
        id: Date.now().toString(),
        ...newMilestone
      };
      setStoryData(prev => ({
        ...prev,
        milestones: [...prev.milestones, milestone]
      }));
      setNewMilestone({ title: '', date: '', description: '', category: '' });
    }
  };

  const addTag = () => {
    if (newTag && !storyData.tags.includes(newTag)) {
      setStoryData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setStoryData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async () => {
    if (!user || !storyData.title || !storyData.content || !storyData.category) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('success_stories')
        .insert({
          user_id: user.id,
          title: storyData.title,
          content: storyData.content,
          story_category: storyData.category,
          is_anonymous: storyData.anonymity_level === 'anonymous',
          moderation_status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Story Submitted Successfully! ✨",
        description: "Your success story is being reviewed and will be published shortly.",
      });

      // Reset form
      setStoryData({
        title: '',
        content: '',
        category: '',
        substance_type: '',
        recovery_length_days: '',
        age_group: '',
        anonymity_level: 'first_name',
        sharing_level: 'public',
        photo_url: '',
        audio_url: '',
        timeline_data: [],
        milestones: [],
        expires_at: '',
        consent_for_featuring: false,
        tags: []
      });
      setCurrentStep(1);
    } catch (error) {
      console.error('Error submitting story:', error);
      toast({
        title: "Error",
        description: "Failed to submit story. Please try again.",
        variant: "destructive",
      });
    }
  };

  const StepIndicator = ({ step, title, completed }: { step: number; title: string; completed: boolean }) => (
    <div className={`flex items-center space-x-2 ${completed ? 'text-serenity-teal' : currentStep === step ? 'text-serenity-navy' : 'text-gray-400'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
        completed ? 'bg-serenity-teal text-white' : 
        currentStep === step ? 'bg-serenity-navy text-white' : 
        'bg-gray-200 text-gray-600'
      }`}>
        {step}
      </div>
      <span className="text-sm font-medium">{title}</span>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-serenity-navy">Share Your Success Story</h2>
            <span className="text-sm text-muted-foreground">Step {currentStep} of 5</span>
          </div>
          
          <div className="flex space-x-8 overflow-x-auto pb-2">
            <StepIndicator step={1} title="Basic Info" completed={currentStep > 1} />
            <StepIndicator step={2} title="Story Details" completed={currentStep > 2} />
            <StepIndicator step={3} title="Timeline" completed={currentStep > 3} />
            <StepIndicator step={4} title="Privacy" completed={currentStep > 4} />
            <StepIndicator step={5} title="Review" completed={false} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Sparkles className="w-12 h-12 text-serenity-gold mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-serenity-navy">Let's Start With The Basics</h3>
                <p className="text-muted-foreground">Tell us about your story's focus and category</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="title">Story Title *</Label>
                  <Input
                    id="title"
                    placeholder="Give your story a meaningful title"
                    value={storyData.title}
                    onChange={(e) => setStoryData(prev => ({ ...prev, title: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select value={storyData.category} onValueChange={(value) => setStoryData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="substance">Primary Substance (Optional)</Label>
                  <Select value={storyData.substance_type} onValueChange={(value) => setStoryData(prev => ({ ...prev, substance_type: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select substance" />
                    </SelectTrigger>
                    <SelectContent>
                      {substances.map((substance) => (
                        <SelectItem key={substance} value={substance}>{substance}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="recovery_days">Days in Recovery</Label>
                  <Input
                    id="recovery_days"
                    type="number"
                    placeholder="e.g., 365"
                    value={storyData.recovery_length_days}
                    onChange={(e) => setStoryData(prev => ({ ...prev, recovery_length_days: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="age_group">Age Group</Label>
                  <Select value={storyData.age_group} onValueChange={(value) => setStoryData(prev => ({ ...prev, age_group: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select age group" />
                    </SelectTrigger>
                    <SelectContent>
                      {ageGroups.map((age) => (
                        <SelectItem key={age} value={age}>{age}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="tags">Tags (Optional)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Add a tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  />
                  <Button onClick={addTag} variant="outline" size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {storyData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {storyData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Story Content */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Users className="w-12 h-12 text-serenity-teal mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-serenity-navy">Tell Your Story</h3>
                <p className="text-muted-foreground">Share your journey in your own words</p>
              </div>

              <div>
                <Label htmlFor="content">Your Story *</Label>
                <Textarea
                  id="content"
                  placeholder="Share your journey, what you've overcome, challenges faced, breakthroughs, and what you've learned. Be honest, inspiring, and authentic..."
                  value={storyData.content}
                  onChange={(e) => setStoryData(prev => ({ ...prev, content: e.target.value }))}
                  className="mt-1 min-h-64"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {storyData.content.length} characters
                </p>
              </div>

              <Tabs defaultValue="text" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="text">Text Only</TabsTrigger>
                  <TabsTrigger value="photo">Add Photo</TabsTrigger>
                  <TabsTrigger value="audio">Add Audio</TabsTrigger>
                </TabsList>

                <TabsContent value="photo" className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">Upload a photo to accompany your story</p>
                    <Button variant="outline">
                      <Upload className="w-4 h-4 mr-2" />
                      Choose Photo
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      We offer automatic face blurring for privacy
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="audio" className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Mic className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">Record an audio version of your story</p>
                    <Button variant="outline">
                      <Mic className="w-4 h-4 mr-2" />
                      Start Recording
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Audio stories can be more personal and impactful
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Step 3: Timeline & Milestones */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Calendar className="w-12 h-12 text-serenity-sage mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-serenity-navy">Your Recovery Timeline</h3>
                <p className="text-muted-foreground">Add key events and milestones (optional)</p>
              </div>

              <Tabs defaultValue="timeline" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="timeline">Timeline Events</TabsTrigger>
                  <TabsTrigger value="milestones">Milestones</TabsTrigger>
                </TabsList>

                <TabsContent value="timeline" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Add Timeline Event</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="timeline_date">Date</Label>
                          <Input
                            id="timeline_date"
                            type="date"
                            value={newTimelineEvent.date}
                            onChange={(e) => setNewTimelineEvent(prev => ({ ...prev, date: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="timeline_title">Event Title</Label>
                          <Input
                            id="timeline_title"
                            placeholder="e.g., Started therapy"
                            value={newTimelineEvent.title}
                            onChange={(e) => setNewTimelineEvent(prev => ({ ...prev, title: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="timeline_description">Description</Label>
                        <Textarea
                          id="timeline_description"
                          placeholder="Describe what happened and how it impacted your recovery"
                          value={newTimelineEvent.description}
                          onChange={(e) => setNewTimelineEvent(prev => ({ ...prev, description: e.target.value }))}
                          className="min-h-20"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="timeline_milestone"
                          checked={newTimelineEvent.milestone}
                          onCheckedChange={(checked) => setNewTimelineEvent(prev => ({ ...prev, milestone: checked }))}
                        />
                        <Label htmlFor="timeline_milestone">Mark as milestone</Label>
                      </div>
                      <Button onClick={addTimelineEvent} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Event
                      </Button>
                    </CardContent>
                  </Card>

                  {storyData.timeline_data.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Timeline Events ({storyData.timeline_data.length})</h4>
                      {storyData.timeline_data.map((event) => (
                        <div key={event.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-medium">{event.title}</h5>
                              <p className="text-sm text-muted-foreground">{event.date}</p>
                              {event.description && <p className="text-sm mt-1">{event.description}</p>}
                            </div>
                            {event.milestone && <Badge className="bg-serenity-gold text-white">Milestone</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="milestones" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Add Milestone</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="milestone_title">Milestone Title</Label>
                          <Input
                            id="milestone_title"
                            placeholder="e.g., 30 Days Sober"
                            value={newMilestone.title}
                            onChange={(e) => setNewMilestone(prev => ({ ...prev, title: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="milestone_date">Achievement Date</Label>
                          <Input
                            id="milestone_date"
                            type="date"
                            value={newMilestone.date}
                            onChange={(e) => setNewMilestone(prev => ({ ...prev, date: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="milestone_category">Category</Label>
                        <Select value={newMilestone.category} onValueChange={(value) => setNewMilestone(prev => ({ ...prev, category: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {milestoneCategories.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="milestone_description">Description</Label>
                        <Textarea
                          id="milestone_description"
                          placeholder="Describe this milestone and what it means to you"
                          value={newMilestone.description}
                          onChange={(e) => setNewMilestone(prev => ({ ...prev, description: e.target.value }))}
                          className="min-h-20"
                        />
                      </div>
                      <Button onClick={addMilestone} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Milestone
                      </Button>
                    </CardContent>
                  </Card>

                  {storyData.milestones.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Milestones ({storyData.milestones.length})</h4>
                      {storyData.milestones.map((milestone) => (
                        <div key={milestone.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-medium">{milestone.title}</h5>
                              <p className="text-sm text-muted-foreground">{milestone.date} • {milestone.category}</p>
                              {milestone.description && <p className="text-sm mt-1">{milestone.description}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Step 4: Privacy Controls */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Shield className="w-12 h-12 text-serenity-mint mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-serenity-navy">Privacy & Sharing Settings</h3>
                <p className="text-muted-foreground">Control how your story is shared and displayed</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Anonymity Level
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="full_name"
                          name="anonymity"
                          value="full_name"
                          checked={storyData.anonymity_level === 'full_name'}
                          onChange={(e) => setStoryData(prev => ({ ...prev, anonymity_level: e.target.value as any }))}
                        />
                        <Label htmlFor="full_name">Show my full name</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="first_name"
                          name="anonymity"
                          value="first_name"
                          checked={storyData.anonymity_level === 'first_name'}
                          onChange={(e) => setStoryData(prev => ({ ...prev, anonymity_level: e.target.value as any }))}
                        />
                        <Label htmlFor="first_name">Show only first name</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="anonymous"
                          name="anonymity"
                          value="anonymous"
                          checked={storyData.anonymity_level === 'anonymous'}
                          onChange={(e) => setStoryData(prev => ({ ...prev, anonymity_level: e.target.value as any }))}
                        />
                        <Label htmlFor="anonymous">Completely anonymous</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Sharing Level
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="public"
                          name="sharing"
                          value="public"
                          checked={storyData.sharing_level === 'public'}
                          onChange={(e) => setStoryData(prev => ({ ...prev, sharing_level: e.target.value as any }))}
                        />
                        <Label htmlFor="public">Public - Anyone can view</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="community"
                          name="sharing"
                          value="community"
                          checked={storyData.sharing_level === 'community'}
                          onChange={(e) => setStoryData(prev => ({ ...prev, sharing_level: e.target.value as any }))}
                        />
                        <Label htmlFor="community">Community - Registered users only</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="providers_only"
                          name="sharing"
                          value="providers_only"
                          checked={storyData.sharing_level === 'providers_only'}
                          onChange={(e) => setStoryData(prev => ({ ...prev, sharing_level: e.target.value as any }))}
                        />
                        <Label htmlFor="providers_only">Providers only</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Additional Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="expires_at">Auto-delete date (optional)</Label>
                    <Input
                      id="expires_at"
                      type="date"
                      value={storyData.expires_at}
                      onChange={(e) => setStoryData(prev => ({ ...prev, expires_at: e.target.value }))}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Your story will be automatically removed on this date
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="consent_featuring"
                      checked={storyData.consent_for_featuring}
                      onCheckedChange={(checked) => setStoryData(prev => ({ ...prev, consent_for_featuring: checked }))}
                    />
                    <Label htmlFor="consent_featuring">I consent to my story being featured</Label>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 5: Review & Submit */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Eye className="w-12 h-12 text-serenity-navy mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-serenity-navy">Review Your Story</h3>
                <p className="text-muted-foreground">Make sure everything looks good before submitting</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{storyData.title}</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{categories.find(c => c.value === storyData.category)?.label}</Badge>
                    {storyData.substance_type && <Badge variant="secondary">{storyData.substance_type}</Badge>}
                    {storyData.recovery_length_days && (
                      <Badge variant="secondary">{storyData.recovery_length_days} days sober</Badge>
                    )}
                    <Badge variant="outline" className="capitalize">{storyData.anonymity_level.replace('_', ' ')}</Badge>
                    <Badge variant="outline" className="capitalize">{storyData.sharing_level.replace('_', ' ')}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <p className="whitespace-pre-wrap">{storyData.content}</p>
                  </div>

                  {storyData.timeline_data.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-2">Timeline Events</h4>
                      <div className="space-y-2">
                        {storyData.timeline_data.map((event) => (
                          <div key={event.id} className="text-sm border-l-2 border-serenity-teal pl-3">
                            <p className="font-medium">{event.title}</p>
                            <p className="text-muted-foreground">{event.date}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {storyData.milestones.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-2">Milestones</h4>
                      <div className="space-y-2">
                        {storyData.milestones.map((milestone) => (
                          <div key={milestone.id} className="text-sm">
                            <p className="font-medium">{milestone.title}</p>
                            <p className="text-muted-foreground">{milestone.date} • {milestone.category}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {storyData.tags.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {storyData.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="bg-serenity-mint/10 p-4 rounded-lg">
                <h4 className="font-semibold text-serenity-navy mb-2">Before you submit:</h4>
                <ul className="text-sm text-serenity-sage space-y-1">
                  <li>• Your story will be reviewed for community guidelines compliance</li>
                  <li>• You can edit or delete your story anytime after publication</li>
                  <li>• Stories typically take 24-48 hours to be approved</li>
                  <li>• Your privacy settings will be respected at all times</li>
                </ul>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
            >
              Previous
            </Button>

            {currentStep < 5 ? (
              <Button
                onClick={() => setCurrentStep(Math.min(5, currentStep + 1))}
                disabled={currentStep === 1 && (!storyData.title || !storyData.content || !storyData.category)}
                className="bg-serenity-teal hover:bg-serenity-teal/90 text-white"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                className="bg-serenity-navy hover:bg-serenity-navy/90 text-white"
              >
                Submit Story
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StorySubmissionFlow;