
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
    const _savedSettings = localStorage.getItem('crisisAccessibilitySettings');
    if (_savedSettings) {
      try {
        const _parsed = JSON.parse(_savedSettings);
        setSettings(_parsed);
        
        // Apply settings to document
        applySettingsToDocument(_parsed);
      } catch (_error) {
        console._error('Error loading accessibility settings:', _error);
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
      const _utterance = new SpeechSynthesisUtterance("Voice alerts are working correctly. This is a test message.");
      _utterance.rate = 0.8;
      _utterance.volume = 0.8;
      speechSynthesis.speak(_utterance);
      toast.success("Voice alert test completed");
    } else {
      toast._error("Speech synthesis not supported in this browser");
    }
  };

  const testHapticFeedback = () => {
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
      toast.success("Haptic feedback test completed");
    } else {
      toast._error("Haptic feedback not supported on this device");
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
            _checked={settings.largePanicButton}
            onCheckedChange={(_checked) => updateSetting('largePanicButton', _checked)}
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
              _checked={settings.voiceAlerts}
              onCheckedChange={(_checked) => {
                updateSetting('voiceAlerts', _checked);
                if (_checked) {
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
            _checked={settings.highContrastCrisis}
            onCheckedChange={(_checked) => updateSetting('highContrastCrisis', _checked)}
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
            _checked={settings.simplifiedCrisisMode}
            onCheckedChange={(_checked) => updateSetting('simplifiedCrisisMode', _checked)}
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
              _checked={settings.hapticFeedback}
              onCheckedChange={(_checked) => updateSetting('hapticFeedback', _checked)}
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
              const _defaultSettings = {
                largePanicButton: true,
                voiceAlerts: true,
                highContrastCrisis: true,
                simplifiedCrisisMode: false,
                hapticFeedback: true
              };
              setSettings(_defaultSettings);
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
