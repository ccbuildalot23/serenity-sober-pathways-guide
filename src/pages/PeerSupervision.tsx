import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Video, 
  MessageSquare, 
  Award, 
  BookOpen, 
  Shield, 
  Calendar,
  UserCheck,
  FileText,
  Clock,
  Star,
  Play,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PeerSupervision = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('forums');
  const [deidentified, setDeidentified] = useState(false);
  const [recordingConsent, setRecordingConsent] = useState(false);

  const consultationForums = [
    {
      id: 1,
      title: 'Substance Use Disorders',
      description: 'Complex SUD cases and treatment approaches',
      posts: 24,
      lastActivity: '2 hours ago',
      specialty: 'Addiction Medicine'
    },
    {
      id: 2,
      title: 'Co-occurring Disorders',
      description: 'Dual diagnosis treatment strategies',
      posts: 18,
      lastActivity: '4 hours ago',
      specialty: 'Dual Diagnosis'
    },
    {
      id: 3,
      title: 'Adolescent Treatment',
      description: 'Youth-specific intervention techniques',
      posts: 15,
      lastActivity: '1 day ago',
      specialty: 'Adolescent Care'
    }
  ];

  const expertAdvisors = [
    {
      id: 1,
      name: 'Dr. Sarah Martinez',
      specialty: 'Addiction Psychiatry',
      experience: '15 years',
      availability: 'Available',
      rating: 4.9,
      consultations: 127,
      languages: ['English', 'Spanish']
    },
    {
      id: 2,
      name: 'Dr. James Chen',
      specialty: 'Dual Diagnosis',
      experience: '12 years',
      availability: 'Busy until 3PM',
      rating: 4.8,
      consultations: 89,
      languages: ['English', 'Mandarin']
    },
    {
      id: 3,
      name: 'Dr. Maria Rodriguez',
      specialty: 'Adolescent Treatment',
      experience: '10 years',
      availability: 'Available',
      rating: 4.9,
      consultations: 156,
      languages: ['English', 'Spanish']
    }
  ];

  const recentSessions = [
    {
      id: 1,
      title: 'Complex PTSD + SUD Case Review',
      participants: ['Dr. Smith', 'Dr. Johnson'],
      duration: '45 min',
      date: '2024-01-15',
      cmeCredits: 1.0,
      status: 'recorded'
    },
    {
      id: 2,
      title: 'Adolescent Motivation Enhancement',
      participants: ['Dr. Martinez', 'Dr. Wilson'],
      duration: '30 min',
      date: '2024-01-14',
      cmeCredits: 0.5,
      status: 'recorded'
    }
  ];

  const cmeTracker = {
    currentCredits: 28.5,
    requiredCredits: 40,
    deadline: '2024-12-31',
    recentActivities: [
      { title: 'Peer Consultation Session', credits: 1.0, date: '2024-01-15' },
      { title: 'Expert Advisory Call', credits: 0.5, date: '2024-01-14' },
      { title: 'Case Discussion Forum', credits: 0.25, date: '2024-01-13' }
    ]
  };

  const evidenceBasedResources = [
    {
      id: 1,
      title: 'Cognitive Behavioral Therapy for SUD',
      type: 'Clinical Guide',
      updated: '2024-01-10',
      downloads: 234
    },
    {
      id: 2,
      title: 'Motivational Interviewing Techniques',
      type: 'Video Series',
      updated: '2024-01-08',
      downloads: 189
    },
    {
      id: 3,
      title: 'Trauma-Informed Care Protocols',
      type: 'Best Practices',
      updated: '2024-01-05',
      downloads: 156
    }
  ];

  const handleDeidentification = () => {
    setDeidentified(!deidentified);
    toast({
      title: deidentified ? "De-identification Disabled" : "De-identification Enabled",
      description: deidentified 
        ? "Patient information is now visible" 
        : "Patient information has been automatically de-identified",
    });
  };

  const requestConsultation = () => {
    toast({
      title: "Consultation Request Sent",
      description: "An expert advisor will respond within 2 hours",
    });
  };

  const startRecording = () => {
    if (!recordingConsent) {
      toast({
        title: "Recording Consent Required",
        description: "Please obtain consent from all participants first",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Recording Started",
      description: "Session is now being recorded for CME credit",
    });
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Peer Supervision Network</h1>
          <p className="text-muted-foreground mt-1">
            Secure collaboration and professional development platform
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Shield className="w-3 h-3 mr-1" />
          HIPAA Compliant
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="forums" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Case Forums
          </TabsTrigger>
          <TabsTrigger value="experts" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Expert Match
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            Video Sessions
          </TabsTrigger>
          <TabsTrigger value="cme" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            CME Tracking
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Resources
          </TabsTrigger>
        </TabsList>

        {/* Case Consultation Forums */}
        <TabsContent value="forums" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Secure Case Consultation Forums</h2>
            <Button onClick={handleDeidentification} variant="outline" size="sm">
              {deidentified ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {deidentified ? 'Show Details' : 'De-identify Cases'}
            </Button>
          </div>

          <div className="grid gap-4">
            {consultationForums.map((forum) => (
              <Card key={forum.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold">{forum.title}</h3>
                      <p className="text-sm text-muted-foreground">{forum.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{forum.posts} active discussions</span>
                        <span>•</span>
                        <span>Last activity {forum.lastActivity}</span>
                      </div>
                    </div>
                    <Badge variant="secondary">{forum.specialty}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Start New Case Consultation</CardTitle>
              <CardDescription>
                Share a de-identified case for peer review and expert guidance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Case Category</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sud">Substance Use Disorders</SelectItem>
                      <SelectItem value="cooccurring">Co-occurring Disorders</SelectItem>
                      <SelectItem value="adolescent">Adolescent Treatment</SelectItem>
                      <SelectItem value="trauma">Trauma-Informed Care</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Urgency Level</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select urgency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="urgent">Urgent (24hrs)</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Case Summary</label>
                <Textarea 
                  placeholder={deidentified 
                    ? "Patient A, 25-year-old presenting with..." 
                    : "Describe the case while maintaining patient confidentiality..."
                  }
                  className="mt-1"
                  rows={4}
                />
              </div>
              <Button onClick={requestConsultation}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Post Case for Consultation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expert Advisor Matching */}
        <TabsContent value="experts" className="space-y-4">
          <h2 className="text-xl font-semibold">Expert Advisor Matching</h2>
          
          <div className="grid gap-4">
            {expertAdvisors.map((expert) => (
              <Card key={expert.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{expert.name}</h3>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">{expert.rating}</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{expert.specialty} • {expert.experience}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{expert.consultations} consultations completed</span>
                        <span>Languages: {expert.languages.join(', ')}</span>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <Badge 
                        variant={expert.availability === 'Available' ? 'default' : 'secondary'}
                      >
                        {expert.availability}
                      </Badge>
                      <div className="space-x-2">
                        <Button variant="outline" size="sm">
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Message
                        </Button>
                        <Button size="sm" disabled={expert.availability !== 'Available'}>
                          <Video className="w-4 h-4 mr-1" />
                          Video Call
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Video Sessions */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Video Session Recording</h2>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="consent"
                checked={recordingConsent}
                onChange={(e) => setRecordingConsent(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="consent" className="text-sm">
                All participants consent to recording
              </label>
            </div>
          </div>

          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Video className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Start Supervision Session</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Begin a recorded video session for peer supervision and CME credit
                </p>
                <Button onClick={startRecording} disabled={!recordingConsent}>
                  <Play className="w-4 h-4 mr-2" />
                  Start Recording Session
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h3 className="font-medium">Recent Sessions</h3>
            {recentSessions.map((session) => (
              <Card key={session.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{session.title}</h4>
                      <div className="text-sm text-muted-foreground">
                        {session.participants.join(', ')} • {session.duration} • {session.date}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{session.cmeCredits} CME</Badge>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* CME Tracking */}
        <TabsContent value="cme" className="space-y-4">
          <h2 className="text-xl font-semibold">CME Credit Tracking</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{cmeTracker.currentCredits}</div>
                <div className="text-sm text-muted-foreground">Credits Earned</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{cmeTracker.requiredCredits}</div>
                <div className="text-sm text-muted-foreground">Credits Required</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {Math.round(((cmeTracker.requiredCredits - cmeTracker.currentCredits) / cmeTracker.requiredCredits) * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Remaining</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent CME Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cmeTracker.recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{activity.title}</div>
                      <div className="text-sm text-muted-foreground">{activity.date}</div>
                    </div>
                    <Badge variant="secondary">{activity.credits} Credits</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Integration Ready</CardTitle>
              <CardDescription>
                Connect with major CME providers for automatic credit tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Award className="w-4 h-4 mr-2" />
                  Connect to Medscape Education
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Award className="w-4 h-4 mr-2" />
                  Connect to CME.org
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Award className="w-4 h-4 mr-2" />
                  Connect to AMA STEPS Forward
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evidence-Based Resources */}
        <TabsContent value="resources" className="space-y-4">
          <h2 className="text-xl font-semibold">Evidence-Based Practice Library</h2>
          
          <div className="flex gap-4 mb-4">
            <Input placeholder="Search resources..." className="flex-1" />
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="clinical-guide">Clinical Guides</SelectItem>
                <SelectItem value="video">Video Series</SelectItem>
                <SelectItem value="best-practices">Best Practices</SelectItem>
                <SelectItem value="research">Research Papers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4">
            {evidenceBasedResources.map((resource) => (
              <Card key={resource.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold">{resource.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{resource.type}</Badge>
                        <span>Updated {resource.updated}</span>
                        <span>•</span>
                        <span>{resource.downloads} downloads</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PeerSupervision;