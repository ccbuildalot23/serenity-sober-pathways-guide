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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { voice = 'alloy', _autoPlay = true, onStart, onEnd, onError } = options;

  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  const speak = async (text: string) => {
    try {
      setError(null);
      setIsLoading(true);

      // Generate speech
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice }
      });

      if (error) throw error;

      // Create audio element
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      audioRef.current = audio;

      audio.onloadstart = () => {
        setIsLoading(false);
        setIsSpeaking(true);
        onStart?.();
      };

      audio.onended = () => {
        setIsSpeaking(false);
        onEnd?.();
      };

      audio.onerror = () => {
        const errorMessage = 'Failed to play audio';
        setError(errorMessage);
        setIsSpeaking(false);
        setIsLoading(false);
        onError?.(errorMessage);
      };

      if (_autoPlay) {
        await audio.play();
      }

      return audio;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate speech';
      setError(errorMessage);
      setIsSpeaking(false);
      setIsLoading(false);
      onError?.(errorMessage);
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
    }
  };

  const pause = () => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsSpeaking(false);
    }
  };

  const resume = async () => {
    if (audioRef.current && audioRef.current.paused) {
      await audioRef.current.play();
      setIsSpeaking(true);
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
    clearError: () => setError(null)
  };
};