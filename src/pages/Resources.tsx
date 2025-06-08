
import React from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Video, Headphones, FileText, ExternalLink, Star } from 'lucide-react';

const Resources = () => {
  const resources = [
    {
      title: "Understanding Addiction",
      type: "Article",
      duration: "5 min read",
      category: "Education",
      icon: FileText,
      featured: true
    },
    {
      title: "Mindfulness for Recovery",
      type: "Audio",
      duration: "15 min",
      category: "Meditation",
      icon: Headphones,
      featured: false
    },
    {
      title: "Relapse Prevention Strategies",
      type: "Video",
      duration: "20 min",
      category: "Skills",
      icon: Video,
      featured: true
    },
    {
      title: "Building Healthy Relationships",
      type: "Article",
      duration: "8 min read",
      category: "Relationships",
      icon: FileText,
      featured: false
    }
  ];

  const categories = [
    { name: "Education", count: 12, color: "bg-blue-100 text-blue-700" },
    { name: "Skills", count: 8, color: "bg-green-100 text-green-700" },
    { name: "Meditation", count: 6, color: "bg-purple-100 text-purple-700" },
    { name: "Relationships", count: 4, color: "bg-orange-100 text-orange-700" }
  ];

  return (
    <Layout activeTab="resources" onTabChange={() => {}}>
      <div className="p-4 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-[#1E3A8A]">Recovery Resources</h1>
          <p className="text-gray-600">Educational content and tools for your recovery journey</p>
        </div>

        {/* Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Browse by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category) => (
                <Button
                  key={category.name}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start"
                >
                  <div className="w-full flex justify-between items-center">
                    <span className="font-medium">{category.name}</span>
                    <Badge className={category.color}>{category.count}</Badge>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Featured Resources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Featured Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {resources.filter(r => r.featured).map((resource, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <resource.icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{resource.title}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">{resource.type}</Badge>
                        <span className="text-xs text-gray-500">{resource.duration}</span>
                      </div>
                      <Badge className="mt-2 text-xs">{resource.category}</Badge>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* All Resources */}
        <Card>
          <CardHeader>
            <CardTitle>All Resources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {resources.map((resource, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <resource.icon className="w-5 h-5 text-gray-600" />
                  <div>
                    <h4 className="font-medium text-sm">{resource.title}</h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">{resource.type}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{resource.duration}</span>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="ghost">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Resources;
