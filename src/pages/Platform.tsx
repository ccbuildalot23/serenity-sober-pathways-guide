import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Eye, AlertTriangle, CheckCircle, BarChart3, Users, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

const Platform = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-sm"></div>
            </div>
            <span className="text-xl font-semibold text-foreground">Serenity</span>
          </Link>
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/platform" className="text-primary font-medium">
              Platform
            </Link>
            <Link to="/providers" className="text-muted-foreground hover:text-foreground transition-colors">
              For Providers
            </Link>
            <Link to="/pilot" className="text-muted-foreground hover:text-foreground transition-colors">
              Pilot Program
            </Link>
            <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
              Get Involved
            </Link>
            <Button variant="outline" asChild>
              <Link to="/provider-signup">Provider Access</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            How Serenity Works
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Clinical-grade monitoring and support tools that bridge the gap between provider sessions
          </p>
        </div>

        {/* Dashboard Mockup Placeholder */}
        <div className="bg-muted/20 border border-border rounded-lg p-8 mb-16">
          <div className="bg-background rounded shadow-lg p-6">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="w-16 h-16 mx-auto mb-4" />
              <p className="text-lg">Clinical Dashboard Preview</p>
              <p className="text-sm">Real-time patient monitoring and engagement metrics</p>
            </div>
          </div>
        </div>
      </section>

      {/* The Challenge */}
      <section className="bg-muted/20 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            The Challenge in Recovery Care
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="text-center border-0 shadow-lg">
              <CardHeader>
                <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <CardTitle className="text-destructive">Treatment Gaps</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive mb-2">7 days</p>
                <p className="text-muted-foreground">Average gap between therapy sessions with no support</p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg">
              <CardHeader>
                <BarChart3 className="w-12 h-12 text-destructive mx-auto mb-4" />
                <CardTitle className="text-destructive">Revenue Loss</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive mb-2">$90K</p>
                <p className="text-muted-foreground">Average annual revenue lost per provider through referrals</p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg">
              <CardHeader>
                <Users className="w-12 h-12 text-destructive mx-auto mb-4" />
                <CardTitle className="text-destructive">Readmissions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive mb-2">40%</p>
                <p className="text-muted-foreground">30-day readmission rate without continuous monitoring</p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Calculator Widget */}
          <Card className="max-w-2xl mx-auto border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary text-center">Revenue Loss Calculator</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                Calculate how much revenue your practice loses annually by referring substance abuse cases
              </p>
              <Button asChild>
                <Link to="/providers#calculator">Calculate Your ROI</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Our Solution */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-foreground text-center mb-12">
          Our Clinical Solution
        </h2>

        {/* Three-Tier System */}
        <div className="bg-muted/20 rounded-lg p-8 mb-12">
          <h3 className="text-xl font-semibold text-foreground text-center mb-8">
            Three-Tier Permission System
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">Provider Access</h4>
              <p className="text-sm text-muted-foreground">Full clinical dashboard with billing optimization</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">Patient Portal</h4>
              <p className="text-sm text-muted-foreground">Daily check-ins and anonymous crisis support</p>
              <Button className="w-full mt-4" asChild>
                <Link to="/auth">Access Patient Portal</Link>
              </Button>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">Support Network</h4>
              <p className="text-sm text-muted-foreground">Family and supporter educational resources</p>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-primary">Daily Check-ins</CardTitle>
                <Badge variant="secondary">For Recovery & Providers</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                PHQ-9 and GAD-7 integrated assessments with automated scoring and trend analysis
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Evidence-based clinical assessments</li>
                <li>• Automated billing code generation (99490, 99439)</li>
                <li>• Real-time crisis detection</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-primary">Provider Dashboard</CardTitle>
                <Badge variant="secondary">For Providers</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Clinical insights and billing optimization for Medicare chronic care management
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Patient engagement metrics</li>
                <li>• Automated documentation</li>
                <li>• Revenue optimization alerts</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-primary">Crisis Support Network</CardTitle>
                <Badge variant="outline">For All Users</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Anonymous crisis alerts and 24/7 support coordination with emergency protocols
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Anonymous crisis detection</li>
                <li>• Emergency protocol activation</li>
                <li>• Family notification system</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-primary">Community Support</CardTitle>
                <Badge variant="outline">For Recovery & Supporters</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Peer support networks and educational resources for families and supporters
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Anonymous peer connections</li>
                <li>• Educational resource library</li>
                <li>• Communication guidelines</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Security & Compliance */}
      <section className="bg-muted/20 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            Security & Compliance
          </h2>
          
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="text-center border-0 shadow-lg">
              <CardHeader>
                <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
                <CardTitle className="text-sm">HIPAA Compliant</CardTitle>
              </CardHeader>
              <CardContent>
                <CheckCircle className="w-6 h-6 text-accent mx-auto" />
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg">
              <CardHeader>
                <Lock className="w-12 h-12 text-primary mx-auto mb-4" />
                <CardTitle className="text-sm">SOC 2 Type II</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg">
              <CardHeader>
                <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
                <CardTitle className="text-sm">256-bit Encryption</CardTitle>
              </CardHeader>
              <CardContent>
                <CheckCircle className="w-6 h-6 text-accent mx-auto" />
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg">
              <CardHeader>
                <Eye className="w-12 h-12 text-primary mx-auto mb-4" />
                <CardTitle className="text-sm">Zero-Knowledge</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Sensitive Data</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-6">
          Ready to Transform Your Practice?
        </h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Schedule a clinical demonstration to see how Serenity can improve patient outcomes and practice revenue
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild>
            <Link to="/providers">Schedule Demo</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/pilot">Join Pilot Program</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold text-foreground mb-4">Platform</h3>
              <div className="space-y-2">
                <Link to="/platform" className="block text-muted-foreground hover:text-foreground transition-colors">
                  How It Works
                </Link>
                <span className="block text-muted-foreground">Security</span>
                <Link to="/providers#pricing" className="block text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </Link>
                <Link to="/auth" className="block text-muted-foreground hover:text-foreground transition-colors">
                  Login
                </Link>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4">Company</h3>
              <div className="space-y-2">
                <Link to="/contact" className="block text-muted-foreground hover:text-foreground transition-colors">
                  About Us
                </Link>
                <Link to="/pilot" className="block text-muted-foreground hover:text-foreground transition-colors">
                  Pilot Program
                </Link>
                <Link to="/contact" className="block text-muted-foreground hover:text-foreground transition-colors">
                  Careers
                </Link>
                <Link to="/contact" className="block text-muted-foreground hover:text-foreground transition-colors">
                  Contact
                </Link>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4">Resources</h3>
              <div className="space-y-2">
                <span className="block text-muted-foreground">Blog</span>
                <span className="block text-muted-foreground">Research</span>
                <span className="block text-muted-foreground">Support</span>
                <span className="block text-muted-foreground">FAQ</span>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4">Legal</h3>
              <div className="space-y-2">
                <span className="block text-muted-foreground">Privacy Policy</span>
                <span className="block text-muted-foreground">Terms of Service</span>
                <span className="block text-muted-foreground">HIPAA Notice</span>
                <span className="block text-muted-foreground">Security</span>
              </div>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center">
            <p className="text-muted-foreground">
              © 2025 Check-In Solutions LLC - Building recovery technology with lived experience
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Platform;