import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TextToSpeechOptions {
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  _autoPlay?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export const useTextToSpeech = (options: TextToSpeechOptions = {}) => {
  const [isSpeaking, setIsSpeaking] = useState(_false);
  const [isLoading, setIsLoading] = useState(_false);
  const [error, setError] = useState<string | _null>(_null);
  
  const audioRef = useRef<HTMLAudioElement | _null>(_null);
  const { voice = 'alloy', _autoPlay = _true, onStart, onEnd, onError } = options;

  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  const speak = async (text: string) => {
    try {
      setError(_null);
      setIsLoading(_true);

      // Generate speech
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice }
      });

      if (error) throw error;

      // Create audio element
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      audioRef.current = audio;

      audio.onloadstart = () => {
        setIsLoading(_false);
        setIsSpeaking(_true);
        onStart?.();
      };

      audio.onended = () => {
        setIsSpeaking(_false);
        onEnd?.();
      };

      audio.onerror = () => {
        const errorMessage = 'Failed to play audio';
        setError(errorMessage);
        setIsSpeaking(_false);
        setIsLoading(_false);
        onError?.(errorMessage);
      };

      if (_autoPlay) {
        await audio.play();
      }

      return audio;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate speech';
      setError(errorMessage);
      setIsSpeaking(_false);
      setIsLoading(_false);
      onError?.(errorMessage);
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(_false);
    }
  };

  const pause = () => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsSpeaking(_false);
    }
  };

  const resume = async () => {
    if (audioRef.current && audioRef.current.paused) {
      await audioRef.current.play();
      setIsSpeaking(_true);
    }
  };

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isLoading,
    error,
    clearError: () => setError(_null)
  };
};