import React, { useState } from 'react';
import { X, Star, MapPin, Award, Shield, Users, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import type { Provider } from '@/types/provider';

interface ProviderComparisonToolProps {
  providers: Provider[];
  onRemoveProvider: (providerId: string) => void;
  onClearAll: () => void;
}

export const ProviderComparisonTool: React.FC<ProviderComparisonToolProps> = ({
  providers,
  onRemoveProvider,
  onClearAll
}) => {
  if (providers.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Compare Providers</h3>
          <p className="text-muted-foreground">
            Add providers to your comparison to see them side by side
          </p>
        </CardContent>
      </Card>
    );
  }

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Compare Providers ({providers.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onClearAll}>
            Clear All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-w-fit">
            {providers.map((provider) => (
              <div key={provider.id} className="space-y-4 border rounded-lg p-4 relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveProvider(provider.id)}
                  className="absolute top-2 right-2 h-6 w-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>

                {/* Provider Header */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={provider.photo_url} alt={provider.name} />
                      <AvatarFallback>
                        {provider.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold flex items-center gap-2">
                        {provider.name}
                        {provider.is_verified && (
                          <Shield className="w-4 h-4 text-green-600" />
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground">{provider.title}</p>
                    </div>
                  </div>

                  {/* Rating */}
                  {provider.average_rating > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex">{renderRatingStars(provider.average_rating)}</div>
                      <span className="text-sm text-muted-foreground">
                        {provider.average_rating.toFixed(1)} ({provider.total_reviews} reviews)
                      </span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Key Details */}
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Location</h4>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {provider.location_city ? `${provider.location_city}, ` : ''}
                      {provider.location_state}
                    </div>
                  </div>

                  {provider.years_experience && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Experience</h4>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Award className="w-4 h-4" />
                        {provider.years_experience} years
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium text-sm mb-2">Specialties</h4>
                    <div className="flex flex-wrap gap-1">
                      {provider.specialties.slice(0, 3).map((specialty, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {specialty}
                        </Badge>
                      ))}
                      {provider.specialties.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{provider.specialties.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-2">Credentials</h4>
                    <p className="text-sm text-muted-foreground">
                      {provider.credentials.join(', ')}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-2">Services</h4>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        {provider.is_remote ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-red-600" />
                        )}
                        Telehealth
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {provider.sliding_scale_available ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-red-600" />
                        )}
                        Sliding Scale
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {provider.accepting_new_patients ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-red-600" />
                        )}
                        Accepting New Patients
                      </div>
                    </div>
                  </div>

                  {provider.insurance_accepted.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Insurance</h4>
                      <p className="text-sm text-muted-foreground">
                        {provider.insurance_accepted.slice(0, 2).join(', ')}
                        {provider.insurance_accepted.length > 2 && (
                          <span> +{provider.insurance_accepted.length - 2} more</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Action Buttons */}
                <div className="space-y-2">
                  {provider.booking_url && (
                    <Button asChild size="sm" className="w-full">
                      <a
                        href={provider.booking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Book Appointment
                      </a>
                    </Button>
                  )}
                  {provider.website_url && (
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a
                        href={provider.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Visit Website
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};