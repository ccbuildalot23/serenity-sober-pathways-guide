
import React from 'react';
import { Button } from '@/components/ui/button';
import { Hand, Mic, Zap, Clock } from 'lucide-react';

interface FloatingActionButtonsProps {
  onHelpClick: () => void;
  onVoiceCommand: () => void;
  onPanicMode: () => void;
  isVoiceListening: boolean;
  panicCooldown: number;
  isLoading: boolean;
}

const FloatingActionButtons = ({
  onHelpClick,
  onVoiceCommand,
  onPanicMode,
  isVoiceListening,
  panicCooldown,
  isLoading
}: FloatingActionButtonsProps) => {
  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2">
      {/* Panic Mode Button */}
      <Button
        onClick={onPanicMode}
        disabled={panicCooldown > 0 || isLoading}
        className={`w-16 h-16 rounded-full shadow-lg ${
          panicCooldown > 0 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 animate-pulse'
        }`}
        size="lg"
        title="Panic Mode - Send emergency alert to all contacts immediately"
      >
        <div className="flex flex-col items-center">
          {panicCooldown > 0 ? (
            <>
              <Clock className="w-5 h-5 text-white" />
              <span className="text-xs text-white font-bold">{Math.ceil(panicCooldown / 1000)}s</span>
            </>
          ) : (
            <>
              <Zap className="w-6 h-6 text-white" />
              <span className="text-xs text-white font-bold">PANIC</span>
            </>
          )}
        </div>
      </Button>

      {/* Voice Command Button */}
      <Button
        onClick={onVoiceCommand}
        disabled={isVoiceListening}
        className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg"
        size="lg"
        title="Voice Command - Say 'Hey app, I need help'"
      >
        <Mic className={`w-5 h-5 text-white ${isVoiceListening ? 'animate-pulse' : ''}`} />
      </Button>

      {/* Main Help Button */}
      <Button
        onClick={onHelpClick}
        className="w-16 h-16 rounded-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-lg animate-pulse"
        size="lg"
        title="Emergency Help - Press Ctrl/Cmd + H"
      >
        <div className="flex flex-col items-center">
          <Hand className="w-6 h-6 text-white" />
          <span className="text-xs text-white font-bold mt-1">HELP</span>
        </div>
      </Button>
    </div>
  );
};

export default FloatingActionButtons;
