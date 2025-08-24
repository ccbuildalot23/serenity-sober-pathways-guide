
import React from 'react';
import { Card } from '@/components/ui/card';
import { BookOpen, Heart, User, Calendar } from 'lucide-react';

const EducationalResources = () => {
  const resources = [
    {
      id: 1,
      title: "Managing Cravings",
      description: "Practical techniques to handle urges and cravings",
      icon: Heart,
      content: "Remember: Cravings are temporary. Use the HALT method - are you Hungry, Angry, Lonely, or Tired?",
      category: "Coping Strategies"
    },
    {
      id: 2,
      title: "Deep Breathing Exercise",
      description: "5-minute guided breathing to reduce anxiety",
      icon: Heart,
      content: "Breathe in for 4 counts, hold for 4, exhale for 6. Repeat this cycle 5 times.",
      category: "Mindfulness"
    },
    {
      id: 3,
      title: "Building Healthy Routines",
      description: "Structure your day for success",
      icon: Calendar,
      content: "Start with small, achievable goals. Morning routine: wake up, make bed, hydrate, check-in.",
      category: "Daily Habits"
    },
    {
      id: 4,
      title: "Connecting with Others",
      description: "Building meaningful relationships in recovery",
      icon: User,
      content: "Isolation is the enemy of recovery. Reach out to one person today, even if it's just to say hello.",
      category: "Relationships"
    },
    {
      id: 5,
      title: "Crisis Hotlines",
      description: "24/7 support when you need it most",
      icon: Heart,
      content: "National Suicide Prevention Lifeline: 988\nSAMHSA Helpline: 1-800-662-4357",
      category: "Emergency"
    }
  ];

  const [selectedResource, setSelectedResource] = React.useState<number | null>(null);

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold serenity-navy">Learning Center</h3>
      
      {selectedResource ? (
        <Card className="p-6 animate-scale-in">
          <button 
            onClick={() => setSelectedResource(null)}
            className="text-blue-600 text-sm mb-4 hover:underline"
          >
            ← Back to resources
          </button>
          
          {(() => {
            const resource = resources.find(r => r.id === selectedResource);
            if (!resource) return null;
            
            const Icon = resource.icon;
            return (
              <div>
                <div className="flex items-center mb-4">
                  <Icon className="w-6 h-6 serenity-emerald mr-2" />
                  <h4 className="text-lg font-semibold serenity-navy">{resource.title}</h4>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                    {resource.category}
                  </span>
                </div>
                
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                    {resource.content}
                  </p>
                </div>
                
                {resource.id === 5 && (
                  <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-800 font-medium">
                      If you're in immediate danger, please call 911 or go to your nearest emergency room.
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </Card>
      ) : (
        <div className="space-y-3">
          {resources.map((resource) => {
            const Icon = resource.icon;
            return (
              <Card 
                key={resource.id} 
                className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
                onClick={() => setSelectedResource(resource.id)}
              >
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                    <Icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-semibold serenity-navy mb-1">{resource.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{resource.description}</p>
                    <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
                      {resource.category}
                    </span>
                  </div>
                  
                  <BookOpen className="w-5 h-5 text-gray-400" />
                </div>
              </Card>
            );
          })}
        </div>
      )}
      
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-emerald-50 border-blue-200">
        <div className="text-center">
          <Heart className="w-8 h-8 serenity-emerald mx-auto mb-2" />
          <h4 className="font-semibold serenity-navy mb-1">Remember</h4>
          <p className="text-sm text-gray-600">
            Recovery is a journey, not a destination. Take it one day at a time.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default EducationalResources;
