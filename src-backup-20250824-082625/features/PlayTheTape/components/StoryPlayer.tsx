
import React, { useState, useEffect } from 'react';
import { Volume2, FileText } from 'lucide-react';
import { GeneratedStory } from '../types';

interface StoryPlayerProps {
  story: GeneratedStory;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onComplete: () => void;
}

export const StoryPlayer: React.FC<StoryPlayerProps> = ({ 
  story, 
  audioEnabled, 
  onToggleAudio, 
  onComplete 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (isPlaying && audioEnabled) {
      const _interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return prev + (100 / story.duration);
        });
      }, 1000);
      
      return () => clearInterval(_interval);
    }
  }, [isPlaying, audioEnabled, story.duration]);
  
  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Your Reflection Story</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleAudio}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
              audioEnabled 
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            {audioEnabled ? 'Audio On' : 'Text Only'}
          </button>
        </div>
      </div>
      
      {audioEnabled && (
        <div className="mb-6">
          <div className="bg-gray-100 rounded-lg p-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-full flex items-center justify-center gap-3 py-3 bg-white hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
            >
              {isPlaying ? 'Pause' : 'Play'} Audio
            </button>
            <div className="mt-3 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-blue-500 h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-blue-50 rounded-lg p-6 mb-6">
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
          {story.transcript}
        </p>
      </div>
      
      <button
        onClick={onComplete}
        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
      >
        Continue to Reflection
      </button>
    </div>
  );
};
