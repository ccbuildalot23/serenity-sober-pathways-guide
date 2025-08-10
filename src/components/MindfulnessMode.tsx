/**
 * Mindfulness Mode Component
 * Provides enhanced calming features with reduced visual complexity
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  Pause, 
  Play, 
  Settings, 
  Eye, 
  EyeOff, 
  Volume2, 
  Waves,
  Zap,
  ZapOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CalmingBackgrounds } from '@/components/visual/CalmingBackgrounds';
import { audioService } from '@/services/audioService';
import { useSoundEffects } from '@/components/audio/SoundEffects';

interface MindfulnessSettings {
  enabled: boolean;
  reducedVisualComplexity: boolean;
  softerColors: boolean;
  slowerAnimations: boolean;
  guidedBreathing: boolean;
  focusMode: boolean;
  ambientSounds: boolean;
  breathingRate: number; // breaths per minute
  sessionDuration: number; // minutes
  backgroundIntensity: 'minimal' | 'subtle' | 'moderate';
}

interface BreathingSession {
  isActive: boolean;
  currentPhase: 'inhale' | 'hold' | 'exhale' | 'pause';
  progress: number;
  cycleCount: number;
  timeRemaining: number;
}

export const MindfulnessMode: React.FC<{ className?: string }> = ({ className }) => {
  const { playTransition } = useSoundEffects();
  
  const [settings, setSettings] = useState<MindfulnessSettings>(() => {
    try {
      const saved = localStorage.getItem('serenity-mindfulness-settings');
      return saved ? { ...getDefaultSettings(), ...JSON.parse(saved) } : getDefaultSettings();
    } catch {
      return getDefaultSettings();
    }
  });

  const [breathing, setBreathing] = useState<BreathingSession>({
    isActive: false,
    currentPhase: 'inhale',
    progress: 0,
    cycleCount: 0,
    timeRemaining: 0
  });

  const [showSettings, setShowSettings] = useState(false);

  function getDefaultSettings(): MindfulnessSettings {
    return {
      enabled: false,
      reducedVisualComplexity: true,
      softerColors: true,
      slowerAnimations: true,
      guidedBreathing: false,
      focusMode: false,
      ambientSounds: false,
      breathingRate: 6, // 6 breaths per minute (4-4-4-4 pattern)
      sessionDuration: 5,
      backgroundIntensity: 'subtle'
    };
  }

  // Save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('serenity-mindfulness-settings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save mindfulness settings:', error);
    }
  }, [settings]);

  // Apply global mindfulness styles
  useEffect(() => {
    const root = document.documentElement;
    
    if (settings.enabled) {
      // Apply mindfulness CSS variables
      root.style.setProperty('--mindfulness-enabled', '1');
      root.style.setProperty('--animation-speed', settings.slowerAnimations ? '0.5' : '1');
      
      if (settings.softerColors) {
        root.style.setProperty('--mindfulness-opacity', '0.8');
        root.style.setProperty('--mindfulness-saturation', '0.7');
      } else {
        root.style.setProperty('--mindfulness-opacity', '1');
        root.style.setProperty('--mindfulness-saturation', '1');
      }

      // Add mindfulness class to body
      document.body.classList.add('mindfulness-mode');
      
      if (settings.focusMode) {
        document.body.classList.add('focus-mode');
      }
    } else {
      // Reset styles
      root.style.removeProperty('--mindfulness-enabled');
      root.style.removeProperty('--animation-speed');
      root.style.removeProperty('--mindfulness-opacity');
      root.style.removeProperty('--mindfulness-saturation');
      
      document.body.classList.remove('mindfulness-mode', 'focus-mode');
    }

    return () => {
      document.body.classList.remove('mindfulness-mode', 'focus-mode');
    };
  }, [settings.enabled, settings.softerColors, settings.slowerAnimations, settings.focusMode]);

  // Breathing exercise logic
  useEffect(() => {
    if (!breathing.isActive || !settings.guidedBreathing) return;

    const breathCycleDuration = (60 / settings.breathingRate) * 1000; // ms per complete cycle
    const phaseDuration = breathCycleDuration / 4; // inhale-hold-exhale-pause

    const interval = setInterval(() => {
      setBreathing(prev => {
        const newProgress = (prev.progress + 10) % 100;
        let newPhase = prev.currentPhase;
        let newCycleCount = prev.cycleCount;

        // Determine phase based on progress
        if (newProgress < 25) {
          newPhase = 'inhale';
        } else if (newProgress < 50) {
          newPhase = 'hold';
        } else if (newProgress < 75) {
          newPhase = 'exhale';
        } else {
          newPhase = 'pause';
        }

        // Count completed cycles
        if (newProgress === 0 && prev.progress > 90) {
          newCycleCount += 1;
          playTransition();
        }

        // Check if session is complete
        const sessionDurationMs = settings.sessionDuration * 60 * 1000;
        const elapsedTime = newCycleCount * breathCycleDuration;
        const remaining = Math.max(0, sessionDurationMs - elapsedTime);

        if (remaining <= 0) {
          // Session complete
          setTimeout(() => {
            setBreathing(prev => ({ ...prev, isActive: false }));
          }, 100);
        }

        return {
          ...prev,
          progress: newProgress,
          currentPhase: newPhase,
          cycleCount: newCycleCount,
          timeRemaining: remaining
        };
      });
    }, phaseDuration / 25); // 25 updates per phase for smooth animation

    return () => clearInterval(interval);
  }, [breathing.isActive, settings.breathingRate, settings.sessionDuration, settings.guidedBreathing, playTransition]);

  const updateSetting = useCallback(<K extends keyof MindfulnessSettings>(
    key: K, 
    value: MindfulnessSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const startBreathingSession = useCallback(() => {
    if (settings.ambientSounds) {
      audioService.playTrack('meditation', 0.3);
    }
    
    setBreathing({
      isActive: true,
      currentPhase: 'inhale',
      progress: 0,
      cycleCount: 0,
      timeRemaining: settings.sessionDuration * 60 * 1000
    });

    playTransition();
  }, [settings.ambientSounds, settings.sessionDuration, playTransition]);

  const stopBreathingSession = useCallback(() => {
    setBreathing(prev => ({ ...prev, isActive: false }));
    audioService.stopTrack('meditation');
    playTransition();
  }, [playTransition]);

  const getPhaseInstruction = () => {
    switch (breathing.currentPhase) {
      case 'inhale': return 'Breathe In';
      case 'hold': return 'Hold';
      case 'exhale': return 'Breathe Out';
      case 'pause': return 'Pause';
      default: return 'Breathe';
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Global Mindfulness Styles */}
      <style jsx global>{`
        .mindfulness-mode {
          --mindfulness-filter: opacity(var(--mindfulness-opacity, 1)) 
                               saturate(var(--mindfulness-saturation, 1));
          filter: var(--mindfulness-filter);
        }
        
        .mindfulness-mode * {
          animation-duration: calc(var(--animation-speed, 1) * 1s) !important;
          transition-duration: calc(var(--animation-speed, 1) * 0.3s) !important;
        }
        
        .focus-mode .sidebar,
        .focus-mode .header-secondary,
        .focus-mode .footer,
        .focus-mode .advertisement,
        .focus-mode .non-essential {
          opacity: 0.3;
          pointer-events: auto;
        }
        
        .focus-mode .main-content {
          max-width: 800px;
          margin: 0 auto;
        }
        
        @media (prefers-reduced-motion: reduce) {
          .mindfulness-mode * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <CalmingBackgrounds 
        variant={settings.enabled ? "nature" : "minimal"} 
        intensity={settings.backgroundIntensity}
        enabled={settings.enabled}
        className={className}
      >
        <Card className={cn(
          "transition-all duration-500",
          settings.enabled && "backdrop-blur-sm bg-white/90 dark:bg-gray-900/90"
        )}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                <CardTitle>Mindfulness Mode</CardTitle>
                {settings.enabled && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    Active
                  </Badge>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
            
            <CardDescription>
              Enhance your recovery experience with calming features designed to reduce 
              distractions and promote mindful interaction.
            </CardDescription>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(checked) => updateSetting('enabled', checked)}
                  id="mindfulness-enabled"
                />
                <label htmlFor="mindfulness-enabled" className="text-sm font-medium">
                  Enable Mindfulness Mode
                </label>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Quick Toggles */}
            {settings.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {settings.reducedVisualComplexity ? (
                      <Eye className="h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-sm">Reduced Visuals</span>
                  </div>
                  <Switch
                    checked={settings.reducedVisualComplexity}
                    onCheckedChange={(checked) => updateSetting('reducedVisualComplexity', checked)}
                    size="sm"
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {settings.focusMode ? (
                      <Zap className="h-4 w-4 text-orange-600" />
                    ) : (
                      <ZapOff className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-sm">Focus Mode</span>
                  </div>
                  <Switch
                    checked={settings.focusMode}
                    onCheckedChange={(checked) => updateSetting('focusMode', checked)}
                    size="sm"
                  />
                </div>
              </div>
            )}

            {/* Guided Breathing Section */}
            {settings.enabled && (
              <>
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Waves className="h-5 w-5" />
                      Guided Breathing
                    </h3>
                    
                    <Switch
                      checked={settings.guidedBreathing}
                      onCheckedChange={(checked) => updateSetting('guidedBreathing', checked)}
                    />
                  </div>

                  {settings.guidedBreathing && (
                    <div className="space-y-4">
                      {/* Breathing Visualization */}
                      <div className="flex flex-col items-center space-y-4 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                        {breathing.isActive ? (
                          <>
                            <div 
                              className={cn(
                                "w-24 h-24 rounded-full border-4 border-blue-400 flex items-center justify-center transition-all duration-1000",
                                breathing.currentPhase === 'inhale' && "scale-125 bg-blue-100",
                                breathing.currentPhase === 'hold' && "scale-125 bg-blue-200",
                                breathing.currentPhase === 'exhale' && "scale-100 bg-blue-50",
                                breathing.currentPhase === 'pause' && "scale-100 bg-white"
                              )}
                            >
                              <span className="text-sm font-medium text-blue-700">
                                {getPhaseInstruction()}
                              </span>
                            </div>
                            
                            <div className="text-center space-y-2">
                              <div className="text-2xl font-bold text-blue-700">
                                {getPhaseInstruction()}
                              </div>
                              <div className="text-sm text-blue-600">
                                Cycle {breathing.cycleCount} • {formatTime(breathing.timeRemaining)} remaining
                              </div>
                              <Progress 
                                value={breathing.progress} 
                                className="w-48 h-2"
                              />
                            </div>
                            
                            <Button onClick={stopBreathingSession} variant="outline" size="sm">
                              <Pause className="h-4 w-4 mr-2" />
                              Stop Session
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="w-24 h-24 rounded-full border-4 border-gray-300 flex items-center justify-center bg-gray-50">
                              <Play className="h-8 w-8 text-gray-500" />
                            </div>
                            
                            <div className="text-center space-y-2">
                              <div className="text-lg font-semibold text-gray-700">
                                Ready to Begin
                              </div>
                              <div className="text-sm text-gray-500">
                                {settings.sessionDuration} minute session • {settings.breathingRate} breaths/min
                              </div>
                            </div>
                            
                            <Button onClick={startBreathingSession} className="bg-blue-600 hover:bg-blue-700">
                              <Play className="h-4 w-4 mr-2" />
                              Start Breathing Exercise
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Advanced Settings */}
            {showSettings && settings.enabled && (
              <>
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Advanced Settings</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Session Duration</label>
                      <Slider
                        value={[settings.sessionDuration]}
                        onValueChange={([value]) => updateSetting('sessionDuration', value)}
                        min={1}
                        max={20}
                        step={1}
                        className="w-full"
                      />
                      <div className="text-xs text-muted-foreground">
                        {settings.sessionDuration} minutes
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Breathing Rate</label>
                      <Slider
                        value={[settings.breathingRate]}
                        onValueChange={([value]) => updateSetting('breathingRate', value)}
                        min={4}
                        max={12}
                        step={1}
                        className="w-full"
                      />
                      <div className="text-xs text-muted-foreground">
                        {settings.breathingRate} breaths per minute
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Softer Colors</label>
                      <Switch
                        checked={settings.softerColors}
                        onCheckedChange={(checked) => updateSetting('softerColors', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Slower Animations</label>
                      <Switch
                        checked={settings.slowerAnimations}
                        onCheckedChange={(checked) => updateSetting('slowerAnimations', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Ambient Sounds</label>
                      <Switch
                        checked={settings.ambientSounds}
                        onCheckedChange={(checked) => updateSetting('ambientSounds', checked)}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Usage Information */}
            <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg">
              <p>
                <strong>Mindfulness Mode</strong> reduces visual complexity, uses softer colors, 
                and provides optional breathing exercises to create a more calming experience. 
                Focus Mode dims non-essential elements to help you concentrate on your recovery.
              </p>
            </div>
          </CardContent>
        </Card>
      </CalmingBackgrounds>
    </>
  );
};