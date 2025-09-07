import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Heart, 
  Phone, 
  MessageSquare, 
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Users,
  Shield,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface SupportAlert {
  id: string;
  timestamp: Date;
  level: 'low' | 'medium' | 'high' | 'critical';
  category: 'emotional' | 'practical' | 'crisis' | 'celebration';
  acknowledged: boolean;
  acknowledgedBy: string[];
  escalationTimer?: number;
  isAnonymous: boolean;
}

interface SupporterView {
  alertId: string;
  message: string;
  actionOptions: string[];
  timeRemaining?: number;
}

const ESCALATION_TIMES = {
  low: 24 * 60 * 60 * 1000, // 24 hours
  medium: 2 * 60 * 60 * 1000, // 2 hours
  high: 30 * 60 * 1000, // 30 minutes
  critical: 10 * 60 * 1000 // 10 minutes
};

const ALERT_MESSAGES = {
  emotional: {
    supporter: 'Someone in your support network could use some encouragement',
    provider: 'Patient experiencing emotional distress',
    icon: <Heart className="h-5 w-5" />,
    color: 'bg-blue-500'
  },
  practical: {
    supporter: 'A member of your network needs practical support',
    provider: 'Patient requires assistance with daily activities',
    icon: <Users className="h-5 w-5" />,
    color: 'bg-green-500'
  },
  crisis: {
    supporter: 'Urgent: Someone needs immediate support',
    provider: 'Crisis alert - immediate intervention required',
    icon: <AlertCircle className="h-5 w-5" />,
    color: 'bg-red-500'
  },
  celebration: {
    supporter: 'Someone reached a milestone! Show your support',
    provider: 'Patient achieved recovery milestone',
    icon: <CheckCircle className="h-5 w-5" />,
    color: 'bg-purple-500'
  }
};

