import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Plus, 
  Heart, 
  MapPin, 
  Calendar,
  MessageSquare,
  Video,
  User,
  Shield,
  Star,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SponsorProfile {
  id: string;
  user_id: string;
  display_name: string;
  years_sober: number;
  program_type: string;
  recovery_approach?: string;
  bio?: string;
  location_general?: string;
  is_available: boolean;
  max_sponsees: number;
  current_sponsees: number;
  meeting_preference: string;
  communication_style?: string;
  created_at: string;
}

interface SponsorMatch {
  id: string;
  sponsor_user_id: string;
  match_score: number;
  status: string;
  matched_criteria: any;
  created_at: string;
}

const SponsorMatching = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('find');
  const [sponsors, setSponsors] = useState<SponsorProfile[]>([]);
  const [matches, setMatches] = useState<SponsorMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<SponsorProfile | null>(null);
  
  // Find sponsor filters
  const [programFilter, setProgramFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [meetingPreferenceFilter, setMeetingPreferenceFilter] = useState('all');
  
  // Sponsor profile form
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    display_name: '',
    years_sober: '',
    program_type: 'AA',
    recovery_approach: '',
    bio: '',
    location_general: '',
    max_sponsees: '3',
    meeting_preference: 'both',
    communication_style: ''
  });

  const programTypes = [
    { value: 'AA', label: 'Alcoholics Anonymous (AA)' },
    { value: 'NA', label: 'Narcotics Anonymous (NA)' },
    { value: 'SMART', label: 'SMART Recovery' },
    { value: 'LifeRing', label: 'LifeRing Secular Recovery' },
    { value: 'WFS', label: 'Women for Sobriety' },
    { value: 'SOS', label: 'Secular Organizations for Sobriety' },
    { value: 'Other', label: 'Other Program' }
  ];

  const meetingPreferences = [
    { value: 'in_person', label: 'In-Person Only' },
    { value: 'virtual', label: 'Virtual Only' },
    { value: 'both', label: 'Both In-Person & Virtual' }
  ];

  const communicationStyles = [
    'Direct and Structured',
    'Gentle and Supportive',
    'Spiritual Focus',
    'Science-Based Approach',
    'Story Sharing',
    'Solution Focused'
  ];

  useEffect(() => {
    if (user) {
      loadUserProfile();
      loadSponsors();
      loadMatches();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('sponsor_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setUserProfile(data);
        setActiveTab('profile');
      }
    } catch (error) {
      // User doesn't have a sponsor profile yet
    }
  };

  const loadSponsors = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('sponsor_profiles')
        .select('*')
        .eq('is_available', true)
        .neq('user_id', user?.id || '')
        .order('created_at', { ascending: false });

      if (programFilter !== 'all') {
        query = query.eq('program_type', programFilter);
      }

      if (meetingPreferenceFilter !== 'all') {
        query = query.eq('meeting_preference', meetingPreferenceFilter);
      }

      const { data, error } = await query.limit(20);

      if (error) throw error;
      setSponsors(data || []);
    } catch (error) {
      console.error('Error loading sponsors:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMatches = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('sponsor_matches')
        .select('*')
        .eq('sponsee_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error('Error loading matches:', error);
    }
  };

  const createSponsorProfile = async () => {
    if (!user || !profileForm.display_name.trim() || !profileForm.years_sober) {
      toast({
        title: "Missing Information",
        description: "Please fill in the required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('sponsor_profiles')
        .insert([{
          user_id: user.id,
          display_name: profileForm.display_name,
          years_sober: parseInt(profileForm.years_sober),
          program_type: profileForm.program_type,
          recovery_approach: profileForm.recovery_approach,
          bio: profileForm.bio,
          location_general: profileForm.location_general,
          max_sponsees: parseInt(profileForm.max_sponsees),
          meeting_preference: profileForm.meeting_preference,
          communication_style: profileForm.communication_style
        }]);

      if (error) throw error;

      toast({
        title: "Profile Created! 🎉",
        description: "Your sponsor profile is now live and available to potential sponsees.",
      });

      setShowCreateProfile(false);
      loadUserProfile();
    } catch (error) {
      console.error('Error creating profile:', error);
      toast({
        title: "Error",
        description: "Failed to create profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const contactSponsor = async (sponsorId: string) => {
    if (!user) return;

    try {
      // Calculate match score (simplified algorithm)
      const sponsor = sponsors.find(s => s.user_id === sponsorId);
      if (!sponsor) return;

      const matchScore = Math.random() * 0.4 + 0.6; // 60-100% match for demo

      const { error } = await supabase
        .from('sponsor_matches')
        .insert([{
          sponsee_user_id: user.id,
          sponsor_user_id: sponsorId,
          match_score: matchScore,
          status: 'contacted',
          matched_criteria: {
            program_match: true,
            meeting_preference: true,
            communication_style: true
          }
        }]);

      if (error) throw error;

      toast({
        title: "Connection Request Sent! 📨",
        description: "The sponsor will be notified of your interest. Check your matches for updates.",
      });

      loadMatches();
    } catch (error) {
      console.error('Error contacting sponsor:', error);
      toast({
        title: "Error",
        description: "Failed to send connection request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getMatchStatusIcon = (status: string) => {
    switch (status) {
      case 'contacted': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'accepted': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'declined': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="find">Find Sponsors</TabsTrigger>
        <TabsTrigger value="matches">My Matches</TabsTrigger>
        <TabsTrigger value="profile">Sponsor Profile</TabsTrigger>
      </TabsList>

      <TabsContent value="find" className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={programFilter} onValueChange={setProgramFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {programTypes.map((program) => (
                    <SelectItem key={program.value} value={program.value}>
                      {program.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={meetingPreferenceFilter} onValueChange={setMeetingPreferenceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Meeting Preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Preferences</SelectItem>
                  {meetingPreferences.map((pref) => (
                    <SelectItem key={pref.value} value={pref.value}>
                      {pref.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Input
                placeholder="Location (city, state)"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              />
            </div>
            
            <Button onClick={loadSponsors} className="mt-4 bg-serenity-teal hover:bg-serenity-teal/90 text-white">
              Search Sponsors
            </Button>
          </CardContent>
        </Card>

        {/* Sponsors Grid */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-serenity-teal mx-auto"></div>
            <p className="text-muted-foreground mt-2">Finding sponsors...</p>
          </div>
        ) : sponsors.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No sponsors found matching your criteria.</p>
            <Button onClick={loadSponsors} variant="outline">
              Try Different Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sponsors.map((sponsor) => (
              <Card key={sponsor.id} className="transition-all hover:shadow-lg">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-serenity-teal/20 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-serenity-teal" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-serenity-navy">{sponsor.display_name}</CardTitle>
                        <Badge variant="outline">{sponsor.program_type}</Badge>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm font-semibold text-serenity-navy">
                        {sponsor.years_sober} {sponsor.years_sober === 1 ? 'year' : 'years'}
                      </div>
                      <div className="text-xs text-muted-foreground">sober</div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {sponsor.bio && (
                    <p className="text-sm text-gray-700 mb-3 line-clamp-3">{sponsor.bio}</p>
                  )}
                  
                  <div className="space-y-2 mb-4">
                    {sponsor.location_general && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span>{sponsor.location_general}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {sponsor.meeting_preference === 'in_person' && <Users className="w-3 h-3" />}
                      {sponsor.meeting_preference === 'virtual' && <Video className="w-3 h-3" />}
                      {sponsor.meeting_preference === 'both' && <MessageSquare className="w-3 h-3" />}
                      <span>{meetingPreferences.find(p => p.value === sponsor.meeting_preference)?.label}</span>
                    </div>
                    
                    {sponsor.communication_style && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MessageSquare className="w-3 h-3" />
                        <span>{sponsor.communication_style}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center pt-3 border-t">
                    <div className="text-xs text-muted-foreground">
                      {sponsor.current_sponsees}/{sponsor.max_sponsees} sponsees
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={() => contactSponsor(sponsor.user_id)}
                      disabled={sponsor.current_sponsees >= sponsor.max_sponsees}
                      className="bg-serenity-teal hover:bg-serenity-teal/90 text-white"
                    >
                      <Heart className="w-3 h-3 mr-1" />
                      Connect
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="matches" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-serenity-navy">
              <Users className="w-5 h-5" />
              My Sponsor Connections
            </CardTitle>
            <p className="text-muted-foreground">
              Track your connections with potential sponsors and see match compatibility.
            </p>
          </CardHeader>
          
          <CardContent>
            {matches.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No sponsor connections yet.</p>
                <Button onClick={() => setActiveTab('find')} className="bg-serenity-teal hover:bg-serenity-teal/90 text-white">
                  Find Sponsors
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {matches.map((match) => (
                  <div key={match.id} className="p-4 border border-serenity-sage/20 rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-serenity-teal/20 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-serenity-teal" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-serenity-navy">
                            Sponsor #{match.sponsor_user_id.slice(-4)}
                          </h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Sponsor</Badge>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-serenity-gold" />
                              <span className="text-xs">{Math.round(match.match_score * 100)}% match</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getMatchStatusIcon(match.status)}
                        <span className="text-sm capitalize">{match.status}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Connected {timeAgo(match.created_at)}</span>
                      <Button variant="ghost" size="sm" className="text-serenity-teal">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="profile" className="space-y-6">
        {userProfile ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-serenity-navy">
                <Shield className="w-5 h-5" />
                Your Sponsor Profile
              </CardTitle>
              <p className="text-muted-foreground">
                Your profile helps match you with sponsees who need your guidance.
              </p>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Display Name</label>
                    <p className="text-serenity-navy">{userProfile.display_name}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Years Sober</label>
                    <p className="text-serenity-navy">{userProfile.years_sober} years</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Program</label>
                    <p className="text-serenity-navy">{userProfile.program_type}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Meeting Preference</label>
                    <p className="text-serenity-navy">
                      {meetingPreferences.find(p => p.value === userProfile.meeting_preference)?.label}
                    </p>
                  </div>
                </div>
                
                {userProfile.bio && (
                  <div>
                    <label className="text-sm font-medium">Bio</label>
                    <p className="text-serenity-navy">{userProfile.bio}</p>
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Profile created {timeAgo(userProfile.created_at)}
                  </div>
                  <Button variant="outline">
                    Edit Profile
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-serenity-navy">
                <Plus className="w-5 h-5" />
                Become a Sponsor
              </CardTitle>
              <p className="text-muted-foreground">
                Share your experience and help others on their recovery journey by creating a sponsor profile.
              </p>
            </CardHeader>
            
            <CardContent>
              <div className="bg-serenity-mint/10 p-4 rounded-lg mb-6">
                <h4 className="font-semibold text-serenity-navy mb-2">Sponsor Requirements</h4>
                <ul className="text-sm text-serenity-sage space-y-1">
                  <li>• Minimum 1 year of continuous recovery</li>
                  <li>• Active participation in a recovery program</li>
                  <li>• Commitment to supporting others safely</li>
                  <li>• Understanding of boundaries and ethics</li>
                </ul>
              </div>
              
              <Button onClick={() => setShowCreateProfile(true)} className="bg-serenity-teal hover:bg-serenity-teal/90 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Sponsor Profile
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create Sponsor Profile Dialog */}
        <Dialog open={showCreateProfile} onOpenChange={setShowCreateProfile}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Your Sponsor Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Display Name *</label>
                  <Input
                    placeholder="How you'd like to be known"
                    value={profileForm.display_name}
                    onChange={(e) => setProfileForm({...profileForm, display_name: e.target.value})}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Years Sober *</label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g., 5"
                    value={profileForm.years_sober}
                    onChange={(e) => setProfileForm({...profileForm, years_sober: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Primary Program *</label>
                  <Select value={profileForm.program_type} onValueChange={(value) => setProfileForm({...profileForm, program_type: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {programTypes.map((program) => (
                        <SelectItem key={program.value} value={program.value}>
                          {program.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Meeting Preference</label>
                  <Select value={profileForm.meeting_preference} onValueChange={(value) => setProfileForm({...profileForm, meeting_preference: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {meetingPreferences.map((pref) => (
                        <SelectItem key={pref.value} value={pref.value}>
                          {pref.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Location (City, State)</label>
                <Input
                  placeholder="e.g., San Francisco, CA"
                  value={profileForm.location_general}
                  onChange={(e) => setProfileForm({...profileForm, location_general: e.target.value})}
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Communication Style</label>
                <Select value={profileForm.communication_style} onValueChange={(value) => setProfileForm({...profileForm, communication_style: value})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select your approach" />
                  </SelectTrigger>
                  <SelectContent>
                    {communicationStyles.map((style) => (
                      <SelectItem key={style} value={style}>
                        {style}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Bio</label>
                <Textarea
                  placeholder="Share your recovery journey, approach to sponsorship, and what you can offer..."
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                  className="mt-1 min-h-24"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateProfile(false)}>
                  Cancel
                </Button>
                <Button onClick={createSponsorProfile} className="bg-serenity-teal hover:bg-serenity-teal/90 text-white">
                  Create Profile
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </TabsContent>
    </Tabs>
  );
};

export default SponsorMatching;