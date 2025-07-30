import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Stethoscope, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { AuthForm } from "@/components/auth/AuthForm";
import { ProviderRegistrationForm } from "@/components/auth/ProviderRegistrationForm";
import { useAuth } from "@/contexts/AuthContext";

const ProviderSignup = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-sm"></div>
            </div>
            <span className="text-xl font-semibold text-foreground">Serenity</span>
          </Link>
          <div className="flex items-center space-x-4">
            <Link to="/auth" className="text-muted-foreground hover:text-foreground transition-colors">
              Patient Login
            </Link>
            <Badge variant="outline" className="bg-primary/10">
              <Stethoscope className="w-3 h-3 mr-1" />
              Provider Portal
            </Badge>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-6">
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Healthcare Provider Access
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join Serenity's clinical platform to monitor patient recovery, optimize billing, 
              and improve outcomes with evidence-based tools.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Benefits Column */}
            <div className="space-y-6">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-primary">
                    <Shield className="w-6 h-6" />
                    HIPAA Compliant Platform
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <span>Enterprise-grade security and encryption</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <span>Complete audit trails for compliance</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <span>Secure patient data management</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-secondary">
                    <Users className="w-6 h-6" />
                    Clinical Dashboard Features
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-secondary rounded-full mt-2 flex-shrink-0"></div>
                      <span>Real-time patient monitoring and alerts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-secondary rounded-full mt-2 flex-shrink-0"></div>
                      <span>Automated PHQ-9 and GAD-7 scoring</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-secondary rounded-full mt-2 flex-shrink-0"></div>
                      <span>Medicare billing code generation (99490, 99439)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-secondary rounded-full mt-2 flex-shrink-0"></div>
                      <span>Crisis detection and intervention protocols</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <div className="bg-accent/10 border border-accent/20 rounded-lg p-6">
                <h3 className="font-semibold text-accent mb-2">Clinical Pilot Program</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Join our pilot program for 6 months of complimentary access and help shape 
                  the future of recovery support technology.
                </p>
                <Link 
                  to="/pilot" 
                  className="text-accent hover:text-accent/80 font-medium text-sm"
                >
                  Learn more about pilot benefits →
                </Link>
              </div>
            </div>

            {/* Signup Form Column */}
            <div>
              <Card className="border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-center">Create Provider Account</CardTitle>
                  <p className="text-center text-muted-foreground text-sm">
                    Get instant access to your clinical dashboard
                  </p>
                </CardHeader>
                <CardContent>
                  {!user ? (
                    <>
                      <AuthForm 
                        initialMode="signup"
                        userType="provider"
                      />
                      
                      <div className="mt-6 text-center">
                        <p className="text-sm text-muted-foreground">
                          First create your account, then submit your provider registration request.
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Already have an account?{' '}
                          <Link to="/auth" className="text-primary hover:text-primary/80 font-medium">
                            Sign in here
                          </Link>
                        </p>
                      </div>
                    </>
                  ) : (
                    <ProviderRegistrationForm 
                      onSuccess={() => {
                        window.location.href = '/platform';
                      }}
                    />
                  )}
                </CardContent>
              </Card>

              <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-primary text-sm">
                      Secure Provider Verification
                    </h4>
                    <p className="text-xs text-primary/80 mt-1">
                      Your provider credentials will be verified within 24 hours. 
                      You'll receive full dashboard access upon verification.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderSignup;