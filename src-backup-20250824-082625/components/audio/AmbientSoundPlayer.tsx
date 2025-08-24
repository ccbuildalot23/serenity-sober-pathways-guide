/**
 * Ambient Sound Player Component
 * Provides nature sounds, white noise, and ambient audio for calming experiences
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Pause, Volume2, VolumeX, Settings } from 'lucide-react';
import { audioService, AudioTrack, AudioPreferences } from '@/services/audioService';
import { useToast } from '@/hooks/use-toast';

interface AmbientSoundPlayerProps {
  className?: string;
  autoStart?: boolean;
  showSettings?: boolean;
}

export const AmbientSoundPlayer: React.FC<AmbientSoundPlayerProps> = ({
  className = '',
  autoStart = false,
  showSettings = true
}) => {
  const { toast } = useToast();
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [playingTracks, setPlayingTracks] = useState<Set<string>>(new Set());
  const [preferences, setPreferences] = useState<AudioPreferences>(audioService.getPreferences());
  const [isSupported, setIsSupported] = useState(audioService.isAudioSupported());
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  useEffect(() => {
    const availableTracks = audioService.getAvailableTracks();
    setTracks(availableTracks);
    
    // Auto-start preferred tracks if enabled
    if (autoStart && preferences.ambientEnabled && preferences.preferredTracks.length > 0) {
      const firstPreferred = preferences.preferredTracks[0];
      handlePlayPause(firstPreferred);
    }
  }, [autoStart, preferences.ambientEnabled, preferences.preferredTracks]);

  const handlePlayPause = useCallback(async (trackId: string) => {
    if (!isSupported) {
      toast({
        title: "Audio not supported",
        description: "Your browser doesn't support advanced audio features.",
        variant: "destructive"
      });
      return;
    }

    if (!preferences.ambientEnabled) {
      toast({
        title: "Ambient sounds disabled",
        description: "Enable ambient sounds in settings to play audio.",
      });
      return;
    }

    try {
      const isPlaying = playingTracks.has(trackId);
      
      if (isPlaying) {
        await audioService.stopTrack(trackId);
        setPlayingTracks(prev => {
          const newSet = new Set(prev);
          newSet.delete(trackId);
          return newSet;
        });
        
        toast({
          title: "Stopped",
          description: `Stopped ${tracks.find(t => t.id === trackId)?.name}`,
        });
      } else {
        await audioService.playTrack(trackId, 0.8);
        setPlayingTracks(prev => new Set([...prev, trackId]));
        
        toast({
          title: "Playing",
          description: `Started ${tracks.find(t => t.id === trackId)?.name}`,
        });
      }
    } catch (error) {
      console.error('Error playing track:', error);
      toast({
        title: "Playback error",
        description: "Could not play audio. Please try again.",
        variant: "destructive"
      });
    }
  }, [isSupported, preferences.ambientEnabled, playingTracks, tracks, toast]);

  const handleVolumeChange = useCallback((volume: number[]) => {
    const newVolume = volume[0] / 100;
    audioService.setMasterVolume(newVolume);
    setPreferences(prev => ({ ...prev, masterVolume: newVolume }));
  }, []);

  const handlePreferenceChange = useCallback((key: keyof AudioPreferences, value: any) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    audioService.updatePreferences({ [key]: value });

    // If disabling ambient sounds, stop all tracks
    if (key === 'ambientEnabled' && !value) {
      audioService.stopAllTracks();
      setPlayingTracks(new Set());
      toast({
        title: "Ambient sounds disabled",
        description: "All ambient sounds have been stopped.",
      });
    }
  }, [preferences, toast]);

  const stopAllTracks = useCallback(() => {
    audioService.stopAllTracks();
    setPlayingTracks(new Set());
    toast({
      title: "All sounds stopped",
      description: "All ambient sounds have been stopped.",
    });
  }, [toast]);

  const categorizedTracks = {
    nature: tracks.filter(t => t.category === 'nature'),
    noise: tracks.filter(t => t.category === 'noise'),
    ambient: tracks.filter(t => t.category === 'ambient')
  };

  if (!isSupported) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <VolumeX className="h-5 w-5" />
            Audio Not Available
          </CardTitle>
          <CardDescription>
            Your browser doesn't support the audio features needed for ambient sounds.
            Please try updating your browser or using a different one.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Ambient Sound Player
        </CardTitle>
        <CardDescription>
          Optional calming sounds to enhance your recovery experience
        </CardDescription>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              checked={preferences.ambientEnabled}
              onCheckedChange={(checked) => handlePreferenceChange('ambientEnabled', checked)}
              id="ambient-enabled"
            />
            <label htmlFor="ambient-enabled" className="text-sm font-medium">
              Enable Ambient Sounds
            </label>
          </div>
          
          {showSettings && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Volume Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Master Volume</label>
            <Badge variant="secondary">{Math.round(preferences.masterVolume * 100)}%</Badge>
          </div>
          <Slider
            value={[preferences.masterVolume * 100]}
            onValueChange={handleVolumeChange}
            max={100}
            step={1}
            disabled={!preferences.ambientEnabled}
            className="w-full"
          />
        </div>

        {/* Advanced Settings */}
        {showAdvancedSettings && (
          <div className="space-y-3 p-3 bg-muted rounded-lg">
            <h4 className="text-sm font-semibold">Advanced Settings</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Fade In (seconds)</label>
                <Slider
                  value={[preferences.fadeInDuration / 1000]}
                  onValueChange={(value) => handlePreferenceChange('fadeInDuration', value[0] * 1000)}
                  min={0.5}
                  max={5}
                  step={0.5}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Fade Out (seconds)</label>
                <Slider
                  value={[preferences.fadeOutDuration / 1000]}
                  onValueChange={(value) => handlePreferenceChange('fadeOutDuration', value[0] * 1000)}
                  min={0.5}
                  max={5}
                  step={0.5}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={preferences.soundEffectsEnabled}
                onCheckedChange={(checked) => handlePreferenceChange('soundEffectsEnabled', checked)}
                id="sound-effects"
              />
              <label htmlFor="sound-effects" className="text-sm">
                Enable Sound Effects
              </label>
            </div>
          </div>
        )}

        {/* Track Categories */}
        <Tabs defaultValue="nature" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="nature">Nature</TabsTrigger>
            <TabsTrigger value="noise">Noise</TabsTrigger>
            <TabsTrigger value="ambient">Ambient</TabsTrigger>
          </TabsList>

          {Object.entries(categorizedTracks).map(([category, categoryTracks]) => (
            <TabsContent key={category} value={category} className="space-y-2">
              {categoryTracks.map(track => (
                <div
                  key={track.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="text-sm font-medium">{track.name}</h4>
                    <p className="text-xs text-muted-foreground capitalize">
                      {track.category} sound
                    </p>
                  </div>
                  
                  <Button
                    size="sm"
                    variant={playingTracks.has(track.id) ? "default" : "outline"}
                    onClick={() => handlePlayPause(track.id)}
                    disabled={!preferences.ambientEnabled}
                  >
                    {playingTracks.has(track.id) ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </TabsContent>
          ))}
        </Tabs>

        {/* Control Buttons */}
        {playingTracks.size > 0 && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              onClick={stopAllTracks}
              className="w-full"
            >
              Stop All Sounds
            </Button>
          </div>
        )}

        {/* Usage Note */}
        <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg">
          <p>
            <strong>Note:</strong> Ambient sounds will automatically pause during important 
            interactions and resume afterward. All audio features are completely optional 
            and can be disabled at any time.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};