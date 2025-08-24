import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Phone, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, _errorInfo: ErrorInfo) => void;
  isolate?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  _errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class HealthcareErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      _errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, _errorInfo);
    
    this.logErrorToSupabase(error, _errorInfo);
    this.props.onError?.(error, _errorInfo);
    
    this.setState(prevState => ({
      _errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    if (this.state.errorCount >= 3) {
      this.autoRecover();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private async logErrorToSupabase(error: Error, _errorInfo: ErrorInfo) {
    try {
      if (import.meta.env.VITE_ENABLE_AUDIT !== 'true') return;
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('audit_logs').insert({
        user_id: user?.id || '00000000-0000-0000-0000-000000000000',
        _action: 'ERROR_BOUNDARY_CAUGHT',
        _details_encrypted: JSON.stringify({
          error_message: error.message,
          _error_stack: error.stack,
          _component_stack: _errorInfo.componentStack,
          _app_version: '1.0.0',
          _user_agent: navigator.userAgent,
          _url: window.location.href
        })
      });
    } catch (_logError) {
      console.error('Failed to log error to Supabase:', _logError);
    }
  }

  private autoRecover = () => {
    this.resetTimeoutId = setTimeout(() => {
      this.resetError();
    }, 5000);
  };

  private resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      _errorInfo: null,
      errorCount: 0
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  private handleEmergencyContact = () => {
    window.location.href = 'tel:988';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      const { error, errorCount } = this.state;
      const showDetails = (() => {
        try {
          const params = new URLSearchParams(window.location.search);
          return process.env.NODE_ENV === 'development' || params.has('debug');
        } catch {
          return process.env.NODE_ENV === 'development';
        }
      })();
      const isCriticalError = error?.message?.toLowerCase().includes('crisis') ||
                             error?.message?.toLowerCase().includes('emergency');

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50" data-error-boundary>
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <AlertTriangle className="w-6 h-6 mr-2" />
                {isCriticalError ? 'Critical Error' : 'Something went wrong'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                 <AlertDescription>
                  {isCriticalError 
                    ? 'A critical error occurred. Your data is safe, but you may need to refresh.'
                    : 'An unexpected error occurred. This has been reported to our team.'}
                  <div className="sr-only" aria-live="assertive">
                    {error?.message}
                  </div>
                 </AlertDescription>
              </Alert>

              {showDetails && error && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-gray-600">
                    Error details (Development only)
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                    {error.toString()}
                    {this.state._errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              {errorCount > 1 && (
                <Alert>
                  <AlertDescription>
                    This error has occurred {errorCount} times. 
                    {errorCount >= 3 && ' Auto-recovery will activate in 5 seconds.'}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-2">
                <Button onClick={this.resetError} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                
                <Button onClick={this.handleGoHome} variant="outline" className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Button>

                {isCriticalError && (
                  <Button 
                    onClick={this.handleEmergencyContact} 
                    variant="destructive" 
                    className="w-full"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Crisis Support: 988
                  </Button>
                )}
              </div>

              <div className="text-sm text-gray-600 text-center pt-4 border-t">
                <p>If this problem persists, please contact support.</p>
                {this.props.isolate && (
                  <p className="mt-1">The rest of the application is still functional.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const ComponentWithErrorBoundary = (props: P) => (
    <HealthcareErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </HealthcareErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = 
    `withErrorBoundary(${Component.displayName || Component.name})`;

  return ComponentWithErrorBoundary;
}