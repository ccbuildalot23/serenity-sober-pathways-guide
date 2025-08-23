import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { MetricWidget } from '@/components/ui/MetricWidget';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Heart, Brain, Phone, Users, FileText, TrendingUp } from 'lucide-react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import TriggerManagementToolkit from '@/components/triggers/TriggerManagementToolkit';
import RecoveryStrengthening from '@/components/cbt/relapse/RecoveryStrengthening';
import { PredictiveCrisisAlert } from '@/components/crisis/PredictiveCrisisAlert';
import { PlayTheTapeButton } from '@/features/PlayTheTape';
import { useNavigate } from 'react-router-dom';
import { CrisisPatternAnalysisService } from '@/services/crisisPatternAnalysisService';
import { useState as useReactState } from 'react';

const RecoveryStrengthPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [_activeSection, setActiveSection] = useState('overview');
  const [_riskScore, setRiskScore] = useState(0);
  const [patterns, setPatterns] = useState<unknown>({});
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
        _crisisPrecursors: [],
        _riskScore: score
      });
    } catch (_error) {
      console._error('Error loading risk assessment:', _error);
      setRiskScore(0.1); // Default low risk
    }
  };

  const loadPersonalizedStrategies = async () => {
    try {
      const strategies = await CrisisPatternAnalysisService.getPersonalizedInterventions(user?.id || '');
      setPersonalizedStrategies(strategies);
    } catch (_error) {
      console._error('Error loading personalized strategies:', _error);
      // Default strategies
      setPersonalizedStrategies(['Deep breathing exercises', 'Mindfulness meditation', 'Call support person']);
    }
  };

  const userData = {
    sobrietyDays: 30, // Mock data - in production this would come from user profile
    recoveryHistory: []
  };

  const getRiskLevel = (score: number) => {
    if (score >= 0.7) return { level: 'High', color: 'bg-red-500', textColor: 'text-red-700' };
    if (score >= 0.4) return { level: 'Medium', color: 'bg-yellow-500', textColor: 'text-yellow-700' };
    return { level: 'Low', color: 'bg-green-500', textColor: 'text-green-700' };
  };

  const riskLevel = getRiskLevel(_riskScore);

  const sections = [
    { id: 'overview', title: 'Risk Overview', icon: TrendingUp },
    { id: 'triggers', title: 'Trigger Management', icon: AlertTriangle },
    { id: 'coping', title: 'Coping Strategies', icon: Shield },
    { id: 'emergency', title: 'Emergency Plan', icon: Phone },
    { id: 'support', title: 'Support Network', icon: Users },
    { id: 'tools', title: 'Prevention Tools', icon: Brain }
  ];

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Predictive Crisis Alert */}
      <GlassCard className="overflow-hidden">
        <PredictiveCrisisAlert 
          patterns={patterns}
          onCrisisDetected={() => navigate('/crisis-support')}
          onShowInterventions={() => setActiveSection('coping')}
        />
      </GlassCard>
      
      {/* Risk Score Display */}
      <GlassCard className="p-8" gradient="premium">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Current Risk Assessment</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-slate-600 mb-2">Current Risk Level</p>
              <div className="flex items-center gap-3">
                <Badge className={`${riskLevel.color} text-white px-3 py-1`}>
                  {riskLevel.level}
                </Badge>
                <span className="text-3xl font-bold text-slate-800">{Math.round(_riskScore * 100)}%</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">Based on recent patterns</p>
              <p className="text-xs text-slate-500">Updates daily</p>
            </div>
          </div>
          
          <div className="bg-white/40 backdrop-blur-sm rounded-xl p-6 space-y-3">
            <h4 className="font-semibold text-slate-800">Risk Factors Detected:</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-3">
                <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                <span className="text-slate-700">Active engagement with prevention tools</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                <span className="text-slate-700">Regular check-in completion</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-slate-700">Support network actively engaged</span>
              </li>
            </ul>
          </div>
        </div>
      </GlassCard>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveSection('triggers')}
        >
          <GlassCard hover className="cursor-pointer p-6 text-center bg-gradient-to-br from-amber-100/40 to-orange-100/40 border-amber-200/50">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl w-fit mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-slate-800 mb-2">Identify Triggers</h3>
            <p className="text-sm text-slate-600">Map your personal risk factors</p>
          </GlassCard>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveSection('coping')}
        >
          <GlassCard hover className="cursor-pointer p-6 text-center bg-gradient-to-br from-blue-100/40 to-indigo-100/40 border-blue-200/50">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl w-fit mx-auto mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-slate-800 mb-2">Coping Tools</h3>
            <p className="text-sm text-slate-600">Build your strategy library</p>
          </GlassCard>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/crisis-support')}
        >
          <GlassCard hover className="cursor-pointer p-6 text-center bg-gradient-to-br from-red-100/40 to-rose-100/40 border-red-200/50">
            <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl w-fit mx-auto mb-4">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-slate-800 mb-2">Crisis Support</h3>
            <p className="text-sm text-slate-600">Immediate help resources</p>
          </GlassCard>
        </motion.div>
      </div>

      {/* Play the Tape Tool */}
      <GlassCard className="p-8" gradient="sage">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Mental Rehearsal Tools</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-slate-800 mb-2">Play the Tape All the Way Through</h4>
            <p className="text-slate-600">Mental exercise to visualize consequences and strengthen resolve</p>
          </div>
          <PlayTheTapeButton userData={userData} />
        </div>
      </GlassCard>
    </div>
  );

  const renderTriggers = () => (
    <div className="space-y-8">
      <GlassCard className="overflow-hidden">
        <TriggerManagementToolkit />
      </GlassCard>
    </div>
  );

  const renderCoping = () => (
    <div className="space-y-8">
      <GlassCard className="p-8" gradient="lavender">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Personalized Coping Strategies</h2>
        </div>
        {personalizedStrategies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {personalizedStrategies.map((strategy, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="p-6 bg-white/40 backdrop-blur-sm rounded-xl border border-white/30"
              >
                <h4 className="font-semibold text-slate-800 mb-2">{strategy}</h4>
                <p className="text-sm text-slate-600">Based on your usage patterns</p>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-slate-600 text-center py-8">Complete more check-ins to get personalized recommendations</p>
        )}
      </GlassCard>
      
      <GlassCard className="overflow-hidden">
        <RecoveryStrengthening />
      </GlassCard>
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
          
          <div className="p-4 bg-green-50 border border-blue-200 rounded-lg">
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
      <RecoveryStrengthening />
    </div>
  );

  const renderActiveSection = () => {
    switch (_activeSection) {
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-indigo-100/50">
        {/* Glass morphism header */}
        <div className="sticky top-0 z-10 bg-white/60 backdrop-blur-xl border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-2"
            >
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Recovery Strength Toolkit
              </h1>
              <p className="text-slate-600">
                Comprehensive tools to strengthen your recovery journey
              </p>
            </motion.div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Section Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <GlassCard className="p-4">
              <div className="flex flex-wrap gap-2 justify-center">
                {sections.map((section, index) => (
                  <motion.button
                    key={section.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                      _activeSection === section.id
                        ? 'bg-white/80 text-purple-700 shadow-md scale-105'
                        : 'text-slate-600 hover:text-slate-800 hover:bg-white/40'
                    }`}
                  >
                    <section.icon className="w-4 h-4" />
                    {section.title}
                  </motion.button>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Active Section Content */}
          <motion.div
            key={_activeSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {renderActiveSection()}
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default RecoveryStrengthPage;