export function PrivacyPreservingAlert() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<SupportAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<SupportAlert | null>(null);
  const [supportMessage, setSupportMessage] = useState('');
  const [showingProviderView, setShowingProviderView] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<{ [key: string]: number }>({});

  // Simulate receiving alerts
  useEffect(() => {
    // Demo data for testing
    const demoAlerts: SupportAlert[] = [
      {
        id: 'alert-1',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        level: 'medium',
        category: 'emotional',
        acknowledged: false,
        acknowledgedBy: [],
        escalationTimer: ESCALATION_TIMES.medium,
        isAnonymous: true
      },
      {
        id: 'alert-2',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        level: 'low',
        category: 'celebration',
        acknowledged: true,
        acknowledgedBy: ['supporter-1', 'supporter-2'],
        isAnonymous: true
      }
    ];
    setAlerts(demoAlerts);
  }, []);

  // Update escalation timers
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newTimeRemaining: { [key: string]: number } = {};
      
      alerts.forEach(alert => {
        if (!alert.acknowledged && alert.escalationTimer) {
          const elapsed = now - alert.timestamp.getTime();
          const remaining = alert.escalationTimer - elapsed;
          
          if (remaining > 0) {
            newTimeRemaining[alert.id] = remaining;
          } else {
            // Escalate alert
            handleEscalation(alert);
          }
        }
      });
      
      setTimeRemaining(newTimeRemaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [alerts]);

  const handleEscalation = (alert: SupportAlert) => {
    // Escalate to next level
    const escalationLevels = ['low', 'medium', 'high', 'critical'];
    const currentIndex = escalationLevels.indexOf(alert.level);
    
    if (currentIndex < escalationLevels.length - 1) {
      const newLevel = escalationLevels[currentIndex + 1] as SupportAlert['level'];
      
      setAlerts(prev => prev.map(a => 
        a.id === alert.id 
          ? { ...a, level: newLevel, escalationTimer: ESCALATION_TIMES[newLevel] }
          : a
      ));
      
      toast.warning(`Alert escalated to ${newLevel} priority`);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId
        ? { ...alert, acknowledged: true, acknowledgedBy: [...alert.acknowledgedBy, user?.id || 'anonymous'] }
        : alert
    ));
    
    toast.success('Alert acknowledged - thank you for responding');
  };

  const handleSendSupport = async () => {
    if (!selectedAlert || !supportMessage.trim()) return;
    
    // Send anonymous support message
    try {
      // API call would go here
      toast.success('Your support message has been sent');
      setSupportMessage('');
      setSelectedAlert(null);
    } catch (error) {
      toast.error('Failed to send support message');
    }
  };

  const formatTimeRemaining = (ms: number): string => {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((ms % (60 * 1000)) / 1000);
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const getLevelBadgeVariant = (level: SupportAlert['level']) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Privacy Notice */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Privacy Protected:</strong> All alerts are anonymized to protect patient privacy. 
          No personal health information (PHI) is shared with supporters.
        </AlertDescription>
      </Alert>

      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Support Network Alerts
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowingProviderView(!showingProviderView)}
            >
              {showingProviderView ? 'Supporter View' : 'Provider View'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No active alerts</p>
              </div>
            ) : (
              <AnimatePresence>
                {alerts.map((alert) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`p-4 rounded-lg border ${alert.acknowledged ? 'bg-muted/50' : 'bg-background'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-2 rounded-full ${ALERT_MESSAGES[alert.category].color} text-white`}>
                            {ALERT_MESSAGES[alert.category].icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={getLevelBadgeVariant(alert.level)}>
                                {alert.level} priority
                              </Badge>
                              {alert.isAnonymous && (
                                <Badge variant="outline" className="gap-1">
                                  <Lock className="h-3 w-3" />
                                  Anonymous
                                </Badge>
                              )}
                              {alert.acknowledged && (
                                <Badge variant="outline" className="gap-1 text-green-600">
                                  <CheckCircle className="h-3 w-3" />
                                  Acknowledged
                                </Badge>
                              )}
                            </div>
                            <p className="mt-2 text-sm font-medium">
                              {showingProviderView 
                                ? ALERT_MESSAGES[alert.category].provider
                                : ALERT_MESSAGES[alert.category].supporter
                              }
                            </p>
                          </div>
                        </div>

                        {/* Escalation Timer */}
                        {!alert.acknowledged && timeRemaining[alert.id] && (
                          <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>Escalates in {formatTimeRemaining(timeRemaining[alert.id])}</span>
                          </div>
                        )}

                        {/* Acknowledged By */}
                        {alert.acknowledgedBy.length > 0 && (
                          <div className="flex items-center gap-2 mt-3">
                            <span className="text-sm text-muted-foreground">Responded by:</span>
                            <div className="flex -space-x-2">
                              {alert.acknowledgedBy.slice(0, 3).map((id, idx) => (
                                <Avatar key={idx} className="h-6 w-6 border-2 border-background">
                                  <AvatarFallback className="text-xs">
                                    S{idx + 1}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {alert.acknowledgedBy.length > 3 && (
                                <Badge variant="secondary" className="ml-2">
                                  +{alert.acknowledgedBy.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 ml-4">
                        {!alert.acknowledged && (
                          <Button
                            size="sm"
                            onClick={() => handleAcknowledge(alert.id)}
                          >
                            Acknowledge
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedAlert(alert)}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Send Support
                        </Button>
                        {alert.level === 'critical' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => window.location.href = 'tel:988'}
                          >
                            <Phone className="h-4 w-4 mr-1" />
                            Call Now
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Send Support Modal */}
      <AnimatePresence>
        {selectedAlert && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setSelectedAlert(null)}
          >
            <Card 
              className="w-full max-w-md" 
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <CardTitle>Send Anonymous Support</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Lock className="h-4 w-4" />
                  <AlertDescription>
                    Your message will be delivered anonymously. The recipient won't know who sent it.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Quick Messages</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      "Thinking of you today",
                      "You've got this!",
                      "Here if you need anything",
                      "Proud of your progress"
                    ].map((msg) => (
                      <Button
                        key={msg}
                        variant="outline"
                        size="sm"
                        onClick={() => setSupportMessage(msg)}
                      >
                        {msg}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium">
                    Personal Message
                  </label>
                  <Textarea
                    id="message"
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Write a supportive message..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedAlert(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSendSupport}
                    disabled={!supportMessage.trim()}
                  >
                    Send Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}