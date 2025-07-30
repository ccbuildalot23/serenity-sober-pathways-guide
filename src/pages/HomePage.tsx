import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, TrendingUp, Heart, Stethoscope, Hospital, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-sm"></div>
            </div>
            <span className="text-xl font-semibold text-foreground">Serenity</span>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/platform" className="text-muted-foreground hover:text-foreground transition-colors">
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
      <section className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
          Transforming Recovery Support Through Clinical Innovation
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
          Evidence-based platform enabling providers to expand care while supporting sustained recovery
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild>
            <Link to="/providers">For Healthcare Providers</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/auth">For Individuals & Families</Link>
          </Button>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="border-y border-border bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="flex items-center justify-center space-x-3">
              <Shield className="w-6 h-6 text-primary" />
              <span className="font-medium text-foreground">HIPAA Compliant</span>
            </div>
            <div className="flex items-center justify-center space-x-3">
              <TrendingUp className="w-6 h-6 text-accent" />
              <span className="font-medium text-foreground">85% Pilot Enrollment</span>
            </div>
            <div className="flex items-center justify-center space-x-3">
              <Stethoscope className="w-6 h-6 text-secondary" />
              <span className="font-medium text-foreground">Clinical Advisory Board</span>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="text-center border-0 shadow-lg">
            <CardHeader>
              <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
                <Stethoscope className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-primary">Retain High-Value Patients</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Stop losing $45,000-$135,000 annually in referred substance abuse cases
              </p>
            </CardContent>
          </Card>

          <Card className="text-center border-0 shadow-lg">
            <CardHeader>
              <div className="w-16 h-16 bg-secondary rounded-xl flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-secondary">24/7 Recovery Support</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Evidence-based tools and anonymous crisis support between sessions
              </p>
            </CardContent>
          </Card>

          <Card className="text-center border-0 shadow-lg">
            <CardHeader>
              <div className="w-16 h-16 bg-accent rounded-xl flex items-center justify-center mx-auto mb-4">
                <Hospital className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-accent">Reduce Readmissions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                25% reduction in 30-day readmissions with continuous care
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="bg-muted/20 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-6">
            The Hidden Crisis in Mental Healthcare
          </h2>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 mb-8 inline-block">
            <BarChart3 className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-4xl font-bold text-destructive mb-2">60%</p>
            <p className="text-muted-foreground">of therapists refer substance abuse cases elsewhere</p>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Healthcare providers are losing valuable patients and revenue while individuals in recovery 
            struggle with gaps in care between sessions, leading to higher relapse rates and readmissions.
          </p>
          <Button size="lg" asChild>
            <Link to="/platform">Learn About Our Solution</Link>
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
                <Link to="/platform#security" className="block text-muted-foreground hover:text-foreground transition-colors">
                  Security
                </Link>
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

export default HomePage;