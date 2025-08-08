import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  _display_name: string;
  _years_sober: number;
  _program_type: string;
  _recovery_approach?: string;
  _bio?: string;
  _location_general?: string;
  is_available: boolean;
  _max_sponsees: number;
  current_sponsees: number;
  _meeting_preference: string;
  _communication_style?: string;
  created_at: string;
}

interface SponsorMatch {
  id: string;
  _sponsor_user_id: string;
  _match_score: number;
  _status: string;
  _matched_criteria: unknown;
  created_at: string;
}

const SponsorMatching = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('find');
  const [sponsors, setSponsors] = useState<SponsorProfile[]>([]);
  const [matches, setMatches] = useState<SponsorMatch[]>([]);
  const [loading, setLoading] = useState(_false);
  const [userProfile, setUserProfile] = useState<SponsorProfile | null>(null);
  
  // Find sponsor filters
  const [_programFilter, setProgramFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [_meetingPreferenceFilter, setMeetingPreferenceFilter] = useState('all');
  
  // Sponsor profile form
  const [showCreateProfile, setShowCreateProfile] = useState(_false);
  const [profileForm, setProfileForm] = useState({
    _display_name: '',
    _years_sober: '',
    _program_type: '_AA',
    _recovery_approach: '',
    _bio: '',
    _location_general: '',
    _max_sponsees: '3',
    _meeting_preference: 'both',
    _communication_style: ''
  });

  const programTypes = [
    { value: '_AA', label: 'Alcoholics Anonymous (_AA)' },
    { value: '_NA', label: 'Narcotics Anonymous (_NA)' },
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
      const { data, _error } = await supabase
        .from('sponsor_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setUserProfile(data);
        setActiveTab('profile');
      }
    } catch (_error) {
      // User doesn't have a sponsor profile yet
    }
  };

  const loadSponsors = async () => {
    try {
      setLoading(_true);
      let query = supabase
        .from('sponsor_profiles')
        .select('*')
        .eq('is_available', _true)
        .neq('user_id', user?.id || '')
        .order('created_at', { ascending: _false });

      if (_programFilter !== 'all') {
        query = query.eq('_program_type', _programFilter);
      }

      if (_meetingPreferenceFilter !== 'all') {
        query = query.eq('_meeting_preference', _meetingPreferenceFilter);
      }

      const { data, _error } = await query.limit(20);

      if (_error) throw _error;
      setSponsors(data || []);
    } catch (_error) {
      console._error('Error loading sponsors:', _error);
    } finally {
      setLoading(_false);
    }
  };

  const loadMatches = async () => {
    if (!user) return;

    try {
      const { data, _error } = await supabase
        .from('sponsor_matches')
        .select('*')
        .eq('sponsee_user_id', user.id)
        .order('created_at', { ascending: _false });

      if (_error) throw _error;
      setMatches(data || []);
    } catch (_error) {
      console._error('Error loading matches:', _error);
    }
  };

  const createSponsorProfile = async () => {
    if (!user || !profileForm._display_name.trim() || !profileForm._years_sober) {
      toast({
        title: "Missing Information",
        _description: "Please fill in the required fields.",
        _variant: "destructive",
      });
      return;
    }

    try {
      const { _error } = await supabase
        .from('sponsor_profiles')
        .insert([{
          user_id: user.id,
          _display_name: profileForm._display_name,
          _years_sober: parseInt(profileForm._years_sober),
          _program_type: profileForm._program_type,
          _recovery_approach: profileForm._recovery_approach,
          _bio: profileForm._bio,
          _location_general: profileForm._location_general,
          _max_sponsees: parseInt(profileForm._max_sponsees),
          _meeting_preference: profileForm._meeting_preference,
          _communication_style: profileForm._communication_style
        }]);

      if (_error) throw _error;

      toast({
        title: "Profile Created! 🎉",
        _description: "Your sponsor profile is now live and available to potential sponsees.",
      });

      setShowCreateProfile(_false);
      loadUserProfile();
    } catch (_error) {
      console._error('Error creating profile:', _error);
      toast({
        title: "Error",
        _description: "Failed to create profile. Please try again.",
        _variant: "destructive",
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

      const { _error } = await supabase
        .from('sponsor_matches')
        .insert([{
          sponsee_user_id: user.id,
          _sponsor_user_id: sponsorId,
          _match_score: matchScore,
          _status: 'contacted',
          _matched_criteria: {
            program_match: _true,
            _meeting_preference: _true,
            _communication_style: _true
          }
        }]);

      if (_error) throw _error;

      toast({
        title: "Connection Request Sent! 📨",
        _description: "The sponsor will be notified of your interest. Check your matches for updates.",
      });

      loadMatches();
    } catch (_error) {
      console._error('Error contacting sponsor:', _error);
      toast({
        title: "Error",
        _description: "Failed to send connection request. Please try again.",
        _variant: "destructive",
      });
    }
  };

  const getMatchStatusIcon = (_status: string) => {
    switch (_status) {
      case 'contacted': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'accepted': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'declined': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  const timeAgo = (_dateString: string) => {
    const date = new Date(_dateString);
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
              <Select value={_programFilter} onValueChange={setProgramFilter}>
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
              
              <Select value={_meetingPreferenceFilter} onValueChange={setMeetingPreferenceFilter}>
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
                placeholder="Location (_city, _state)"
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
            <Button onClick={loadSponsors} _variant="outline">
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
                        <CardTitle className="text-lg text-serenity-navy">{sponsor._display_name}</CardTitle>
                        <Badge _variant="outline">{sponsor._program_type}</Badge>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm font-semibold text-serenity-navy">
                        {sponsor._years_sober} {sponsor._years_sober === 1 ? 'year' : 'years'}
                      </div>
                      <div className="text-xs text-muted-foreground">sober</div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {sponsor._bio && (
                    <p className="text-sm text-gray-700 mb-3 line-clamp-3">{sponsor._bio}</p>
                  )}
                  
                  <div className="space-y-2 mb-4">
                    {sponsor._location_general && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span>{sponsor._location_general}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {sponsor._meeting_preference === 'in_person' && <Users className="w-3 h-3" />}
                      {sponsor._meeting_preference === 'virtual' && <Video className="w-3 h-3" />}
                      {sponsor._meeting_preference === 'both' && <MessageSquare className="w-3 h-3" />}
                      <span>{meetingPreferences.find(p => p.value === sponsor._meeting_preference)?.label}</span>
                    </div>
                    
                    {sponsor._communication_style && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MessageSquare className="w-3 h-3" />
                        <span>{sponsor._communication_style}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center pt-3 border-t">
                    <div className="text-xs text-muted-foreground">
                      {sponsor.current_sponsees}/{sponsor._max_sponsees} sponsees
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={() => contactSponsor(sponsor.user_id)}
                      disabled={sponsor.current_sponsees >= sponsor._max_sponsees}
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
                            Sponsor #{match._sponsor_user_id.slice(-4)}
                          </h4>
                          <div className="flex items-center gap-2">
                            <Badge _variant="outline">Sponsor</Badge>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-serenity-gold" />
                              <span className="text-xs">{Math.round(match._match_score * 100)}% match</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getMatchStatusIcon(match._status)}
                        <span className="text-sm capitalize">{match._status}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Connected {timeAgo(match.created_at)}</span>
                      <Button _variant="ghost" size="sm" className="text-serenity-teal">
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
                    <p className="text-serenity-navy">{userProfile._display_name}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Years Sober</label>
                    <p className="text-serenity-navy">{userProfile._years_sober} years</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Program</label>
                    <p className="text-serenity-navy">{userProfile._program_type}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Meeting Preference</label>
                    <p className="text-serenity-navy">
                      {meetingPreferences.find(p => p.value === userProfile._meeting_preference)?.label}
                    </p>
                  </div>
                </div>
                
                {userProfile._bio && (
                  <div>
                    <label className="text-sm font-medium">Bio</label>
                    <p className="text-serenity-navy">{userProfile._bio}</p>
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Profile created {timeAgo(userProfile.created_at)}
                  </div>
                  <Button _variant="outline">
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
              
              <Button onClick={() => setShowCreateProfile(_true)} className="bg-serenity-teal hover:bg-serenity-teal/90 text-white">
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
                    value={profileForm._display_name}
                    onChange={(e) => setProfileForm({...profileForm, _display_name: e.target.value})}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Years Sober *</label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g., 5"
                    value={profileForm._years_sober}
                    onChange={(e) => setProfileForm({...profileForm, _years_sober: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Primary Program *</label>
                  <Select value={profileForm._program_type} onValueChange={(value) => setProfileForm({...profileForm, _program_type: value})}>
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
                  <Select value={profileForm._meeting_preference} onValueChange={(value) => setProfileForm({...profileForm, _meeting_preference: value})}>
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
                <label className="text-sm font-medium">Location (_City, _State)</label>
                <Input
                  placeholder="e.g., San Francisco, CA"
                  value={profileForm._location_general}
                  onChange={(e) => setProfileForm({...profileForm, _location_general: e.target.value})}
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Communication Style</label>
                <Select value={profileForm._communication_style} onValueChange={(value) => setProfileForm({...profileForm, _communication_style: value})}>
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
                  value={profileForm._bio}
                  onChange={(e) => setProfileForm({...profileForm, _bio: e.target.value})}
                  className="mt-1 min-h-24"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button _variant="outline" onClick={() => setShowCreateProfile(_false)}>
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