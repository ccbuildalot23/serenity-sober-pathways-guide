import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Clock, 
  Users, 
  Heart, 
  Video,
  Phone,
  Calendar,
  Filter,
  Compass,
  Star,
  User,
  Wheelchair,
  Coffee,
  Shield,
  Search,
  Navigation,
  AlertCircle,
  CheckCircle,
  Plus,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import meetingFinderService, { Meeting } from '@/services/meetingFinderService';
import { EnhancedInputValidator } from '@/lib/enhancedInputValidation';
import { EnhancedSecurityAuditService } from '@/services/EnhancedSecurityAuditService';

interface MeetingWithDetails extends Meeting {
  description?: string;
  accessibility?: string[];
  contact_info?: string;
  group_size?: 'small' | 'medium' | 'large';
  newcomer_friendly?: boolean;
  social_anxiety_rating?: number;
  format?: string;
  distance?: number;
}

interface FilterOptions {
  type: string[];
  time: string[];
  format: string[];
  accessibility: string[];
  socialAnxietyLevel: number;
  maxDistance: number;
  newcomerFriendly: boolean;
}

const MeetingFinder = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<MeetingWithDetails[]>([]);
  const [filteredMeetings, setFilteredMeetings] = useState<MeetingWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLocation, setSearchLocation] = useState('');
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingWithDetails | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [savedMeetings, setSavedMeetings] = useState<string[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<Record<string, Date[]>>({});
  
  const [filters, setFilters] = useState<FilterOptions>({
    type: [],
    time: [],
    format: [],
    accessibility: [],
    socialAnxietyLevel: 5,
    maxDistance: 10,
    newcomerFriendly: false
  });

  const mapRef = useRef<HTMLDivElement>(null);

  // Enhanced meeting data with social anxiety considerations
  const enhancedMeetings: MeetingWithDetails[] = [
    {
      id: '1',
      name: 'Newcomers Welcome AA',
      type: 'AA',
      day: 'Mon',
      time: '7:00 PM',
      location: '123 Main St, Springfield',
      description: 'A welcoming group specifically for people new to recovery. Very supportive environment.',
      accessibility: ['wheelchair', 'hearing_loop'],
      group_size: 'small',
      newcomer_friendly: true,
      social_anxiety_rating: 2, // 1-5 scale, lower = more comfortable
      format: 'discussion',
      distance: 0.8
    },
    {
      id: '2',
      name: 'Lunchtime Recovery NA',
      type: 'NA',
      day: 'Wed',
      time: '12:00 PM',
      location: '456 Oak Ave, Springfield',
      description: 'Quick 45-minute meeting perfect for lunch break. Casual atmosphere.',
      accessibility: ['wheelchair'],
      group_size: 'medium',
      newcomer_friendly: true,
      social_anxiety_rating: 3,
      format: 'speaker',
      distance: 1.2
    },
    {
      id: '3',
      name: 'Online Support Meeting',
      type: 'SMART',
      day: 'Fri',
      time: '6:00 PM',
      location: 'Virtual',
      virtual: true,
      link: 'https://zoom.us/meeting',
      description: 'Video meeting with camera optional. Great for social anxiety.',
      group_size: 'small',
      newcomer_friendly: true,
      social_anxiety_rating: 1, // Virtual = lowest anxiety
      format: 'discussion',
      distance: 0
    },
    {
      id: '4',
      name: 'Women\'s Circle AA',
      type: 'AA',
      day: 'Thu',
      time: '6:30 PM',
      location: '789 Pine St, Springfield',
      description: 'Women-only meeting with childcare available. Safe space to share.',
      accessibility: ['childcare', 'wheelchair'],
      group_size: 'small',
      newcomer_friendly: true,
      social_anxiety_rating: 2,
      format: 'sharing_circle',
      distance: 2.1
    },
    {
      id: '5',
      name: 'Young Adults in Recovery',
      type: 'AA',
      day: 'Sat',
      time: '2:00 PM',
      location: '321 Elm St, Springfield',
      description: 'Ages 18-35. Casual meetup with coffee and donuts. Very relaxed.',
      accessibility: ['coffee', 'informal_seating'],
      group_size: 'medium',
      newcomer_friendly: true,
      social_anxiety_rating: 3,
      format: 'social',
      distance: 1.5
    },
    {
      id: '6',
      name: 'Silent Meditation AA',
      type: 'AA',
      day: 'Sun',
      time: '9:00 AM',
      location: '654 Maple Ave, Springfield',
      description: 'Begins with 20 minutes of silent meditation. Minimal speaking required.',
      accessibility: ['quiet_space'],
      group_size: 'small',
      newcomer_friendly: false,
      social_anxiety_rating: 1, // Minimal speaking
      format: 'meditation',
      distance: 2.8
    }
  ];

  useEffect(() => {
    loadMeetings();
    loadUserPreferences();
    getCurrentLocation();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [meetings, filters]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        async (error) => {
          // Log location access denial (not a security issue, but worth tracking)
          await EnhancedSecurityAuditService.logSecurityEvent({
            action: 'LOCATION_ACCESS_DENIED',
            details: { error_code: error.code },
            severity: 'low'
          });
        }
      );
    }
  };

  const loadMeetings = async () => {
    setLoading(true);
    try {
      // In a real app, this would fetch from an API with user's location
      setMeetings(enhancedMeetings);
    } catch (error) {
      // Log meeting data access error
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: 'MEETING_DATA_ACCESS_ERROR',
        details: { error_type: 'load_error' },
        severity: 'medium'
      });
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const loadUserPreferences = async () => {
    if (!user) return;
    
    try {
      // Load saved meetings
      const { data: saved } = await supabase
        .from('saved_meetings')
        .select('meeting_id')
        .eq('user_id', user.id);
      
      if (saved) {
        setSavedMeetings(saved.map(s => s.meeting_id));
      }

      // Load attendance history
      const { data: attendance } = await supabase
        .from('meeting_attendance')
        .select('meeting_id, attended_at')
        .eq('user_id', user.id);
      
      if (attendance) {
        const history: Record<string, Date[]> = {};
        attendance.forEach(a => {
          if (!history[a.meeting_id]) history[a.meeting_id] = [];
          history[a.meeting_id].push(new Date(a.attended_at));
        });
        setAttendanceHistory(history);
      }
    } catch (error) {
      // Log user preference access error
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: 'USER_PREFERENCES_ACCESS_ERROR',
        details: { error_type: 'database_error' },
        severity: 'medium'
      });
    }
  };

  const applyFilters = () => {
    let filtered = [...meetings];

    // Type filter
    if (filters.type.length > 0) {
      filtered = filtered.filter(m => filters.type.includes(m.type));
    }

    // Social anxiety filter
    filtered = filtered.filter(m => 
      (m.social_anxiety_rating || 5) <= filters.socialAnxietyLevel
    );

    // Distance filter
    if (currentLocation) {
      filtered = filtered.filter(m => 
        m.virtual || (m.distance || 0) <= filters.maxDistance
      );
    }

    // Newcomer friendly filter
    if (filters.newcomerFriendly) {
      filtered = filtered.filter(m => m.newcomer_friendly);
    }

    // Format filter
    if (filters.format.length > 0) {
      filtered = filtered.filter(m => 
        m.format && filters.format.includes(m.format)
      );
    }

    // Sort by social anxiety rating and distance
    filtered.sort((a, b) => {
      const anxietyDiff = (a.social_anxiety_rating || 5) - (b.social_anxiety_rating || 5);
      if (anxietyDiff !== 0) return anxietyDiff;
      return (a.distance || 0) - (b.distance || 0);
    });

    setFilteredMeetings(filtered);
  };

  const toggleSavedMeeting = async (meetingId: string) => {
    if (!user) return;
    
    const isSaved = savedMeetings.includes(meetingId);
    
    try {
      if (isSaved) {
        await supabase
          .from('saved_meetings')
          .delete()
          .eq('user_id', user.id)
          .eq('meeting_id', meetingId);
        
        setSavedMeetings(prev => prev.filter(id => id !== meetingId));
        toast.success('Meeting removed from saved list');
      } else {
        const { data, error } = await supabase
          .from('saved_meetings')
          .insert({
            user_id: user.id,
            meeting_id: EnhancedInputValidator.sanitizeText(meetingId)
          })
          .select('id')
          .single();
        
        if (!error) {
          // Log meeting save action
          await EnhancedSecurityAuditService.logSecurityEvent({
            action: 'MEETING_SAVED',
            details: { meeting_id: meetingId },
            severity: 'low'
          });
        }
        
        setSavedMeetings(prev => [...prev, meetingId]);
        toast.success('Meeting saved to your list');
      }
    } catch (error) {
      // Log meeting save error
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: 'MEETING_SAVE_ERROR',
        details: { meeting_id: meetingId, error_type: 'database_error' },
        severity: 'medium'
      });
      toast.error('Failed to update saved meetings');
    }
  };

  const markAttendance = async (meetingId: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('meeting_attendance')
        .insert({
          user_id: user.id,
          meeting_id: EnhancedInputValidator.sanitizeText(meetingId),
          attended_at: new Date().toISOString()
        })
        .select('id')
        .single();
      
      if (!error) {
        // Log meeting attendance
        await EnhancedSecurityAuditService.logSecurityEvent({
          action: 'MEETING_ATTENDANCE_RECORDED',
          details: { 
            attendance_id: data?.id,
            meeting_id: meetingId
          },
          severity: 'low'
        });
      }
      
      // Update local state
      setAttendanceHistory(prev => ({
        ...prev,
        [meetingId]: [...(prev[meetingId] || []), new Date()]
      }));
      
      toast.success('Attendance recorded! Great job!', {
        description: 'Keep building your recovery routine'
      });
    } catch (error) {
      // Log attendance recording error
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: 'MEETING_ATTENDANCE_ERROR',
        details: { meeting_id: meetingId, error_type: 'database_error' },
        severity: 'medium'
      });
      toast.error('Failed to record attendance');
    }
  };

  const getAnxietyBadge = (rating: number) => {
    const colors = {
      1: 'bg-green-100 text-green-800',
      2: 'bg-blue-100 text-blue-800',
      3: 'bg-yellow-100 text-yellow-800',
      4: 'bg-orange-100 text-orange-800',
      5: 'bg-red-100 text-red-800'
    };
    
    const labels = {
      1: 'Very Comfortable',
      2: 'Anxiety-Friendly',
      3: 'Moderate',
      4: 'More Social',
      5: 'High Social'
    };
    
    return (
      <Badge className={colors[rating as keyof typeof colors] || colors[5]}>
        <Heart className="w-3 h-3 mr-1" />
        {labels[rating as keyof typeof labels] || 'Unknown'}
      </Badge>
    );
  };

  const getDirections = async (meeting: MeetingWithDetails) => {
    if (meeting.virtual) return;
    
    // Validate and sanitize the location before creating URL
    const sanitizedLocation = EnhancedInputValidator.sanitizeText(meeting.location);
    if (!sanitizedLocation || sanitizedLocation.length < 3) {
      toast.error('Invalid meeting location');
      return;
    }
    
    // Log directions request
    await EnhancedSecurityAuditService.logSecurityEvent({
      action: 'MEETING_DIRECTIONS_REQUESTED',
      details: { meeting_id: meeting.id },
      severity: 'low'
    });
    
    const query = encodeURIComponent(sanitizedLocation);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-purple-200">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-purple-800 flex items-center gap-2">
            <Compass className="w-6 h-6" />
            Meeting Finder
          </CardTitle>
          <p className="text-purple-600">
            Find recovery meetings that feel right for you, including anxiety-friendly options
          </p>
        </CardHeader>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Enter location or use current location"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="border-purple-300 text-purple-700"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters {Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : v !== (typeof v === 'number' ? (v > 5 ? 10 : 5) : false)) && '(Active)'}
            </Button>
            {currentLocation && (
              <Button
                variant="outline"
                onClick={getCurrentLocation}
              >
                <Navigation className="w-4 h-4 mr-2" />
                Use Location
              </Button>
            )}
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Social Anxiety Comfort */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Social Anxiety Comfort Level
                  </label>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={filters.socialAnxietyLevel}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        socialAnxietyLevel: parseInt(e.target.value) 
                      }))}
                      className="w-full"
                    />
                    <div className="text-center">
                      {getAnxietyBadge(filters.socialAnxietyLevel)}
                    </div>
                  </div>
                </div>

                {/* Meeting Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meeting Type
                  </label>
                  <div className="space-y-1">
                    {['AA', 'NA', 'SMART', 'Refuge Recovery'].map(type => (
                      <label key={type} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.type.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters(prev => ({ ...prev, type: [...prev.type, type] }));
                            } else {
                              setFilters(prev => ({ ...prev, type: prev.type.filter(t => t !== type) }));
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Format Preference
                  </label>
                  <div className="space-y-1">
                    {['discussion', 'speaker', 'meditation', 'social', 'sharing_circle'].map(format => (
                      <label key={format} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.format.includes(format)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters(prev => ({ ...prev, format: [...prev.format, format] }));
                            } else {
                              setFilters(prev => ({ ...prev, format: prev.format.filter(f => f !== format) }));
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm capitalize">{format.replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Additional Options */}
              <div className="flex items-center justify-between pt-2 border-t">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.newcomerFriendly}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      newcomerFriendly: e.target.checked 
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Newcomer Friendly Only</span>
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({
                    type: [],
                    time: [],
                    format: [],
                    accessibility: [],
                    socialAnxietyLevel: 5,
                    maxDistance: 10,
                    newcomerFriendly: false
                  })}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meeting List */}
      <Tabs defaultValue="list">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Meeting List</TabsTrigger>
          <TabsTrigger value="saved">Saved Meetings ({savedMeetings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading meetings...</p>
              </CardContent>
            </Card>
          ) : filteredMeetings.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No meetings found with your current filters</p>
                <Button 
                  variant="outline"
                  onClick={() => setShowFilters(true)}
                >
                  Adjust Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredMeetings.map(meeting => (
              <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{meeting.name}</h3>
                        {meeting.virtual && (
                          <Badge className="bg-blue-100 text-blue-800">
                            <Video className="w-3 h-3 mr-1" />
                            Virtual
                          </Badge>
                        )}
                        {meeting.newcomer_friendly && (
                          <Badge className="bg-green-100 text-green-800">
                            <User className="w-3 h-3 mr-1" />
                            New Member Friendly
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {meeting.day} at {meeting.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {meeting.location}
                        </span>
                        {meeting.distance !== undefined && (
                          <span className="flex items-center gap-1">
                            <Navigation className="w-4 h-4" />
                            {meeting.distance.toFixed(1)} mi
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline">{meeting.type}</Badge>
                        {meeting.social_anxiety_rating && getAnxietyBadge(meeting.social_anxiety_rating)}
                        {meeting.group_size && (
                          <Badge variant="outline">
                            <Users className="w-3 h-3 mr-1" />
                            {meeting.group_size} group
                          </Badge>
                        )}
                      </div>

                      {meeting.description && (
                        <p className="text-sm text-gray-600 mb-3">{meeting.description}</p>
                      )}

                      {meeting.accessibility && meeting.accessibility.length > 0 && (
                        <div className="flex items-center gap-2 mb-3">
                          <Wheelchair className="w-4 h-4 text-gray-500" />
                          <div className="flex gap-1">
                            {meeting.accessibility.map(feature => (
                              <Badge key={feature} variant="outline" className="text-xs">
                                {feature.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-start gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSavedMeeting(meeting.id)}
                        className={savedMeetings.includes(meeting.id) ? 'text-yellow-600' : 'text-gray-600'}
                      >
                        <Star className={`w-4 h-4 ${savedMeetings.includes(meeting.id) ? 'fill-current' : ''}`} />
                      </Button>
                      
                      {attendanceHistory[meeting.id] && (
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {attendanceHistory[meeting.id].length} visits
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="flex gap-2 pt-3 border-t">
                    {meeting.virtual ? (
                      <Button
                        onClick={() => window.open(meeting.link, '_blank')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Join Meeting
                      </Button>
                    ) : (
                      <Button
                        onClick={() => getDirections(meeting)}
                        variant="outline"
                      >
                        <Navigation className="w-4 h-4 mr-2" />
                        Get Directions
                      </Button>
                    )}
                    
                    <Button
                      onClick={() => markAttendance(meeting.id)}
                      variant="outline"
                      className="border-green-300 text-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Attendance
                    </Button>
                    
                    {meeting.contact_info && (
                      <Button variant="outline" size="sm">
                        <Phone className="w-4 h-4 mr-2" />
                        Contact
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="saved">
          {savedMeetings.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No saved meetings yet</p>
                <p className="text-sm text-gray-500">Click the star icon on meetings to save them here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {meetings.filter(m => savedMeetings.includes(m.id)).map(meeting => (
                <Card key={meeting.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">{meeting.name}</h3>
                        <p className="text-sm text-gray-600">{meeting.day} at {meeting.time}</p>
                        <p className="text-sm text-gray-500">{meeting.location}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Calendar className="w-4 h-4 mr-2" />
                          Add to Calendar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => toggleSavedMeeting(meeting.id)}
                          className="text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MeetingFinder;