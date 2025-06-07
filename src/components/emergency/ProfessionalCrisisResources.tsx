
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  MessageSquare, 
  Clock, 
  MapPin, 
  Globe,
  Heart,
  AlertTriangle,
  ExternalLink,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

interface CrisisResource {
  id: string;
  name: string;
  type: 'hotline' | 'text' | 'chat' | 'local' | 'telehealth';
  phone?: string;
  textNumber?: string;
  website?: string;
  description: string;
  availability: string;
  specialties: string[];
  isPrimary?: boolean;
}

const ProfessionalCrisisResources: React.FC = () => {
  const [zipCode, setZipCode] = useState('');
  const [localResources, setLocalResources] = useState<CrisisResource[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const nationalResources: CrisisResource[] = [
    {
      id: '988',
      name: '988 Suicide & Crisis Lifeline',
      type: 'hotline',
      phone: '988',
      website: 'https://988lifeline.org',
      description: 'Free and confidential emotional support to people in suicidal crisis or emotional distress',
      availability: '24/7/365',
      specialties: ['Suicide Prevention', 'Crisis Support', 'Mental Health'],
      isPrimary: true
    },
    {
      id: 'crisis-text',
      name: 'Crisis Text Line',
      type: 'text',
      textNumber: '741741',
      website: 'https://crisistextline.org',
      description: 'Text HOME to 741741 for free, 24/7 crisis support',
      availability: '24/7/365',
      specialties: ['Crisis Support', 'Mental Health', 'Substance Abuse']
    },
    {
      id: 'samhsa',
      name: 'SAMHSA National Helpline',
      type: 'hotline',
      phone: '1-800-662-4357',
      website: 'https://samhsa.gov',
      description: 'Treatment referral and information service for mental health and substance use disorders',
      availability: '24/7/365',
      specialties: ['Substance Abuse', 'Mental Health', 'Treatment Referrals']
    },
    {
      id: 'betterhelp',
      name: 'BetterHelp Crisis Support',
      type: 'telehealth',
      website: 'https://betterhelp.com/crisis',
      description: 'Online therapy platform with crisis counselors available',
      availability: 'Business Hours + Emergency',
      specialties: ['Online Therapy', 'Crisis Counseling', 'Mental Health']
    },
    {
      id: 'talkspace',
      name: 'Talkspace Crisis Support',
      type: 'telehealth',
      website: 'https://talkspace.com',
      description: 'Online therapy with crisis intervention capabilities',
      availability: 'Business Hours',
      specialties: ['Online Therapy', 'Mental Health', 'Substance Abuse']
    }
  ];

  const handleCall = (resource: CrisisResource) => {
    if (resource.phone) {
      window.open(`tel:${resource.phone}`, '_self');
      toast.info(`Calling ${resource.name}...`);
    }
  };

  const handleText = (resource: CrisisResource) => {
    if (resource.textNumber) {
      let message = 'HOME';
      if (resource.id === 'crisis-text') {
        message = 'HOME';
      }
      window.open(`sms:${resource.textNumber}&body=${message}`, '_self');
      toast.info(`Texting ${resource.name}...`);
    }
  };

  const handleWebsite = (resource: CrisisResource) => {
    if (resource.website) {
      window.open(resource.website, '_blank');
      toast.info(`Opening ${resource.name} website...`);
    }
  };

  const searchLocalResources = async () => {
    if (!zipCode.trim()) {
      toast.error('Please enter a ZIP code');
      return;
    }

    setIsSearching(true);
    
    // Simulate API call for local resources
    setTimeout(() => {
      const mockLocalResources: CrisisResource[] = [
        {
          id: 'local-1',
          name: `${zipCode} Community Mental Health Center`,
          type: 'local',
          phone: '555-0123',
          description: 'Local community mental health services and crisis intervention',
          availability: 'Mon-Fri 8AM-8PM, Emergency 24/7',
          specialties: ['Mental Health', 'Substance Abuse', 'Crisis Support']
        },
        {
          id: 'local-2',
          name: `${zipCode} Hospital Behavioral Health`,
          type: 'local',
          phone: '555-0124',
          description: 'Emergency psychiatric services and crisis stabilization',
          availability: '24/7 Emergency',
          specialties: ['Emergency Psychiatry', 'Crisis Stabilization', 'Inpatient Care']
        }
      ];
      
      setLocalResources(mockLocalResources);
      setIsSearching(false);
      toast.success(`Found local resources for ${zipCode}`);
    }, 1500);
  };

  const getResourceIcon = (type: CrisisResource['type']) => {
    switch (type) {
      case 'hotline':
        return <Phone className="w-5 h-5" />;
      case 'text':
        return <MessageSquare className="w-5 h-5" />;
      case 'chat':
        return <MessageSquare className="w-5 h-5" />;
      case 'local':
        return <MapPin className="w-5 h-5" />;
      case 'telehealth':
        return <Globe className="w-5 h-5" />;
      default:
        return <Heart className="w-5 h-5" />;
    }
  };

  const getResourceColor = (type: CrisisResource['type']) => {
    switch (type) {
      case 'hotline':
        return 'bg-red-500';
      case 'text':
        return 'bg-blue-500';
      case 'chat':
        return 'bg-purple-500';
      case 'local':
        return 'bg-green-500';
      case 'telehealth':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-2">Professional Crisis Resources</h2>
        <p className="text-gray-600">Immediate access to professional support</p>
      </div>

      {/* Emergency Banner */}
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-red-800">Immediate Emergency</h3>
              <p className="text-red-700 text-sm">
                If you're in immediate danger, call 911 or go to your nearest emergency room
              </p>
              <Button 
                onClick={() => window.open('tel:911', '_self')}
                className="mt-2 bg-red-600 hover:bg-red-700"
                size="sm"
              >
                <Phone className="w-4 h-4 mr-2" />
                Call 911 Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* National Crisis Resources */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">National Crisis Support</h3>
        <div className="space-y-3">
          {nationalResources.map((resource) => (
            <Card key={resource.id} className={resource.isPrimary ? 'border-red-500 border-2' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className={`w-10 h-10 rounded-full ${getResourceColor(resource.type)} flex items-center justify-center text-white`}>
                      {getResourceIcon(resource.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{resource.name}</h4>
                        {resource.isPrimary && <Badge className="bg-red-500">Primary</Badge>}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{resource.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {resource.availability}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {resource.specialties.map((specialty) => (
                          <Badge key={specialty} variant="outline" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-1 ml-4">
                    {resource.phone && (
                      <Button
                        size="sm"
                        onClick={() => handleCall(resource)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Phone className="w-4 h-4 mr-1" />
                        Call
                      </Button>
                    )}
                    {resource.textNumber && (
                      <Button
                        size="sm"
                        onClick={() => handleText(resource)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Text
                      </Button>
                    )}
                    {resource.website && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleWebsite(resource)}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Website
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Local Resources Search */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Local Crisis Centers</h3>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Find Local Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Input
                placeholder="Enter your ZIP code"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                maxLength={5}
              />
              <Button 
                onClick={searchLocalResources}
                disabled={isSearching}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSearching ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Local Resources Results */}
        {localResources.length > 0 && (
          <div className="mt-4 space-y-3">
            {localResources.map((resource) => (
              <Card key={resource.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`w-10 h-10 rounded-full ${getResourceColor(resource.type)} flex items-center justify-center text-white`}>
                        {getResourceIcon(resource.type)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{resource.name}</h4>
                        <p className="text-sm text-gray-600 mb-2">{resource.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {resource.availability}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {resource.specialties.map((specialty) => (
                            <Badge key={specialty} variant="outline" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-1 ml-4">
                      {resource.phone && (
                        <Button
                          size="sm"
                          onClick={() => handleCall(resource)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Phone className="w-4 h-4 mr-1" />
                          Call
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Access Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-semibold text-blue-800 mb-2">Quick Access Tips</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Save 988 in your phone contacts for instant access</li>
            <li>• Text "HOME" to 741741 from anywhere in the US</li>
            <li>• Local crisis centers often provide same-day appointments</li>
            <li>• Many resources offer online chat support as well</li>
            <li>• Don't hesitate to call - crisis counselors are trained to help</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfessionalCrisisResources;
