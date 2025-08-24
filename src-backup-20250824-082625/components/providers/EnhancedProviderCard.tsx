import React, { useState } from 'react';
import { 
  MapPin, Globe, Phone, Mail, Calendar, DollarSign, Video, Users, Heart, 
  Star, Clock, Shield, Award, MessageSquare, ExternalLink 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Provider } from '@/types/provider';
import { ProviderService } from '@/services/providerService';
import { useToast } from '@/hooks/use-toast';

interface EnhancedProviderCardProps {
  provider: Provider;
  onSave?: (id: string) => void;
  isSaved?: boolean;
  onConnect?: (provider: Provider) => void;
  showActions?: boolean;
}

export const EnhancedProviderCard: React.FC<EnhancedProviderCardProps> = ({
  provider,
  onSave,
  isSaved = false,
  onConnect,
  showActions = true
}) => {
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState('');
  const [shareOptions, setShareOptions] = useState({
    share_daily_checkins: false,
    share_mood_data: false,
    share_goal_progress: false,
    share_crisis_events: false
  });
  const { toast } = useToast();

  const getTagIcon = (tag: string) => {
    switch (tag) {
      case 'telehealth': return <Video className="w-3 h-3" />;
      case 'in-person': return <Users className="w-3 h-3" />;
      case 'sliding-scale': return <DollarSign className="w-3 h-3" />;
      case 'trauma-informed': return <Heart className="w-3 h-3" />;
      case 'lgbtq-friendly': return <Heart className="w-3 h-3" />;
      default: return null;
    }
  };

  const formatTagLabel = (tag: string) => {
    return tag.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const handleConnectionRequest = async () => {
    try {
      await ProviderService.createConnectionRequest({
        patient_id: '', // Will be set by auth context
        provider_id: provider.id,
        request_message: connectionMessage,
        status: 'pending',
        ...shareOptions
      });

      toast({
        title: "Connection request sent",
        description: `Your request has been sent to ${provider.name}. They will review and respond soon.`
      });

      setShowConnectionDialog(false);
      setConnectionMessage('');
      setShareOptions({
        share_daily_checkins: false,
        share_mood_data: false,
        share_goal_progress: false,
        share_crisis_events: false
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send connection request. Please try again.",
        variant: "destructive"
      });
    }
  };

  const renderRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating) 
            ? 'fill-yellow-400 text-yellow-400' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={provider.photo_url} alt={provider.name} />
            <AvatarFallback>
              {provider.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  {provider.name}
                  {provider.is_verified && (
                    <Shield className="w-4 h-4 text-green-600" />
                  )}
                </h3>
                <p className="text-sm text-muted-foreground">{provider.title}</p>
                {provider.credentials.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {provider.credentials.join(', ')}
                  </p>
                )}
              </div>
              
              {showActions && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSave?.(provider.id)}
                  className={isSaved ? 'text-red-600' : 'text-gray-400'}
                >
                  <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                </Button>
              )}
            </div>

            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>
                  {provider.location_city ? `${provider.location_city}, ` : ''}
                  {provider.location_state}
                </span>
              </div>
              {provider.years_experience && (
                <div className="flex items-center gap-1">
                  <Award className="w-4 h-4" />
                  <span>{provider.years_experience} years</span>
                </div>
              )}
              {provider.average_rating > 0 && (
                <div className="flex items-center gap-1">
                  <div className="flex">{renderRatingStars(provider.average_rating)}</div>
                  <span>({provider.total_reviews})</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Specialties */}
        <div className="flex flex-wrap gap-2">
          {provider.specialties.map((specialty, index) => (
            <Badge key={index} variant="secondary">
              {specialty}
            </Badge>
          ))}
        </div>

        {/* Tags */}
        {provider.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {provider.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="flex items-center gap-1">
                {getTagIcon(tag)}
                {formatTagLabel(tag)}
              </Badge>
            ))}
          </div>
        )}

        {/* Bio */}
        {provider.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {provider.bio}
          </p>
        )}

        {/* Insurance */}
        {provider.insurance_accepted.length > 0 && (
          <div className="text-sm">
            <span className="font-medium">Insurance: </span>
            <span className="text-muted-foreground">
              {provider.insurance_accepted.join(', ')}
            </span>
          </div>
        )}

        {/* Languages */}
        {provider.languages.length > 1 && (
          <div className="text-sm">
            <span className="font-medium">Languages: </span>
            <span className="text-muted-foreground">
              {provider.languages.join(', ')}
            </span>
          </div>
        )}

        {/* Availability Status */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            provider.accepting_new_patients ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className="text-sm text-muted-foreground">
            {provider.accepting_new_patients ? 'Accepting new patients' : 'Not accepting new patients'}
          </span>
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="flex flex-wrap gap-3 pt-2">
            {provider.booking_url && (
              <Button asChild size="sm">
                <a
                  href={provider.booking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Book Appointment
                  <ExternalLink className="w-3 h-3" />
                </a>
              </Button>
            )}

            <Dialog open={showConnectionDialog} onOpenChange={setShowConnectionDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Connect
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Connect with {provider.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Message (optional)</label>
                    <Textarea
                      placeholder="Introduce yourself and explain why you'd like to connect..."
                      value={connectionMessage}
                      onChange={(e) => setConnectionMessage(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium">Data Sharing Preferences</label>
                    <div className="space-y-2">
                      {[
                        { key: 'share_daily_checkins', label: 'Daily check-ins and mood data' },
                        { key: 'share_mood_data', label: 'Detailed mood and wellness tracking' },
                        { key: 'share_goal_progress', label: 'Recovery goals and progress' },
                        { key: 'share_crisis_events', label: 'Crisis events and interventions' }
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={key}
                            checked={shareOptions[key as keyof typeof shareOptions]}
                            onCheckedChange={(checked) => 
                              setShareOptions(prev => ({ ...prev, [key]: !!checked }))
                            }
                          />
                          <label htmlFor={key} className="text-sm">{label}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleConnectionRequest} className="flex-1">
                      Send Request
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowConnectionDialog(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {provider.website_url && !provider.booking_url && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={provider.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Globe className="w-4 h-4" />
                  Website
                  <ExternalLink className="w-3 h-3" />
                </a>
              </Button>
            )}

            {provider.email && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`mailto:${provider.email}`}
                  className="flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Email
                </a>
              </Button>
            )}

            {provider.phone_number && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`tel:${provider.phone_number}`}
                  className="flex items-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};