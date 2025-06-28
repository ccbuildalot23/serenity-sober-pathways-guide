
import React from 'react';
import { MapPin, Globe, Phone, Mail, Calendar, DollarSign, Video, Users, Heart } from 'lucide-react';
import type { Clinician } from '@/types/clinician';

interface ProviderCardProps {
  clinician: Clinician;
  onSave?: (id: string) => void;
  isSaved?: boolean;
}

export const ProviderCard: React.FC<ProviderCardProps> = ({ clinician, onSave, isSaved = false }) => {
  const getTagIcon = (tag: string) => {
    switch (tag) {
      case 'telehealth': return <Video className="w-3 h-3" />;
      case 'in-person': return <Users className="w-3 h-3" />;
      case 'sliding-scale': return <DollarSign className="w-3 h-3" />;
      case 'trauma-informed': return <Heart className="w-3 h-3" />;
      default: return null;
    }
  };

  const getTagLabel = (tag: string) => {
    return tag.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden hover-lift">
      <div className="p-6">
        <div className="flex items-start gap-4">
          {clinician.photoUrl ? (
            <img 
              src={clinician.photoUrl} 
              alt={clinician.name}
              className="w-20 h-20 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-semibold text-blue-700 dark:text-blue-300">
                {clinician.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
          )}
          
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {clinician.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {clinician.title}
                </p>
                {clinician.credentials.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {clinician.credentials.join(', ')}
                  </p>
                )}
              </div>
              
              <button
                onClick={() => onSave?.(clinician.id)}
                className={`p-2 rounded-lg transition-colors ${
                  isSaved 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                aria-label={isSaved ? 'Remove from saved' : 'Save provider'}
              >
                <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            </div>

            <div className="mt-3 flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{clinician.location.city ? `${clinician.location.city}, ` : ''}{clinician.location.state}</span>
              </div>
              {clinician.yearsExperience && (
                <span className="text-xs">• {clinician.yearsExperience} years experience</span>
              )}
            </div>

            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
                {clinician.specialties.map((specialty, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            </div>

            {clinician.tags && clinician.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {clinician.tags.map((tag, index) => (
                  <span 
                    key={index}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-xs"
                  >
                    {getTagIcon(tag)}
                    {getTagLabel(tag)}
                  </span>
                ))}
              </div>
            )}

            {clinician.bio && (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {clinician.bio}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              {clinician.contact.bookingUrl && (
                <a
                  href={clinician.contact.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors text-sm font-medium"
                >
                  <Calendar className="w-4 h-4" />
                  Book Appointment
                </a>
              )}
              {clinician.contact.website && !clinician.contact.bookingUrl && (
                <a
                  href={clinician.contact.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors text-sm font-medium"
                >
                  <Globe className="w-4 h-4" />
                  Visit Website
                </a>
              )}
              {clinician.contact.email && (
                <a
                  href={`mailto:${clinician.contact.email}`}
                  className="inline-flex items-center gap-2 px-4 py-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  <Mail className="w-4 h-4" />
                  Email
                </a>
              )}
              {clinician.contact.phone && (
                <a
                  href={`tel:${clinician.contact.phone}`}
                  className="inline-flex items-center gap-2 px-4 py-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
              )}
            </div>

            {clinician.languages && clinician.languages.length > 1 && (
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                Languages: {clinician.languages.join(', ')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
