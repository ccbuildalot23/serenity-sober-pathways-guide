import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthForm } from '@/components/auth/AuthForm';
import { Heart, Shield, MessageCircle, MapPin, Bell } from 'lucide-react';

const SupporterSignup = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 flex items-center justify-center px-4">
      <div className="max-w-6xl w-full grid md:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="space-y-8">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-6">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">
                Supporter Portal
              </h1>
            </div>
            
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Support Your Loved One's Recovery Journey
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join as a trusted supporter to provide encouragement, receive important updates, 
              and help ensure safety during their recovery process.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <MessageCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Real-Time Communication</h3>
                <p className="text-sm text-muted-foreground">
                  Receive messages and updates from your loved one instantly
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Location Sharing</h3>
                <p className="text-sm text-muted-foreground">
                  View their location when shared for safety and peace of mind
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Bell className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Safety Alerts</h3>
                <p className="text-sm text-muted-foreground">
                  Get notified of important safety events and milestones
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Shield className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Privacy Protected</h3>
                <p className="text-sm text-muted-foreground">
                  Only access information shared with your explicit permission
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth Form */}
        <div className="flex justify-center">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Supporter Access</CardTitle>
              <p className="text-muted-foreground">
                Sign in or create your supporter account
              </p>
            </CardHeader>
            <CardContent>
              <AuthForm initialMode="signin" userType="support_member" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SupporterSignup;