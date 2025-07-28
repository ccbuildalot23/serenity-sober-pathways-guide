import React, { useState } from 'react';
import { Mic, MicOff, Loader, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { toast } from 'sonner';

interface VoiceInterfaceProps {
  onTextGenerated?: (text: string) => void;
  placeholder?: string;
  showTextToSpeech?: boolean;
  initialText?: string;
}

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({
  onTextGenerated,
  placeholder = 'Voice input will appear here...',
  showTextToSpeech = true,
  initialText = ''
}) => {
  const [text, setText] = useState(initialText);
  const [selectedVoice, setSelectedVoice] = useState<'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'>('alloy');

  const voiceRecording = useVoiceRecording({
    maxDuration: 60,
    onStart: () => {
      toast.info('Recording started', { description: 'Speak clearly into your microphone' });
    },
    onStop: () => {
      toast.info('Recording stopped', { description: 'Processing your voice...' });
    },
    onError: (error) => {
      toast.error('Recording failed', { description: error });
    },
    onTranscription: (transcribedText) => {
      setText(transcribedText);
      onTextGenerated?.(transcribedText);
      toast.success('Voice converted to text!');
    }
  });

  const textToSpeech = useTextToSpeech({
    voice: selectedVoice,
    onStart: () => {
      toast.info('Playing audio...');
    },
    onEnd: () => {
      toast.success('Audio finished');
    },
    onError: (error) => {
      toast.error('Speech failed', { description: error });
    }
  });

  const handleSpeak = () => {
    if (text.trim()) {
      textToSpeech.speak(text);
    } else {
      toast.error('No text to speak', { description: 'Please enter some text first' });
    }
  };

  const handleTextChange = (value: string) => {
    setText(value);
    onTextGenerated?.(value);
  };

  const voices = [
    { value: 'alloy', label: 'Alloy (Neutral)' },
    { value: 'echo', label: 'Echo (Male)' },
    { value: 'fable', label: 'Fable (British Male)' },
    { value: 'onyx', label: 'Onyx (Deep Male)' },
    { value: 'nova', label: 'Nova (Young Female)' },
    { value: 'shimmer', label: 'Shimmer (Soft Female)' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Voice Interface
        </CardTitle>
        <CardDescription>
          Use voice input and speech output for hands-free interaction
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Voice Recording Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Voice Input</label>
            <div className="flex gap-2">
              {voiceRecording.isRecording && (
                <Badge variant="destructive" className="animate-pulse">
                  Recording...
                </Badge>
              )}
              {voiceRecording.isProcessing && (
                <Badge variant="secondary">
                  <Loader className="h-3 w-3 mr-1 animate-spin" />
                  Processing...
                </Badge>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant={voiceRecording.isRecording ? "destructive" : "outline"}
              size="sm"
              onClick={voiceRecording.isRecording ? voiceRecording.stopRecording : voiceRecording.startRecording}
              disabled={voiceRecording.isProcessing}
            >
              {voiceRecording.isRecording ? (
                <>
                  <MicOff className="h-4 w-4 mr-2" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Start Recording
                </>
              )}
            </Button>

            {voiceRecording.transcript && (
              <Button
                variant="ghost"
                size="sm"
                onClick={voiceRecording.clearTranscript}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Text Area */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Text</label>
          <Textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={placeholder}
            rows={4}
            className="resize-none"
          />
        </div>

        {/* Text-to-Speech Section */}
        {showTextToSpeech && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Speech Output</label>
            
            <div className="flex gap-2 items-center">
              <Select value={selectedVoice} onValueChange={(value: any) => setSelectedVoice(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((voice) => (
                    <SelectItem key={voice.value} value={voice.value}>
                      {voice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSpeak}
                disabled={textToSpeech.isLoading || textToSpeech.isSpeaking || !text.trim()}
              >
                {textToSpeech.isLoading ? (
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                ) : textToSpeech.isSpeaking ? (
                  <VolumeX className="h-4 w-4 mr-2" />
                ) : (
                  <Volume2 className="h-4 w-4 mr-2" />
                )}
                {textToSpeech.isLoading ? 'Generating...' : textToSpeech.isSpeaking ? 'Speaking...' : 'Speak Text'}
              </Button>

              {textToSpeech.isSpeaking && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={textToSpeech.stop}
                >
                  Stop
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {(voiceRecording.error || textToSpeech.error) && (
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
            {voiceRecording.error || textToSpeech.error}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceInterface;