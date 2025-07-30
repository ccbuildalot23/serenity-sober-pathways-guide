import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Heart, Brain, Phone, Users, FileText, TrendingUp } from 'lucide-react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import TriggerManagementToolkit from '@/components/triggers/TriggerManagementToolkit';
import RelapsePrevention from '@/components/cbt/relapse/RelapsePrevention';
import { PredictiveCrisisAlert } from '@/components/crisis/PredictiveCrisisAlert';
import { PlayTheTapeButton } from '@/features/PlayTheTape';
import { useNavigate } from 'react-router-dom';
import { CrisisPatternAnalysisService } from '@/services/crisisPatternAnalysisService';
import { useState as useReactState } from 'react';

const RelapsePreventionPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');
  const [riskScore, setRiskScore] = useState(0);
  const [patterns, setPatterns] = useState<any>({});
  const [personalizedStrategies, setPersonalizedStrategies] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadRiskAssessment();
      loadPersonalizedStrategies();
    }
  }, [user]);

  const loadRiskAssessment = async () => {
    try {
      const score = await CrisisPatternAnalysisService.predictCrisisRisk(user?.id || '');
      setRiskScore(score);
      
      // Mock pattern data for demo
      setPatterns({
        interventionStats: {},
        crisisPrecursors: [],
        riskScore: score
      });
    } catch (error) {
      console.error('Error loading risk assessment:', error);
      setRiskScore(0.1); // Default low risk
    }
  };

  const loadPersonalizedStrategies = async () => {
    try {
      const strategies = await CrisisPatternAnalysisService.getPersonalizedInterventions(user?.id || '');
      setPersonalizedStrategies(strategies);
    } catch (error) {
      console.error('Error loading personalized strategies:', error);
      // Default strategies
      setPersonalizedStrategies(['Deep breathing exercises', 'Mindfulness meditation', 'Call support person']);
    }
  };

  const userData = {
    sobrietyDays: 30, // Mock data - in production this would come from user profile
    relapseHistory: []
  };

  const getRiskLevel = (score: number) => {
    if (score >= 0.7) return { level: 'High', color: 'bg-red-500', textColor: 'text-red-700' };
    if (score >= 0.4) return { level: 'Medium', color: 'bg-yellow-500', textColor: 'text-yellow-700' };
    return { level: 'Low', color: 'bg-green-500', textColor: 'text-green-700' };
  };

  const riskLevel = getRiskLevel(riskScore);

  const sections = [
    { id: 'overview', title: 'Risk Overview', icon: TrendingUp },
    { id: 'triggers', title: 'Trigger Management', icon: AlertTriangle },
    { id: 'coping', title: 'Coping Strategies', icon: Shield },
    { id: 'emergency', title: 'Emergency Plan', icon: Phone },
    { id: 'support', title: 'Support Network', icon: Users },
    { id: 'tools', title: 'Prevention Tools', icon: Brain }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Predictive Crisis Alert */}
      <PredictiveCrisisAlert 
        patterns={patterns}
        onCrisisDetected={() => navigate('/crisis-support')}
        onShowInterventions={() => setActiveSection('coping')}
      />
      
      {/* Risk Score Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Current Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Current Risk Level</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${riskLevel.color} text-white`}>
                  {riskLevel.level}
                </Badge>
                <span className="text-2xl font-bold">{Math.round(riskScore * 100)}%</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Based on recent patterns</p>
              <p className="text-xs text-muted-foreground">Updates daily</p>
            </div>
          </div>
          
          <div className="bg-gray-100 rounded-lg p-4 space-y-2">
            <h4 className="font-medium">Risk Factors Detected:</h4>
            <ul className="text-sm space-y-1">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Active engagement with prevention tools
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Regular check-in completion
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                Support network actively engaged
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveSection('triggers')}>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-orange-500" />
            <h3 className="font-medium">Identify Triggers</h3>
            <p className="text-sm text-muted-foreground">Map your personal risk factors</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveSection('coping')}>
          <CardContent className="p-4 text-center">
            <Shield className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <h3 className="font-medium">Coping Tools</h3>
            <p className="text-sm text-muted-foreground">Build your strategy library</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/crisis-support')}>
          <CardContent className="p-4 text-center">
            <Phone className="w-8 h-8 mx-auto mb-2 text-red-500" />
            <h3 className="font-medium">Crisis Support</h3>
            <p className="text-sm text-muted-foreground">Immediate help resources</p>
          </CardContent>
        </Card>
      </div>

      {/* Play the Tape Tool */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Mental Rehearsal Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Play the Tape All the Way Through</h4>
              <p className="text-sm text-muted-foreground">Mental exercise to visualize consequences and strengthen resolve</p>
            </div>
            <PlayTheTapeButton userData={userData} />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTriggers = () => (
    <div className="space-y-6">
      <TriggerManagementToolkit />
    </div>
  );

  const renderCoping = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personalized Coping Strategies</CardTitle>
        </CardHeader>
        <CardContent>
          {personalizedStrategies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {personalizedStrategies.map((strategy, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">{strategy}</h4>
                  <p className="text-sm text-muted-foreground">Based on your usage patterns</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Complete more check-ins to get personalized recommendations</p>
          )}
        </CardContent>
      </Card>
      
      <RelapsePrevention />
    </div>
  );

  const renderEmergencyPlan = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Emergency Action Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-medium text-red-800 mb-2">Crisis Hotlines</h4>
            <div className="space-y-2">
              <Button variant="destructive" className="w-full" onClick={() => window.open('tel:988', '_self')}>
                <Phone className="w-4 h-4 mr-2" />
                988 Suicide & Crisis Lifeline
              </Button>
              <Button variant="outline" className="w-full" onClick={() => window.open('tel:1-800-662-4357', '_self')}>
                SAMHSA National Helpline: 1-800-662-4357
              </Button>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Your Support Team</h4>
            <Button variant="outline" onClick={() => navigate('/support')}>
              <Users className="w-4 h-4 mr-2" />
              View Emergency Contacts
            </Button>
          </div>
          
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">Immediate Coping Tools</h4>
            <Button variant="outline" onClick={() => navigate('/crisis-support')}>
              <Heart className="w-4 h-4 mr-2" />
              Access Crisis Toolkit
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSupport = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Support Network</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" onClick={() => navigate('/support')}>
              <Users className="w-4 h-4 mr-2" />
              Emergency Contacts
            </Button>
            <Button variant="outline" onClick={() => navigate('/accountability')}>
              <Heart className="w-4 h-4 mr-2" />
              Accountability Partners
            </Button>
            <Button variant="outline" onClick={() => navigate('/peer-support')}>
              <Users className="w-4 h-4 mr-2" />
              Peer Support Chat
            </Button>
            <Button variant="outline" onClick={() => navigate('/planning')}>
              <FileText className="w-4 h-4 mr-2" />
              Recovery Planning
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTools = () => (
    <div className="space-y-6">
      <RelapsePrevention />
    </div>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'overview': return renderOverview();
      case 'triggers': return renderTriggers();
      case 'coping': return renderCoping();
      case 'emergency': return renderEmergencyPlan();
      case 'support': return renderSupport();
      case 'tools': return renderTools();
      default: return renderOverview();
    }
  };

  return (
    <Layout activeTab="support" onTabChange={() => {}}>
      <div className="p-4 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Relapse Prevention Toolkit</h1>
          <p className="text-gray-600">Comprehensive tools to strengthen your recovery and prevent relapse</p>
        </div>

        {/* Section Navigation */}
        <div className="flex flex-wrap gap-2 mb-6 border-b">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
                activeSection === section.id
                  ? 'bg-primary text-primary-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <section.icon className="w-4 h-4" />
              {section.title}
            </button>
          ))}
        </div>

        {/* Active Section Content */}
        {renderActiveSection()}
      </div>
    </Layout>
  );
};

export default RelapsePreventionPage;