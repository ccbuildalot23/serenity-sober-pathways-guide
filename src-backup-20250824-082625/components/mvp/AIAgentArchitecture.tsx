// MVP Requirement #2: Map out dual AI agent architecture and training requirements

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, Brain, Shield, Zap, Users, AlertTriangle } from 'lucide-react';

export const AIAgentArchitecture = () => {
  const aiAgents = [
    {
      name: "Recovery Companion Agent",
      role: "Patient Support",
      capabilities: [
        "24/7 Crisis Detection",
        "Personalized Coping Strategies",
        "Progress Tracking",
        "Motivational Messaging"
      ],
      trainingData: [
        "Addiction Recovery Literature",
        "CBT/DBT Therapeutic Approaches", 
        "Crisis Intervention Protocols",
        "De-identified Patient Interactions"
      ],
      hipaaRequirements: [
        "End-to-end encryption",
        "No PII storage",
        "Audit logging",
        "Limited memory retention"
      ]
    },
    {
      name: "Clinical Decision Support Agent",
      role: "Provider Assistance",
      capabilities: [
        "Risk Assessment Analysis",
        "Treatment Plan Optimization",
        "Drug Interaction Checking",
        "Evidence-Based Recommendations"
      ],
      trainingData: [
        "Clinical Guidelines (SAMHSA)",
        "Medical Literature Database",
        "Treatment Outcome Studies",
        "Provider Decision Trees"
      ],
      hipaaRequirements: [
        "Role-based access control",
        "Provider authentication",
        "Clinical audit trails",
        "FDA compliance for medical advice"
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Dual AI Agent Architecture
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          HIPAA-compliant AI system design for recovery support
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {aiAgents.map((agent, index) => (
          <Card key={index} className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                {agent.name}
              </CardTitle>
              <Badge variant="secondary">{agent.role}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4" />
                  Core Capabilities
                </h4>
                <ul className="text-sm space-y-1">
                  {agent.capabilities.map((capability, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      {capability}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4" />
                  Training Requirements
                </h4>
                <ul className="text-sm space-y-1">
                  {agent.trainingData.map((data, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      {data}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4" />
                  HIPAA Requirements
                </h4>
                <ul className="text-sm space-y-1">
                  {agent.hipaaRequirements.map((req, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Implementation Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>MVP Implementation Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">Phase 1: Basic NLP</h4>
              <ul className="text-sm space-y-1">
                <li>• Keyword-based crisis detection</li>
                <li>• Rule-based response system</li>
                <li>• Basic sentiment analysis</li>
                <li>• Pre-approved response templates</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-600">Phase 2: Pattern Recognition</h4>
              <ul className="text-sm space-y-1">
                <li>• Check-in pattern analysis</li>
                <li>• Risk scoring algorithms</li>
                <li>• Personalized interventions</li>
                <li>• Provider alert automation</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-purple-600">Phase 3: Advanced AI</h4>
              <ul className="text-sm space-y-1">
                <li>• Contextual conversation</li>
                <li>• Predictive modeling</li>
                <li>• Treatment optimization</li>
                <li>• Outcome prediction</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Architecture */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Implementation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium mb-2">Data Flow & Security</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Patient Input → Encrypted Processing → HIPAA-Compliant AI Analysis → 
                Provider Dashboard → Automated Interventions → Audit Logging
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Technologies Required</h4>
                <ul className="text-sm space-y-1">
                  <li>• OpenAI GPT-4 (BAA required)</li>
                  <li>• Supabase with encryption</li>
                  <li>• Real-time processing</li>
                  <li>• Secure API endpoints</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Compliance Measures</h4>
                <ul className="text-sm space-y-1">
                  <li>• Business Associate Agreement</li>
                  <li>• Encrypted data transmission</li>
                  <li>• Access logging & monitoring</li>
                  <li>• Regular security audits</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};