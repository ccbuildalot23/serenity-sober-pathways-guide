import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, TrendingUp, Heart, Stethoscope, Hospital, BarChart3, ArrowRight, CircleDollarSign, Users, FlaskConical, Lightbulb } from "lucide-react";
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
          <Button size="lg" variant="ghost" asChild>
            <Link to="/supporter-signup">For Supporters</Link>
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

      {/* Giving Back Section */}
      <section className="bg-gradient-to-br from-primary/5 to-secondary/5 py-20">
        <div className="container mx-auto px-4">
          {/* Hero Statement */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-primary/10 rounded-full px-6 py-2 mb-6">
              <CircleDollarSign className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">5% Pledge</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Every Subscription Funds Breakthrough Research
            </h2>
            <p className="text-xl text-muted-foreground max-w-4xl mx-auto mb-4">
              When providers choose Serenity, they're not just transforming their practice — they're investing in the science that will save lives tomorrow.
            </p>
            <p className="text-lg font-medium text-primary">
              5% of our profits fund the future of recovery. Written into our charter since day one.
            </p>
          </div>

          {/* The Why */}
          <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-8 mb-12 border border-border shadow-lg">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-foreground mb-4">Why We Give Back</h3>
              <p className="text-lg text-muted-foreground italic">
                "Recovery taught us that healing happens in community. Commercial success without giving back is just profit without purpose."
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-foreground mb-3">Our Foundation</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Recovery gave us a second chance at life</li>
                  <li>• We build technology from lived experience</li>
                  <li>• Every feature comes from real recovery insights</li>
                  <li>• Success means lifting others behind us</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-3">Our Mission</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• We measure success in lives transformed, not just revenue</li>
                  <li>• Built by people in recovery, for people seeking recovery</li>
                  <li>• This is how healthcare companies should operate</li>
                  <li>• Every dollar earned is a vote for evidence-based recovery</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Impact Metrics */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="text-center border-0 shadow-lg bg-background/90 backdrop-blur-sm">
              <CardHeader>
                <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
                  <CircleDollarSign className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-primary">Impact Today</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground mb-2">$0</p>
                <p className="text-muted-foreground">Donated to date</p>
                <p className="text-sm text-muted-foreground mt-2">Ready for Year 2 growth</p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg bg-background/90 backdrop-blur-sm">
              <CardHeader>
                <div className="w-16 h-16 bg-secondary rounded-xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-secondary">By 2030</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground mb-2">$1M+</p>
                <p className="text-muted-foreground">Annual research funding</p>
                <p className="text-sm text-muted-foreground mt-2">Projected annual giving</p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg bg-background/90 backdrop-blur-sm">
              <CardHeader>
                <div className="w-16 h-16 bg-accent rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-accent">Future Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground mb-2">20+</p>
                <p className="text-muted-foreground">Researchers funded</p>
                <p className="text-sm text-muted-foreground mt-2">100+ studies, countless breakthroughs</p>
              </CardContent>
            </Card>
          </div>

          {/* Recipients */}
          <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-8 mb-12 border border-border shadow-lg">
            <h3 className="text-2xl font-bold text-foreground text-center mb-8">Where Your Subscription Goes</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-3">
                  <FlaskConical className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">40%</h4>
                <p className="text-sm text-muted-foreground">National Institute on Drug Abuse</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Hospital className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">30%</h4>
                <p className="text-sm text-muted-foreground">Recovery Research Institute at Mass General</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Lightbulb className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">20%</h4>
                <p className="text-sm text-muted-foreground">Addiction Policy Forum Innovation Grants</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/80 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">10%</h4>
                <p className="text-sm text-muted-foreground">Serenity Community Innovation Award</p>
              </div>
            </div>
          </div>

          {/* Circular Flow Diagram */}
          <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-8 mb-12 border border-border shadow-lg">
            <h3 className="text-2xl font-bold text-foreground text-center mb-8">The Circle of Innovation</h3>
            <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-8">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-3">
                  <Stethoscope className="w-8 h-8 text-white" />
                </div>
                <p className="text-sm font-medium text-center">Providers</p>
              </div>
              <ArrowRight className="w-6 h-6 text-muted-foreground rotate-90 md:rotate-0" />
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-3">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <p className="text-sm font-medium text-center">Serenity</p>
              </div>
              <ArrowRight className="w-6 h-6 text-muted-foreground rotate-90 md:rotate-0" />
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-3">
                  <FlaskConical className="w-8 h-8 text-white" />
                </div>
                <p className="text-sm font-medium text-center">Research</p>
              </div>
              <ArrowRight className="w-6 h-6 text-muted-foreground rotate-90 md:rotate-0" />
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-primary/80 rounded-full flex items-center justify-center mb-3">
                  <Lightbulb className="w-8 h-8 text-white" />
                </div>
                <p className="text-sm font-medium text-center">Breakthroughs</p>
              </div>
              <ArrowRight className="w-6 h-6 text-muted-foreground rotate-90 md:rotate-0" />
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-secondary/80 rounded-full flex items-center justify-center mb-3">
                  <Hospital className="w-8 h-8 text-white" />
                </div>
                <p className="text-sm font-medium text-center">Better Treatment</p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Join Providers Who Believe Success Means Giving Back
            </h3>
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              Your subscription directly funds the next treatment breakthrough. Together, we're building an evidence base that works.
            </p>
            <Button size="lg" asChild className="hover:scale-105 transition-transform">
              <Link to="/providers">Start Free Trial</Link>
            </Button>
          </div>
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