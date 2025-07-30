import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Calendar, Users, BookOpen, DollarSign, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

const Pilot = () => {
  const [formData, setFormData] = useState({
    name: "",
    credentials: "",
    practice: "",
    email: "",
    phone: "",
    emr: "",
    referrals: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Pilot application submitted:", formData);
    // Handle form submission
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
            <Link to="/providers" className="text-muted-foreground hover:text-foreground transition-colors">
              For Providers
            </Link>
            <Link to="/pilot" className="text-primary font-medium">
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
            Join Our Clinical Pilot Program
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Be among the first providers to access Serenity's clinical-grade recovery support platform
          </p>
          
          {/* Progress Bar */}
          <div className="max-w-md mx-auto">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-foreground">Enrollment Progress</span>
              <span className="text-sm text-muted-foreground">17 of 20 Providers</span>
            </div>
            <Progress value={85} className="h-3" />
            <p className="text-sm text-accent mt-2 font-medium">3 spots remaining</p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-muted/20 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            Pilot Program Benefits
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <DollarSign className="w-8 h-8 text-accent" />
                  <CardTitle className="text-accent">6 Months Complimentary Access</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Full platform access at no cost during the pilot phase, including all premium features 
                  and unlimited patient monitoring.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Users className="w-8 h-8 text-primary" />
                  <CardTitle className="text-primary">Direct Feature Input</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Shape the platform's development with your clinical expertise and specific workflow needs 
                  for substance abuse treatment.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-8 h-8 text-secondary" />
                  <CardTitle className="text-secondary">Co-authorship Opportunities</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Participate in research publications and case studies demonstrating the clinical efficacy 
                  of technology-assisted recovery support.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-8 h-8 text-accent" />
                  <CardTitle className="text-accent">Locked-in Early Adopter Pricing</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Secure preferential pricing for life as an early adopter, with guaranteed rates 
                  below standard commercial pricing.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-foreground text-center mb-12">
          Pilot Program Requirements
        </h2>
        
        <Card className="max-w-3xl mx-auto border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-primary">Eligibility Criteria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-accent mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Licensed Provider</h3>
                <p className="text-sm text-muted-foreground">
                  Licensed mental health professional (LCSW, LPC, LMFT, etc.)
                </p>
              </div>
              
              <div className="text-center">
                <Users className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Active Referrals</h3>
                <p className="text-sm text-muted-foreground">
                  Minimum 10 substance abuse referrals annually
                </p>
              </div>
              
              <div className="text-center">
                <BookOpen className="w-12 h-12 text-secondary mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Outcome Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Commitment to documenting patient outcomes for research
                </p>
              </div>
            </div>
            
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-6">
              <h4 className="font-semibold text-accent mb-2">Additional Preferences:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Experience with technology integration in clinical practice</li>
                <li>• Interest in value-based care models</li>
                <li>• Willingness to provide detailed feedback and participate in interviews</li>
                <li>• Geographic diversity (rural and urban settings preferred)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Timeline */}
      <section className="bg-muted/20 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            Program Timeline
          </h2>
          
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="border-0 shadow-lg relative">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-destructive" />
                    </div>
                    <div>
                      <CardTitle className="text-destructive">August - November 2025</CardTitle>
                      <Badge variant="destructive">Current Phase</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Final enrollment period</li>
                    <li>• Provider onboarding</li>
                    <li>• Initial training sessions</li>
                    <li>• Platform customization</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Clock className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-primary">December 2025</CardTitle>
                      <Badge variant="secondary">Upcoming</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Soft launch with pilot providers</li>
                    <li>• Initial patient enrollment</li>
                    <li>• Real-world testing</li>
                    <li>• Weekly feedback sessions</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <CardTitle className="text-accent">February 2026</CardTitle>
                      <Badge variant="outline">Future</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Full commercial deployment</li>
                    <li>• Outcome data analysis</li>
                    <li>• Research publication prep</li>
                    <li>• Early adopter pricing activated</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-foreground text-center mb-12">
          Apply for the Pilot Program
        </h2>
        
        <Card className="max-w-2xl mx-auto border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-primary">Pilot Application</CardTitle>
            <p className="text-center text-muted-foreground">
              Complete the form below to be considered for our clinical pilot program
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="credentials">Credentials *</Label>
                  <Input
                    id="credentials"
                    placeholder="e.g., LCSW, LPC, LMFT"
                    value={formData.credentials}
                    onChange={(e) => setFormData({...formData, credentials: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="practice">Practice Name *</Label>
                <Input
                  id="practice"
                  value={formData.practice}
                  onChange={(e) => setFormData({...formData, practice: e.target.value})}
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="emr">Current EMR System</Label>
                <Input
                  id="emr"
                  placeholder="e.g., SimplePractice, TherapyNotes, Epic"
                  value={formData.emr}
                  onChange={(e) => setFormData({...formData, emr: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="referrals">Average Monthly Substance Abuse Referrals *</Label>
                <Input
                  id="referrals"
                  type="number"
                  placeholder="e.g., 5"
                  value={formData.referrals}
                  onChange={(e) => setFormData({...formData, referrals: e.target.value})}
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button type="submit" className="flex-1">
                  Submit Application
                </Button>
                <Button type="button" variant="outline" className="flex-1" asChild>
                  <Link to="/contact">Schedule a Demo First</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
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
                <span className="block text-muted-foreground">Pilot Program</span>
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

export default Pilot;