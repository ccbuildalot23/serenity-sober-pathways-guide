
import React, { useState } from 'react';
import { Heart } from 'lucide-react';

interface ReflectionPromptProps {
  onComplete: () => void;
  onGoToGrounding: () => void;
}

export const ReflectionPrompt: React.FC<ReflectionPromptProps> = ({ 
  onComplete, 
  onGoToGrounding 
}) => {
  const [reflection, setReflection] = useState('');
  const [saved, setSaved] = useState(false);
  
  const handleSave = () => {
    // Save to localStorage for now - in production use secure backend
    console.log('Saving reflection:', reflection);
    localStorage.setItem('lastReflection', JSON.stringify({
      text: reflection,
      timestamp: new Date().toISOString()
    }));
    setSaved(true);
    setTimeout(onComplete, 1500);
  };
  
  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-green-100 rounded-full">
          <Heart className="w-6 h-6 text-green-600" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-800">Grounding Reflection</h2>
      </div>
      
      <div className="space-y-4 mb-6">
        <p className="text-gray-700">
          What felt most real in that story? What's one thing you can do differently today?
        </p>
        
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="Take a moment to write your thoughts..."
          className="w-full h-32 p-4 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          disabled={saved}
        />
      </div>
      
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saved || !reflection.trim()}
          className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saved ? 'Saved ✓' : 'Save Reflection'}
        </button>
        <button
          onClick={reflection ? onComplete : onGoToGrounding}
          className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          {reflection ? 'Skip' : 'Grounding Exercises'}
        </button>
      </div>
    </div>
  );
};
