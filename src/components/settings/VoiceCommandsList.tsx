
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, AlertTriangle, Heart, Phone, TrendingUp } from 'lucide-react';

export const VoiceCommandsList: React.FC = () => {
  const commandCategories = [
    {
      title: "Crisis Commands",
      icon: <AlertTriangle className="w-4 h-4" />,
      color: "text-red-600",
      commands: [
        { phrase: "Hey Serenity, I need help", action: "Crisis mode activation" },
        { phrase: "Serenity crisis", action: "Emergency support tools" },
        { phrase: "Emergency help", action: "Immediate crisis intervention" },
        { phrase: "Serenity help me", action: "Crisis support activation" }
      ]
    },
    {
      title: "Check-in Commands", 
      icon: <Heart className="w-4 h-4" />,
      color: "text-blue-600",
      commands: [
        { phrase: "Serenity, time to check in", action: "Open daily check-in" },
        { phrase: "Hey Serenity check in", action: "Start mood assessment" },
        { phrase: "Serenity mood check", action: "Quick mood rating" }
      ]
    },
    {
      title: "Progress Commands",
      icon: <TrendingUp className="w-4 w-4" />,
      color: "text-green-600", 
      commands: [
        { phrase: "Serenity show progress", action: "View recovery stats" },
        { phrase: "Serenity calendar", action: "Open recovery calendar" },
        { phrase: "Serenity insights", action: "View pattern analysis" }
      ]
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5" />
          Voice Commands Reference
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {commandCategories.map((category, index) => (
            <div key={index} className="space-y-3">
              <h4 className={`font-medium flex items-center gap-2 ${category.color}`}>
                {category.icon}
                {category.title}
              </h4>
              <div className="grid gap-2">
                {category.commands.map((command, cmdIndex) => (
                  <div key={cmdIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <code className="text-sm font-mono bg-white px-2 py-1 rounded border">
                      "{command.phrase}"
                    </code>
                    <Badge variant="secondary" className="text-xs">
                      {command.action}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Tips:</strong> Speak clearly and wait for the activation sound. 
            Voice commands work best in quiet environments.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
