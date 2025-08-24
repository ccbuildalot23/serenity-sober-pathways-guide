import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { MetricWidget } from '@/components/ui/MetricWidget';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Activity,
  TrendingUp,
  Calendar,
  Heart,
  Sparkles,
  Clock
} from 'lucide-react';

const ProviderPatientProfile: React.FC = () => {
  const [showHistory, setShowHistory] = useState(false);
  const [showTrends, setShowTrends] = useState(false);
  const [showFiltered, setShowFiltered] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Premium Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white/60 backdrop-blur-xl border-b border-white/20 shadow-xl"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 via-transparent to-indigo-100/50" />
        <div className="relative max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3" data-testid="patient-profile-header">
              <motion.div 
                className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <User className="w-8 h-8 text-white" />
              </motion.div>
              Patient Profile
            </h1>
            <p className="mt-3 text-gray-700 text-lg font-medium flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Comprehensive journey insights and care coordination
            </p>
            <p className="mt-1 text-gray-600">
              Detailed patient engagement and progress tracking
            </p>
          </motion.div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Patient Overview */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <MetricWidget
            title="Current Mood"
            value={8.2}
            suffix="/10"
            subtitle="trending positively"
            icon={Heart}
            gradient="coral"
            delay={0.5}
            trend={{ value: 12, isPositive: true }}
          />
          <MetricWidget
            title="Check-in Streak"
            value={21}
            subtitle="consecutive days"
            icon={Calendar}
            gradient="sage"
            delay={0.6}
            trend={{ value: 15, isPositive: true }}
          />
          <MetricWidget
            title="Engagement Score"
            value={87}
            suffix="%"
            subtitle="active participation"
            icon={Activity}
            gradient="sky"
            delay={0.7}
            trend={{ value: 8, isPositive: true }}
          />
        </motion.div>

        {/* Patient Basic Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <GlassCard className="mb-8 p-6 bg-white/80" gradient="premium" data-testid="patient-basic-info">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Patient Information
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Patient Name</p>
                  <p className="text-gray-800 font-semibold">John Smith</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Recovery Start Date</p>
                  <p className="text-gray-800">March 15, 2024</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Status</p>
                  <Badge className="bg-green-100 text-green-800">Thriving</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Last Contact</p>
                  <p className="text-gray-800">2 hours ago</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Check-in History Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <GlassCard className="mb-8 p-6 bg-white/80" gradient="sage" data-testid="checkin-history-section">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              Check-in History Overview
            </h3>
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-lg">
              <p className="text-emerald-700">Comprehensive tracking of daily connections and progress milestones</p>
            </div>
          </GlassCard>
        </motion.div>

        {/* Mood Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
        >
          <GlassCard className="mb-8 p-6 bg-white/80" gradient="sky" data-testid="mood-trend-chart">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-sky-600" />
              Mood Trend Analysis
            </h3>
            <div className="h-48 bg-gradient-to-r from-sky-50 to-blue-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 text-sky-500 mx-auto mb-3" />
                <p className="text-sky-700 font-medium">Positive upward trend</p>
                <p className="text-sm text-sky-600">15% improvement over 30 days</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
        {/* Tab Navigation */}
        <div className="mb-6 flex gap-3">
          <Button data-testid="checkin-history-tab" variant="outline" onClick={() => setShowHistory(true)}>History</Button>
          <Button data-testid="mood-trends-tab" variant="outline" onClick={() => setShowTrends(true)}>Mood Trends</Button>
        </div>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 mb-8"
          >
            <GlassCard className="p-6 bg-white/80" gradient="coral" data-testid="checkin-timeline">
              <h4 className="text-md font-semibold text-gray-800 mb-2">Check-in Timeline</h4>
              <p className="text-gray-600">Visual timeline of patient engagement patterns</p>
            </GlassCard>
            <GlassCard className="p-6 bg-white/80" gradient="lavender" data-testid="checkin-list">
              <h4 className="text-md font-semibold text-gray-800 mb-2">Detailed Check-in List</h4>
              <p className="text-gray-600">Comprehensive history of all patient interactions</p>
            </GlassCard>
            <GlassCard className="p-6 bg-white/80" gradient="premium" data-testid="mood-patterns">
              <h4 className="text-md font-semibold text-gray-800 mb-2">Mood Patterns</h4>
              <p className="text-gray-600">Analysis of emotional trends and recovery indicators</p>
            </GlassCard>
            <div className="flex gap-2 mb-4">
              <Button data-testid="date-range-picker" variant="outline" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                Date Range
              </Button>
              <Button data-testid="last-30-days" variant="outline" size="sm" onClick={() => setShowFiltered(true)}>
                <Clock className="w-4 h-4 mr-2" />
                Last 30 Days
              </Button>
            </div>
            {showFiltered && (
              <GlassCard className="mb-4 p-4 bg-white/80" gradient="sage" data-testid="filtered-checkins">
                <p className="text-emerald-700">Filtered results for last 30 days</p>
              </GlassCard>
            )}
            <Button data-testid="view-checkin-details" onClick={() => setShowDetail(true)}>View Detailed Analysis</Button>
            {showDetail && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              >
                <GlassCard className="max-w-2xl w-full p-6 bg-white/95" data-testid="checkin-detail-modal">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Detailed Check-in Analysis</h3>
                  <div className="space-y-4">
                    <div data-testid="mood-assessment" className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-800">Mood Assessment</h4>
                      <p className="text-sm text-blue-600">Current mood rating and emotional state analysis</p>
                    </div>
                    <div data-testid="activities-completed" className="p-3 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-800">Activities Completed</h4>
                      <p className="text-sm text-green-600">Daily wellness activities and engagement tracking</p>
                    </div>
                    <div data-testid="sleep-quality" className="p-3 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-800">Sleep Quality</h4>
                      <p className="text-sm text-purple-600">Rest patterns and sleep health indicators</p>
                    </div>
                    <div data-testid="provider-notes-section" className="p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-800 mb-2">Provider Notes</h4>
                      <input data-testid="provider-notes-input" className="w-full p-2 border border-gray-300 rounded" placeholder="Add clinical notes..." />
                      <div className="flex gap-2 mt-2">
                        <Button data-testid="save-provider-notes" size="sm">Save Notes</Button>
                        <Button variant="outline" size="sm" onClick={() => setShowDetail(false)}>Close</Button>
                      </div>
                      <div data-testid="notes-saved-confirmation" className="sr-only">ok</div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </motion.div>
        )}
        {showTrends && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
          >
            <GlassCard className="p-6 bg-white/80" gradient="sky" data-testid="mood-chart">
              <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-sky-600" />
                Mood Chart Visualization
              </h4>
              <div className="h-32 bg-gradient-to-r from-sky-50 to-blue-50 rounded-lg flex items-center justify-center">
                <p className="text-sky-700">Interactive mood trend chart</p>
              </div>
            </GlassCard>
            <GlassCard className="p-6 bg-white/80" gradient="lavender" data-testid="trend-analysis">
              <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                Trend Analysis
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Overall Trend</span>
                  <span className="text-sm font-medium text-green-600">Improving</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Volatility</span>
                  <span className="text-sm font-medium text-blue-600">Low</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Consistency</span>
                  <span className="text-sm font-medium text-green-600">High</span>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ProviderPatientProfile;