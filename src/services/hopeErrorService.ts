// Hope Error Service - Even errors can be encouraging

import { toast } from 'sonner';

// Error messages that don't make people feel worse
const hopeErrorMessages = {
  network: [
    "Connection hiccup. You're still worthy of recovery.",
    "Can't connect right now. Your progress is still real.",
    "Internet issues happen. Your recovery doesn't depend on WiFi.",
    "Offline? Your strength is always online.",
    "Connection lost, but you're not. Try again in a moment."
  ],
  
  auth: [
    "Let's try signing in again. You belong here.",
    "Sign-in hiccup. You're always welcome here.",
    "Authentication issue. Your recovery is still valid.",
    "Can't verify right now. You matter regardless.",
    "Login trouble? Your journey continues either way."
  ],
  
  save: [
    "Couldn't save that. Your effort still counts.",
    "Save failed, but your progress didn't.",
    "Technical issue. Your work isn't lost - try again.",
    "Can't save right now. Screenshot if important.",
    "Save error. Your recovery isn't dependent on technology."
  ],
  
  load: [
    "Taking a moment to load. Patience is recovery too.",
    "Loading slowly. Good things take time.",
    "Can't load that. Let's try something else.",
    "Content unavailable. You have everything you need within.",
    "Loading error. Your recovery loads perfectly every day."
  ],
  
  general: [
    "Something went wrong. You're still doing things right.",
    "Technical difficulty. Human resilience remains.",
    "Error occurred. Your recovery didn't.",
    "Oops. Even apps aren't perfect. You don't have to be either.",
    "Glitch in the app, not in your recovery."
  ]
};

// Supportive error handling
class HopeErrorService {
  // Handle errors with compassion
  handleError(error: Error | unknown, type: 'network' | 'auth' | 'save' | 'load' | 'general' = 'general') {
    console.error('Error occurred:', error);
    
    const messages = hopeErrorMessages[type];
    const _message = messages[Math.floor(Math.random() * messages.length)];
    
    toast.error(_message, {
      duration: 4000,
      _action: {
        label: 'Dismiss',
        _onClick: () => console.log('Dismissed')
      }
    });
    
    // Log for debugging without exposing technical details to user
    if (process.env.NODE_ENV === 'development') {
      console.error('Full error details:', error);
    }
  }
  
  // Network error handler
  handleNetworkError(error?: Error) {
    this.handleError(error, 'network');
    
    // If offline, show offline toolkit reminder
    if (!navigator.onLine) {
      setTimeout(() => {
        toast.info('📱 Reminder: Crisis toolkit works offline. Screenshot important pages.', {
          duration: 6000
        });
      }, 2000);
    }
  }
  
  // Auth error handler
  handleAuthError(error?: Error) {
    this.handleError(error, 'auth');
    
    // Offer anonymous options
    setTimeout(() => {
      toast.info('💙 You can use many features without signing in.', {
        duration: 5000
      });
    }, 2000);
  }
  
  // Save error handler
  handleSaveError(error?: Error) {
    this.handleError(error, 'save');
  }
  
  // Load error handler
  handleLoadError(error?: Error) {
    this.handleError(error, 'load');
  }
  
  // Validation error with compassion
  handleValidationError(field: string, issue: string) {
    const messages = {
      phone: "Phone number format issue. It's okay, try again.",
      email: "Email format issue. No judgment, just try again.",
      password: "Password requirement not met. You've got this.",
      required: `${field} is needed. Take your time.`,
      default: "Input issue. Mistakes are part of being human."
    };
    
    toast.error(messages[issue as keyof typeof messages] || messages.default, {
      duration: 3000
    });
  }
  
  // API error handler
  handleApiError(status: number, _message?: string) {
    if (status === 404) {
      toast.error("Can't find that right now. Let's try another path.", {
        duration: 3000
      });
    } else if (status === 401) {
      this.handleAuthError();
    } else if (status === 500) {
      toast.error("Server hiccup. Your recovery is still on track.", {
        duration: 4000
      });
    } else if (status === 429) {
      toast.error("Taking a breather. Try again in a moment. Patience is progress.", {
        duration: 5000
      });
    } else {
      this.handleError(new Error(_message), 'general');
    }
  }
  
  // Success with encouragement
  handleSuccess(_action: string) {
    const messages = {
      save: "Saved! You're building something beautiful.",
      update: "Updated! Progress, not perfection.",
      delete: "Removed. Making space for better things.",
      send: "Sent! Connection is the opposite of addiction.",
      complete: "Complete! Look at you go!",
      default: "Success! You're doing great things."
    };
    
    toast.success(messages[_action as keyof typeof messages] || messages.default, {
      duration: 3000
    });
  }
}

export const hopeError = new HopeErrorService();

// Global error boundary _message
export const getErrorBoundaryMessage = (): string => {
  const messages = [
    "Something went wrong, but you didn't. Refresh when ready.",
    "Technical issue. Your recovery remains unshaken.",
    "App error. Human spirit remains unbroken.",
    "Glitch detected. Your progress is still protected.",
    "Error occurred. Your journey continues."
  ];
  
  return messages[Math.floor(Math.random() * messages.length)];
};

// Offline _message
export const getOfflineMessage = (): string => {
  return "You're offline. Crisis tools still work. Your recovery doesn't need internet.";
};

// Loading messages
export const getLoadingMessage = (): string => {
  const messages = [
    "Loading your safe space...",
    "Preparing your recovery tools...",
    "Almost there...",
    "Setting up your support...",
    "Creating your sanctuary..."
  ];
  
  return messages[Math.floor(Math.random() * messages.length)];
};