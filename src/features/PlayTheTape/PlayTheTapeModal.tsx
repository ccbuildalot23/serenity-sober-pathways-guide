
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { UserData, GeneratedStory } from './types';
import { generateRelapseStory } from './storyGenerator';
import { SafetyWarning } from './components/SafetyWarning';
import { StoryPlayer } from './components/StoryPlayer';
import { ReflectionPrompt } from './components/ReflectionPrompt';

interface PlayTheTapeModalProps {
  _userData: UserData;
  onClose: () => void;
}

export const PlayTheTapeModal: React.FC<PlayTheTapeModalProps> = ({ 
  _userData, 
  onClose 
}) => {
  const [stage, setStage] = useState<'warning' | 'story' | 'reflection'>('warning');
  const [story, setStory] = useState<GeneratedStory | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const handleProceed = async () => {
    setLoading(true);
    try {
      const _generatedStory = await generateRelapseStory(_userData);
      setStory(_generatedStory);
      setStage('story');
    } catch (error) {
      console.error('Failed to generate story:', error);
      // TODO: Show error state
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoToGrounding = () => {
    // Navigate to crisis support which has grounding exercises
    window.location.href = '/crisis-support';
    onClose();
  };
  
  // Track usage for safety monitoring
  React.useEffect(() => {
    localStorage.setItem('lastPlayTapeUse', new Date().toISOString());
  }, []);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>
        
        {stage === 'warning' && (
          <SafetyWarning 
            onProceed={handleProceed}
            onCancel={handleGoToGrounding}
            loading={loading}
          />
        )}
        
        {stage === 'story' && story && (
          <StoryPlayer
            story={story}
            audioEnabled={audioEnabled}
            onToggleAudio={() => setAudioEnabled(!audioEnabled)}
            onComplete={() => setStage('reflection')}
          />
        )}
        
        {stage === 'reflection' && (
          <ReflectionPrompt
            onComplete={onClose}
            onGoToGrounding={handleGoToGrounding}
          />
        )}
      </div>
    </div>
  );
};
