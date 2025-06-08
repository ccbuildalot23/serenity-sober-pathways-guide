
import React from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, MessageSquare, Users, Heart, Clock, Shield } from 'lucide-react';

const Support = () => {
  return (
    <Layout activeTab="support" onTabChange={() => {}}>
      <div className="p-4 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-[#1E3A8A]">Support Network</h1>
          <p className="text-gray-600">Connect with your support system</p>
        </div>

        {/* Emergency Support */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Emergency Support
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <Button className="bg-red-600 hover:bg-red-700 text-white">
                <Phone className="w-4 h-4 mr-2" />
                Call 988 Suicide & Crisis Lifeline
              </Button>
              <Button variant="outline" className="border-red-300 text-red-700">
                <MessageSquare className="w-4 h-4 mr-2" />
                Text HOME to 741741
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Support Circle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Your Support Circle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="font-semibold mb-2">Build Your Support Network</h3>
              <p className="text-sm mb-4">Add trusted friends and family who can support you</p>
              <Button>Add Support Contact</Button>
            </div>
          </CardContent>
        </Card>

        {/* Professional Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Professional Support
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium">Therapist</h4>
                  <p className="text-sm text-gray-600">Not configured</p>
                </div>
                <Button variant="outline" size="sm">Add</Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium">Psychiatrist</h4>
                  <p className="text-sm text-gray-600">Not configured</p>
                </div>
                <Button variant="outline" size="sm">Add</Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium">Support Group</h4>
                  <p className="text-sm text-gray-600">Not configured</p>
                </div>
                <Button variant="outline" size="sm">Add</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recovery Resources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Recovery Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Clock className="w-4 h-4 mr-2" />
              Meeting Finder
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <MessageSquare className="w-4 h-4 mr-2" />
              Online Support Groups
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Heart className="w-4 h-4 mr-2" />
              Sponsor Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Support;
