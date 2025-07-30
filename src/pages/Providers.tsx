import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Users, CheckCircle, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

const Providers = () => {
  const [referralsPerMonth, setReferralsPerMonth] = useState("");
  const [patientValue, setPatientValue] = useState("");
  const [roi, setRoi] = useState<{ annual: number; percentage: number } | null>(null);

  const calculateROI = () => {
    const monthly = parseInt(referralsPerMonth) || 0;
    const value = parseInt(patientValue) || 0;
    const annual = monthly * 12 * value * 0.7; // 70% retention with Serenity
    const percentage = annual > 0 ? Math.round((annual / (monthly * 12 * value)) * 100) : 0;
    setRoi({ annual, percentage });
  };

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
            <Link to="/platform" className="text-muted-foreground hover:text-foreground transition-colors">
              Platform
            </Link>
            <Link to="/providers" className="text-primary font-medium">
              For Providers
            </Link>
            <Link to="/pilot" className="text-muted-foreground hover:text-foreground transition-colors">
              Pilot Program
            </Link>
            <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
              Get Involved
            </Link>
            <Button variant="outline" asChild>
              <Link to="/auth">Provider Login</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Maximize Revenue, Improve Outcomes
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Clinical-grade tools that enable you to retain substance abuse patients while providing 
            evidence-based care between sessions
          </p>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="bg-muted/20 py-16" id="calculator">
        <div className="container mx-auto px-4">
          <Card className="max-w-3xl mx-auto border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="text-2xl text-primary text-center">
                Revenue Retention Calculator
              </CardTitle>
              <p className="text-center text-muted-foreground">
                Calculate your potential annual revenue retention with Serenity
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="referrals">Average monthly substance abuse referrals</Label>
                  <Input
                    id="referrals"
                    type="number"
                    placeholder="e.g., 8"
                    value={referralsPerMonth}
                    onChange={(e) => setReferralsPerMonth(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="value">Average patient value</Label>
                  <Select value={patientValue} onValueChange={setPatientValue}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select patient type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2500">Medicare/Medicaid ($2,500)</SelectItem>
                      <SelectItem value="4500">Private Insurance ($4,500)</SelectItem>
                      <SelectItem value="6000">Cash Pay ($6,000)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button onClick={calculateROI} className="w-full" size="lg">
                Calculate Your ROI
              </Button>

              {roi && (
                <div className="bg-accent/10 border border-accent/20 rounded-lg p-6 text-center">
                  <DollarSign className="w-12 h-12 text-accent mx-auto mb-4" />
                  <p className="text-3xl font-bold text-accent mb-2">
                    ${roi.annual.toLocaleString()}
                  </p>
                  <p className="text-lg text-muted-foreground mb-2">
                    Potential annual revenue retention
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {roi.percentage}% of currently referred cases retained
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Evidence Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-foreground text-center mb-12">
          Clinical Evidence & Outcomes
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <Card className="text-center border-0 shadow-lg">
            <CardHeader>
              <TrendingUp className="w-12 h-12 text-accent mx-auto mb-4" />
              <CardTitle className="text-accent">25% Reduction</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">30-day readmissions with continuous monitoring</p>
            </CardContent>
          </Card>

          <Card className="text-center border-0 shadow-lg">
            <CardHeader>
              <Users className="w-12 h-12 text-secondary mx-auto mb-4" />
              <CardTitle className="text-secondary">70% Retention</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Substance abuse patients stay in your practice</p>
            </CardContent>
          </Card>

          <Card className="text-center border-0 shadow-lg">
            <CardHeader>
              <DollarSign className="w-12 h-12 text-primary mx-auto mb-4" />
              <CardTitle className="text-primary">$90K Average</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Annual revenue recovery per provider</p>
            </CardContent>
          </Card>
        </div>

        {/* Testimonials */}
        <div className="bg-muted/20 rounded-lg p-8">
          <h3 className="text-xl font-semibold text-foreground text-center mb-8">
            Early Pilot Feedback
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-0">
              <CardHeader>
                <div className="flex items-center space-x-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>
                <CardTitle className="text-lg">"Game-changing for my practice"</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  "I've retained 8 patients I would have referred out, generating an additional 
                  $36,000 in annual revenue while providing better continuity of care."
                </p>
                <p className="text-sm text-muted-foreground">
                  - Licensed Clinical Social Worker, Private Practice
                </p>
              </CardContent>
            </Card>

            <Card className="border-0">
              <CardHeader>
                <div className="flex items-center space-x-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>
                <CardTitle className="text-lg">"Evidence-based and clinically sound"</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  "The PHQ-9 integration and automated billing codes make this incredibly 
                  valuable for Medicare patients. My documentation time has decreased significantly."
                </p>
                <p className="text-sm text-muted-foreground">
                  - Licensed Professional Counselor, Community Health Center
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-muted/20 py-16" id="pricing">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            Pricing Plans
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-center">Professional</CardTitle>
                <div className="text-center">
                  <span className="text-3xl font-bold text-primary">$299</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2" />
                    <span className="text-sm">Up to 50 patients</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2" />
                    <span className="text-sm">Core monitoring features</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2" />
                    <span className="text-sm">Email support</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2" />
                    <span className="text-sm">Basic billing codes</span>
                  </li>
                </ul>
                <Button className="w-full" variant="outline">
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary shadow-lg">
              <CardHeader>
                <Badge className="w-fit mx-auto mb-2">Most Popular</Badge>
                <CardTitle className="text-xl text-center">Practice</CardTitle>
                <div className="text-center">
                  <span className="text-3xl font-bold text-primary">$599</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2" />
                    <span className="text-sm">Unlimited patients</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2" />
                    <span className="text-sm">Advanced analytics</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2" />
                    <span className="text-sm">Priority support</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2" />
                    <span className="text-sm">EHR integration</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2" />
                    <span className="text-sm">Revenue optimization</span>
                  </li>
                </ul>
                <Button className="w-full">
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-center">Enterprise</CardTitle>
                <div className="text-center">
                  <span className="text-3xl font-bold text-primary">Custom</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2" />
                    <span className="text-sm">Multi-location support</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2" />
                    <span className="text-sm">Dedicated success manager</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2" />
                    <span className="text-sm">Custom training</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2" />
                    <span className="text-sm">API access</span>
                  </li>
                </ul>
                <Button className="w-full" variant="outline">
                  Contact Sales
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Integration Partners */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-foreground text-center mb-12">
          Integration Partners
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="text-center border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="font-semibold text-muted-foreground">SP</span>
              </div>
              <h3 className="font-semibold text-foreground mb-2">SimplePractice</h3>
              <Badge variant="secondary">Available Now</Badge>
            </CardContent>
          </Card>

          <Card className="text-center border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="font-semibold text-muted-foreground">Epic</span>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Epic</h3>
              <Badge variant="outline">Coming 2026</Badge>
            </CardContent>
          </Card>

          <Card className="text-center border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="font-semibold text-muted-foreground">AH</span>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Athenahealth</h3>
              <Badge variant="outline">Coming 2026</Badge>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary/5 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Ready to Schedule a Clinical Demonstration?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            See how Serenity can help your practice retain revenue and improve patient outcomes
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/contact">Schedule Demo</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/pilot">Join Pilot Program</Link>
            </Button>
          </div>
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
                <span className="block text-muted-foreground">Pricing</span>
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

export default Providers;