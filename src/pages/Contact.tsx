import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Calendar, Users, Handshake, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";

const Contact = () => {
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
            <Link to="/pilot" className="text-muted-foreground hover:text-foreground transition-colors">
              Pilot Program
            </Link>
            <Link to="/contact" className="text-primary font-medium">
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
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Get Involved with Serenity
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Whether you're a healthcare provider, investor, clinical advisor, or technology partner, 
            we welcome collaboration in transforming recovery support.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Calendar className="w-8 h-8 text-primary" />
                <CardTitle className="text-primary">Healthcare Providers</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Discover how Serenity can help you retain substance abuse patients while improving outcomes 
                and generating additional revenue through evidence-based monitoring.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild className="flex-1">
                  <a href="mailto:chris@serenity-recovery.com?subject=Schedule%20Demo">
                    Schedule a Demo
                  </a>
                </Button>
                <Button variant="outline" asChild className="flex-1">
                  <Link to="/pilot">Join Pilot Program</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Users className="w-8 h-8 text-secondary" />
                <CardTitle className="text-secondary">Investors</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Learn about our mission to transform mental healthcare delivery through technology-assisted 
                recovery support with a proven revenue model for providers.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild className="flex-1">
                  <a href="mailto:chris@serenity-recovery.com?subject=Request%20Pitch%20Deck">
                    Request Pitch Deck
                  </a>
                </Button>
                <Button variant="outline" asChild className="flex-1">
                  <a href="mailto:chris@serenity-recovery.com?subject=Schedule%20Meeting">
                    Schedule Meeting
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Mail className="w-8 h-8 text-accent" />
                <CardTitle className="text-accent">Clinical Advisors</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Share your clinical expertise to help shape evidence-based features and ensure our platform 
                meets the highest standards of care for substance abuse treatment.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild className="flex-1">
                  <a href="mailto:chris@serenity-recovery.com?subject=Share%20Clinical%20Expertise">
                    Share Your Expertise
                  </a>
                </Button>
                <Button variant="outline" asChild className="flex-1">
                  <a href="mailto:chris@serenity-recovery.com?subject=Join%20Advisory%20Board">
                    Join Advisory Board
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Handshake className="w-8 h-8 text-primary" />
                <CardTitle className="text-primary">Technology Partners</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Explore integration opportunities with EMR systems, telehealth platforms, and other healthcare 
                technology solutions to expand our reach and improve provider workflows.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild className="flex-1">
                  <a href="mailto:chris@serenity-recovery.com?subject=Integration%20Opportunities">
                    Integration Opportunities
                  </a>
                </Button>
                <Button variant="outline" asChild className="flex-1">
                  <a href="mailto:chris@serenity-recovery.com?subject=Distribution%20Partnership">
                    Distribution Partnerships
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Founder Contact */}
        <Card className="max-w-2xl mx-auto border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-center text-primary text-2xl">
              Contact Our Founder
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">Christopher Caldwell</h3>
              <p className="text-muted-foreground">Founder & CEO</p>
              <p className="text-muted-foreground">
                Building recovery technology with lived experience and clinical insight
              </p>
            </div>
            
            <div className="space-y-4">
              <Button asChild className="w-full" size="lg">
                <a href="mailto:chris@serenity-recovery.com">
                  <Mail className="w-5 h-5 mr-2" />
                  chris@serenity-recovery.com
                </a>
              </Button>
              
              <Button variant="outline" asChild className="w-full" size="lg">
                <a href="#" target="_blank" rel="noopener noreferrer">
                  <Linkedin className="w-5 h-5 mr-2" />
                  Connect on LinkedIn
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Mission Statement */}
      <section className="bg-muted/20 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Our Mission
          </h2>
          <p className="text-lg text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            At Serenity, we believe that technology can bridge the gap between therapy sessions, 
            providing continuous support for individuals in recovery while enabling healthcare providers 
            to deliver more comprehensive care. Our platform is built with clinical rigor, 
            evidence-based practices, and a deep understanding of both provider workflows and patient needs.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-foreground text-center mb-12">
          What Drives Us
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="text-center border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-primary">Clinical Excellence</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Every feature is designed with clinical evidence and provider input, ensuring 
                the highest standards of care delivery.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-secondary">Privacy & Security</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                HIPAA compliance and zero-knowledge architecture protect the most sensitive 
                patient information while enabling effective care.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-accent">Sustainable Economics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Creating value for providers through revenue optimization while improving 
                patient outcomes creates a sustainable model for expanded access.
              </p>
            </CardContent>
          </Card>
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
                <span className="block text-muted-foreground">About Us</span>
                <Link to="/pilot" className="block text-muted-foreground hover:text-foreground transition-colors">
                  Pilot Program
                </Link>
                <span className="block text-muted-foreground">Careers</span>
                <span className="block text-muted-foreground">Contact</span>
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

export default Contact;