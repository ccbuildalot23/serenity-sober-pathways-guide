import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Heart, 
  Phone, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  MessageCircle,
  Car,
  Shield,
  Clock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { realtimeNotificationService, NotificationPayload } from '@/services/RealtimeNotificationService';
import { Button } from '@/components/ui/button';

export const CrisisNotificationToasts: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const unsubscribe = realtimeNotificationService.onNotification((notification) => {
      showNotificationToast(notification);
    });

    return unsubscribe;
  }, [user]);

  const showNotificationToast = (notification: NotificationPayload) => {
    const { _type, _severity, title, message, actions } = notification;

    // Choose appropriate icon
    const getIcon = () => {
      switch (_type) {
        case 'crisis_alert':
          return <AlertTriangle className="w-5 h-5" />;
        case 'supporter_response':
          return <MessageCircle className="w-5 h-5" />;
        case 'escalation':
          return <Phone className="w-5 h-5" />;
        case 'resolution':
          return <CheckCircle className="w-5 h-5" />;
        default:
          return <Heart className="w-5 h-5" />;
      }
    };

    // Determine toast styling based on _severity
    const getToastConfig = () => {
      switch (_severity) {
        case 'critical':
          return {
            _duration: Infinity, // Don't auto-dismiss critical alerts
            className: 'border-red-500 bg-red-50',
            style: { borderLeft: '4px solid rgb(239 68 68)' }
          };
        case 'high':
          return {
            _duration: 15000, // 15 seconds
            className: 'border-orange-500 bg-orange-50',
            style: { borderLeft: '4px solid rgb(249 115 22)' }
          };
        case 'medium':
          return {
            _duration: 10000, // 10 seconds
            className: 'border-yellow-500 bg-yellow-50',
            style: { borderLeft: '4px solid rgb(234 179 8)' }
          };
        default:
          return {
            _duration: 7000, // 7 seconds
            className: 'border-blue-500 bg-blue-50',
            style: { borderLeft: '4px solid rgb(59 130 246)' }
          };
      }
    };

    const toastConfig = getToastConfig();

    // Create action buttons if available
    const createActionButtons = () => {
      if (!actions || actions.length === 0) return null;

      return (
        <div className="flex space-x-2 mt-3">
          {actions.slice(0, 2).map((action) => ( // Limit to 2 actions for space
            <Button
              key={action.id}
              size="sm"
              variant={action.primary ? "default" : "outline"}
              onClick={async () => {
                try {
                  await realtimeNotificationService.acknowledgeNotification(
                    notification.id, 
                    `Action: ${action.label}`
                  );
                  
                  toast.success('Response sent', {
                    description: `Your "${action.label}" response has been shared`,
                    _duration: 3000
                  });
                } catch (_error) {
                  toast._error('Unable to respond', {
                    description: 'Please try again',
                    _duration: 3000
                  });
                }
              }}
              className="h-7 px-3 text-xs"
            >
              {action._type === 'acknowledge' && <CheckCircle className="w-3 h-3 mr-1" />}
              {action._type === 'respond' && <Car className="w-3 h-3 mr-1" />}
              {action._type === 'escalate' && <Phone className="w-3 h-3 mr-1" />}
              {action.label}
            </Button>
          ))}
        </div>
      );
    };

    // Show toast with appropriate styling and actions
    if (_type === 'crisis_alert') {
      toast.custom(
        (t) => (
          <div className={`${toastConfig.className} p-4 rounded-lg shadow-lg border-2 bg-white max-w-md`}
               style={toastConfig.style}>
            <div className="flex items-start space-x-3">
              <div className="mt-0.5 text-red-500">
                {getIcon()}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-gray-900 mb-1">
                  {title}
                </h4>
                <p className="text-sm text-gray-700 mb-2 leading-relaxed">
                  {message}
                </p>
                
                {/* Crisis-specific information */}
                <div className="flex items-center space-x-4 text-xs text-gray-600 mb-3">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Just now</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Shield className="w-3 h-3" />
                    <span>Secure & private</span>
                  </div>
                </div>

                {/* Emergency call option for critical alerts */}
                {_severity === 'critical' && (
                  <div className="p-2 bg-red-100 border border-red-200 rounded-lg mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-red-800 font-medium">
                        Need immediate help?
                      </span>
                      <Button
                        size="sm"
                        onClick={() => {
                          window.location.href = 'tel:988';
                          toast.success('Calling 988', {
                            description: 'Crisis Lifeline contacted',
                            _duration: 3000
                          });
                        }}
                        className="h-6 px-2 text-[10px] bg-red-600 hover:bg-red-700"
                      >
                        <Phone className="w-3 h-3 mr-1" />
                        Call 988
                      </Button>
                    </div>
                  </div>
                )}

                {createActionButtons()}
              </div>
            </div>
          </div>
        ),
        {
          id: `crisis-${notification.id}`,
          _duration: toastConfig._duration,
          _position: 'top-center'
        }
      );
    } 
    else if (_type === 'supporter_response') {
      // Supporter response notifications are more gentle
      toast.success(
        <div className="flex items-start space-x-3">
          <div className="text-green-500">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-medium text-sm">{title}</h4>
            <p className="text-sm text-gray-600 mt-1">{message}</p>
            <div className="flex items-center space-x-1 mt-2 text-xs text-gray-500">
              <Shield className="w-3 h-3" />
              <span>Someone is here for you</span>
            </div>
          </div>
        </div>,
        {
          id: `response-${notification.id}`,
          _duration: 8000,
          _position: 'top-right'
        }
      );
    }
    else if (_type === 'escalation') {
      toast.info(
        <div className="flex items-start space-x-3">
          <div className="text-blue-500">
            {getIcon()}
          </div>
          <div>
            <h4 className="font-medium text-sm">{title}</h4>
            <p className="text-sm text-gray-600 mt-1">{message}</p>
            {createActionButtons()}
          </div>
        </div>,
        {
          id: `escalation-${notification.id}`,
          _duration: 12000,
          _position: 'top-center'
        }
      );
    }
    else if (_type === 'resolution') {
      toast.success(
        <div className="flex items-start space-x-3">
          <div className="text-green-500">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-medium text-sm">{title}</h4>
            <p className="text-sm text-gray-600 mt-1">{message}</p>
            <div className="flex items-center space-x-1 mt-2 text-xs text-green-600">
              <Heart className="w-3 h-3" />
              <span>You're safe and supported</span>
            </div>
          </div>
        </div>,
        {
          id: `resolution-${notification.id}`,
          _duration: 10000,
          _position: 'top-center'
        }
      );
    }

    // Add gentle sound notification for critical alerts
    if (_severity === 'critical' && 'Audio' in window) {
      try {
        // Create a gentle notification sound (short beep)
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Gentle frequency
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Quiet volume
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (_error) {
        // Fallback: use system notification sound
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
      }
    }

    // Gentle vibration for mobile devices
    if (_severity !== 'low' && navigator.vibrate) {
      const _pattern = _severity === 'critical' ? [200, 100, 200, 100, 200] : [100, 50, 100];
      navigator.vibrate(_pattern);
    }
  };

  // This component doesn't render any visible UI
  return null;
};