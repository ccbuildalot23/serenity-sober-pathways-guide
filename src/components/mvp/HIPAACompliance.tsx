// MVP Requirement #3: Identify minimum HIPAA compliance requirements for pilot launch

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Shield, 
  Lock, 
  Eye, 
  FileText, 
  Users, 
  Clock, 
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

export const HIPAACompliance = () => {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const complianceAreas = [
    {
      category: "Administrative Safeguards",
      icon: Users,
      color: "text-blue-600",
      requirements: [
        {
          id: "admin-1",
          title: "Security Officer Assignment",
          description: "Designate responsible individual for HIPAA compliance",
          status: "required",
          implemented: false
        },
        {
          id: "admin-2", 
          title: "Workforce Training",
          description: "Train all staff on HIPAA requirements and data handling",
          status: "required",
          implemented: false
        },
        {
          id: "admin-3",
          title: "Access Management",
          description: "Role-based access controls with minimum necessary principle",
          status: "required", 
          implemented: true
        },
        {
          id: "admin-4",
          title: "Contingency Plan",
          description: "Data backup and disaster recovery procedures",
          status: "required",
          implemented: false
        }
      ]
    },
    {
      category: "Physical Safeguards", 
      icon: Lock,
      color: "text-green-600",
      requirements: [
        {
          id: "phys-1",
          title: "Facility Access Controls",
          description: "Secure cloud infrastructure with AWS/Google Cloud compliance",
          status: "required",
          implemented: true
        },
        {
          id: "phys-2",
          title: "Workstation Security",
          description: "Secure development environments and access controls",
          status: "required", 
          implemented: true
        },
        {
          id: "phys-3",
          title: "Device Controls",
          description: "Mobile device management and remote access security",
          status: "recommended",
          implemented: false
        }
      ]
    },
    {
      category: "Technical Safeguards",
      icon: Shield,
      color: "text-purple-600", 
      requirements: [
        {
          id: "tech-1",
          title: "Access Control",
          description: "Unique user authentication and automatic logoff",
          status: "required",
          implemented: true
        },
        {
          id: "tech-2",
          title: "Audit Controls",
          description: "Comprehensive logging of all PHI access and modifications",
          status: "required",
          implemented: true
        },
        {
          id: "tech-3",
          title: "Integrity",
          description: "PHI protection against improper alteration or destruction",
          status: "required",
          implemented: true
        },
        {
          id: "tech-4",
          title: "Transmission Security",
          description: "End-to-end encryption for all data in transit",
          status: "required",
          implemented: true
        }
      ]
    }
  ];

  const handleCheckToggle = (id: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getStatusBadge = (status: string, implemented: boolean) => {
    if (implemented) {
      return <Badge className="bg-green-100 text-green-800">Implemented</Badge>;
    }
    
    switch (status) {
      case 'required':
        return <Badge variant="destructive">Required</Badge>;
      case 'recommended':
        return <Badge variant="secondary">Recommended</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const totalRequirements = complianceAreas.reduce((sum, area) => sum + area.requirements.length, 0);
  const implementedCount = complianceAreas.reduce((sum, area) => 
    sum + area.requirements.filter(req => req.implemented).length, 0);
  const requiredCount = complianceAreas.reduce((sum, area) => 
    sum + area.requirements.filter(req => req.status === 'required').length, 0);
  const implementedRequired = complianceAreas.reduce((sum, area) => 
    sum + area.requirements.filter(req => req.status === 'required' && req.implemented).length, 0);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          HIPAA Compliance Requirements
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Minimum requirements for pilot launch of healthcare technology
        </p>
      </div>

      {/* Compliance Overview */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Shield className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.round((implementedRequired / requiredCount) * 100)}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Required Items Complete
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {implementedCount}/{totalRequirements}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total Implementation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-orange-600" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {requiredCount - implementedRequired}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Critical Items Pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              30
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Days to Launch
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Requirements */}
      <div className="space-y-6">
        {complianceAreas.map((area, index) => {
          const IconComponent = area.icon;
          return (
            <Card key={index}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${area.color}`}>
                  <IconComponent className="w-5 h-5" />
                  {area.category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {area.requirements.map((req) => (
                    <div key={req.id} className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <Checkbox
                        id={req.id}
                        checked={checkedItems[req.id] || req.implemented}
                        onCheckedChange={() => handleCheckToggle(req.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {req.title}
                          </h4>
                          {getStatusBadge(req.status, req.implemented)}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {req.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Business Associate Agreement Requirements */}
      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
        <CardHeader>
          <CardTitle className="text-orange-700 dark:text-orange-300 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Business Associate Agreements (BAAs) Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              The following third-party services require signed BAAs before pilot launch:
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                <span className="text-sm">Cloud Infrastructure Provider (AWS/Google Cloud/Azure)</span>
                <Badge variant="outline">Required</Badge>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                <span className="text-sm">AI/ML Service Provider (OpenAI)</span>
                <Badge variant="outline">Required</Badge>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                <span className="text-sm">Database Provider (Supabase)</span>
                <Badge variant="outline">Required</Badge>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                <span className="text-sm">Analytics Provider (if used)</span>
                <Badge variant="secondary">Conditional</Badge>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Action Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Pre-Launch Action Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Immediate Actions (Week 1)</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  Designate HIPAA Security Officer
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  Complete workforce training
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  Finalize BAA agreements
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  Implement contingency plan
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">Ongoing Requirements</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  Monthly security reviews
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  Quarterly compliance audits
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  Annual risk assessments
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  Continuous monitoring
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};