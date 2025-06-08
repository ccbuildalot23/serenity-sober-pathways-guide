
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AccessibilitySettings {
  largePanicButton: boolean;
  voiceAlerts: boolean;
  highContrastCrisis: boolean;
  simplifiedCrisisMode: boolean;
  hapticFeedback: boolean;
}

export const CrisisAccessibilitySettings: React.FC = () => {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    largePanicButton: true,
    voiceAlerts: true,
    highContrastCrisis: true,
    simplifiedCrisisMode: false,
    hapticFeedback: true
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('crisisAccessibilitySettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        
        // Apply settings to document
        applySettingsToDocument(parsed);
      } catch (error) {
        console.error('Error loading accessibility settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('crisisAccessibilitySettings', JSON.stringify(settings));
    applySettingsToDocument(settings);
  }, [settings]);

  const applySettingsToDocument = (settings: AccessibilitySettings) => {
    const html = document.documentElement;
    
    // Apply large panic button mode
    html.classList.toggle('large-panic-mode', settings.largePanicButton);
    
    // Apply high contrast crisis mode
    html.setAttribute('data-crisis-high-contrast', settings.highContrastCrisis.toString());
    
    // Apply simplified crisis mode
    html.classList.toggle('simplified-crisis-mode', settings.simplifiedCrisisMode);
  };

  const updateSetting = (key: keyof AccessibilitySettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const testVoiceAlert = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance("Voice alerts are working correctly. This is a test message.");
      utterance.rate = 0.8;
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
      toast.success("Voice alert test completed");
    } else {
      toast.error("Speech synthesis not supported in this browser");
    }
  };

  const testHapticFeedback = () => {
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
      toast.success("Haptic feedback test completed");
    } else {
      toast.error("Haptic feedback not supported on this device");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crisis Accessibility</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Large Panic Button */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="large-panic">
              Extra Large Crisis Button
            </Label>
            <p className="text-sm text-muted-foreground">
              Makes panic button fill screen for easier access during crisis
            </p>
          </div>
          <Switch
            id="large-panic"
            checked={settings.largePanicButton}
            onCheckedChange={(checked) => updateSetting('largePanicButton', checked)}
          />
        </div>

        {/* Voice Alerts */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="voice-alerts">
              Voice Crisis Alerts
            </Label>
            <p className="text-sm text-muted-foreground">
              Speak emergency notifications and confirmations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="voice-alerts"
              checked={settings.voiceAlerts}
              onCheckedChange={(checked) => {
                updateSetting('voiceAlerts', checked);
                if (checked) {
                  speechSynthesis.speak(new SpeechSynthesisUtterance("Voice alerts enabled"));
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={testVoiceAlert}
              disabled={!settings.voiceAlerts}
            >
              Test
            </Button>
          </div>
        </div>

        {/* High Contrast Crisis Mode */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="high-contrast">
              High Contrast Crisis Mode
            </Label>
            <p className="text-sm text-muted-foreground">
              Enhanced visibility for crisis buttons and alerts
            </p>
          </div>
          <Switch
            id="high-contrast"
            checked={settings.highContrastCrisis}
            onCheckedChange={(checked) => updateSetting('highContrastCrisis', checked)}
          />
        </div>

        {/* Simplified Crisis Mode */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="simplified-crisis">
              Simplified Crisis Interface
            </Label>
            <p className="text-sm text-muted-foreground">
              Show only essential crisis tools to reduce cognitive load
            </p>
          </div>
          <Switch
            id="simplified-crisis"
            checked={settings.simplifiedCrisisMode}
            onCheckedChange={(checked) => updateSetting('simplifiedCrisisMode', checked)}
          />
        </div>

        {/* Haptic Feedback */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="haptic-feedback">
              Haptic Feedback
            </Label>
            <p className="text-sm text-muted-foreground">
              Vibration patterns for crisis alerts and confirmations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="haptic-feedback"
              checked={settings.hapticFeedback}
              onCheckedChange={(checked) => updateSetting('hapticFeedback', checked)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={testHapticFeedback}
              disabled={!settings.hapticFeedback}
            >
              Test
            </Button>
          </div>
        </div>

        {/* Reset to Defaults */}
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              const defaultSettings = {
                largePanicButton: true,
                voiceAlerts: true,
                highContrastCrisis: true,
                simplifiedCrisisMode: false,
                hapticFeedback: true
              };
              setSettings(defaultSettings);
              toast.success("Settings reset to defaults");
            }}
          >
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CrisisAccessibilitySettings;
