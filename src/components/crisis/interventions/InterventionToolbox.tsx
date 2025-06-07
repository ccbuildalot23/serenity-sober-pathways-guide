
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Hand, Wind, Snowflake, Waves } from 'lucide-react';
import GroundingExercise from './GroundingExercise';
import BoxBreathingTimer from './BoxBreathingTimer';
import ColdWaterTechnique from './ColdWaterTechnique';
import UrgeSurfingTimer from './UrgeSurfingTimer';

interface InterventionToolboxProps {
  onBack: () => void;
  onComplete: () => void;
}

type Tool = 'grounding' | 'breathing' | 'cold-water' | 'urge-surfing' | null;

const tools = [
  {
    id: 'grounding' as Tool,
    name: '5-4-3-2-1 Grounding',
    description: 'Use your senses to reconnect with the present moment',
    icon: Hand,
    color: 'bg-blue-500',
    duration: '3-5 minutes'
  },
  {
    id: 'breathing' as Tool,
    name: 'Box Breathing',
    description: 'Structured breathing to calm your nervous system',
    icon: Wind,
    color: 'bg-green-500',
    duration: '2-10 minutes'
  },
  {
    id: 'cold-water' as Tool,
    name: 'Cold Water Technique',
    description: 'Activate your dive response for immediate calm',
    icon: Snowflake,
    color: 'bg-cyan-500',
    duration: '30s - 5 minutes'
  },
  {
    id: 'urge-surfing' as Tool,
    name: 'Urge Surfing',
    description: 'Ride out difficult urges like waves in the ocean',
    icon: Waves,
    color: 'bg-purple-500',
    duration: '2 minutes'
  }
];

const InterventionToolbox: React.FC<InterventionToolboxProps> = ({ onBack, onComplete }) => {
  const [selectedTool, setSelectedTool] = useState<Tool>(null);

  const handleToolComplete = () => {
    setSelectedTool(null);
    onComplete();
  };

  const handleToolBack = () => {
    setSelectedTool(null);
  };

  // Render individual tool components
  if (selectedTool === 'grounding') {
    return <GroundingExercise onComplete={handleToolComplete} />;
  }

  if (selectedTool === 'breathing') {
    return <BoxBreathingTimer onComplete={handleToolComplete} />;
  }

  if (selectedTool === 'cold-water') {
    return <ColdWaterTechnique onComplete={handleToolComplete} />;
  }

  if (selectedTool === 'urge-surfing') {
    return <UrgeSurfingTimer onComplete={handleToolComplete} />;
  }

  // Tool selection screen
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <CardTitle>Crisis Intervention Tools</CardTitle>
        </div>
        <p className="text-sm text-gray-600">
          Choose a tool to help you through this difficult moment
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              variant="outline"
              className="w-full h-auto p-4 flex items-start gap-3 hover:bg-gray-50"
            >
              <div className={`w-10 h-10 rounded-full ${tool.color} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{tool.name}</span>
                  <span className="text-xs text-gray-500">{tool.duration}</span>
                </div>
                <p className="text-sm text-gray-600">{tool.description}</p>
              </div>
            </Button>
          );
        })}
        
        <div className="pt-4 border-t">
          <Button onClick={onBack} variant="ghost" className="w-full">
            Back to Crisis Response
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InterventionToolbox;
