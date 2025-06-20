
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Heart, TrendingUp, Calendar, CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';

const CheckIn = () => {
  const navigate = useNavigate();
  const [currentSection, setCurrentSection] = useState('mood');
  const [responses, setResponses] = useState({
    mood: null,
    energy: null,
    hope: null,
    sobriety_confidence: null,
    recovery_importance: null,
    recovery_strength: null,
    support_needed: false,
    phq2_q1: null,
    phq2_q2: null,
    gad2_q1: null,
    gad2_q2: null,
  });
  const [completedSections, setCompletedSections] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const sections = ['mood', 'wellness', 'assessments'];
  const progressPercentage = (completedSections.size / sections.length) * 100;

  const canComplete = () => {
    return completedSections.size === sections.length;
  };

  const handleSubmit = () => {
    if (!canComplete()) {
      alert('Please complete all sections before submitting');
      return;
    }
    
    setIsSubmitting(true);
    // Simulate submission
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    }, 1000);
  };

  const markSectionComplete = (section) => {
    setCompletedSections(prev => new Set([...prev, section]));
  };

  if (showSuccess) {
    return (
      <Layout activeTab="checkin" onTabChange={() => {}}>
        <div className="p-4 space-y-6 max-w-2xl mx-auto">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-green-800">Great Job!</h1>
            <p className="text-green-700 text-lg">
              Your check-in has been saved. Keep up the amazing work on your recovery journey!
            </p>
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Redirecting to dashboard...</span>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout activeTab="checkin" onTabChange={() => {}}>
      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-[#1E3A8A]">Daily Check-In</h1>
          <p className="text-gray-600">Take a moment to reflect on your day</p>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-gray-500">{completedSections.size}/{sections.length} sections</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className={`text-center p-2 rounded ${completedSections.has('mood') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {completedSections.has('mood') ? '✓' : '○'} Mood
                </div>
                <div className={`text-center p-2 rounded ${completedSections.has('wellness') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {completedSections.has('wellness') ? '✓' : '○'} Wellness
                </div>
                <div className={`text-center p-2 rounded ${completedSections.has('assessments') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {completedSections.has('assessments') ? '✓' : '○'} Assessments
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mood Section */}
        <Card className={completedSections.has('mood') ? 'border-green-200 bg-green-50' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              Mood Check
              {completedSections.has('mood') && <CheckCircle className="w-4 h-4 text-green-600" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">How are you feeling today?</p>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => {
                      setResponses(prev => ({ ...prev, mood: rating }));
                      markSectionComplete('mood');
                    }}
                    className={`p-3 text-center rounded-lg border transition-colors ${
                      responses.mood === rating
                        ? 'bg-blue-100 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">
                      {rating === 1 ? '😢' : rating === 2 ? '😕' : rating === 3 ? '😐' : rating === 4 ? '😊' : '😄'}
                    </div>
                    <div className="text-xs">{rating}</div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wellness Section */}
        <Card className={completedSections.has('wellness') ? 'border-green-200 bg-green-50' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Wellness Check
              {completedSections.has('wellness') && <CheckCircle className="w-4 h-4 text-green-600" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Energy Level (1-10)</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={responses.energy || 5}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setResponses(prev => ({ ...prev, energy: value }));
                    if (responses.hope && responses.sobriety_confidence) {
                      markSectionComplete('wellness');
                    }
                  }}
                  className="w-full"
                />
                <div className="text-center text-sm text-gray-600">{responses.energy || 5}</div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Hope Level (1-10)</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={responses.hope || 5}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setResponses(prev => ({ ...prev, hope: value }));
                    if (responses.energy && responses.sobriety_confidence) {
                      markSectionComplete('wellness');
                    }
                  }}
                  className="w-full"
                />
                <div className="text-center text-sm text-gray-600">{responses.hope || 5}</div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Sobriety Confidence (1-10)</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={responses.sobriety_confidence || 5}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setResponses(prev => ({ ...prev, sobriety_confidence: value }));
                    if (responses.energy && responses.hope) {
                      markSectionComplete('wellness');
                    }
                  }}
                  className="w-full"
                />
                <div className="text-center text-sm text-gray-600">{responses.sobriety_confidence || 5}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assessments Section */}
        <Card className={completedSections.has('assessments') ? 'border-green-200 bg-green-50' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-500" />
              Mental Health Screening
              {completedSections.has('assessments') && <CheckCircle className="w-4 h-4 text-green-600" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Over the last 2 weeks, how often have you felt down, depressed, or hopeless?</p>
                <div className="space-y-2">
                  {[
                    { value: 0, label: 'Not at all' },
                    { value: 1, label: 'Several days' },
                    { value: 2, label: 'More than half the days' },
                    { value: 3, label: 'Nearly every day' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="phq2_q1"
                        value={option.value}
                        checked={responses.phq2_q1 === option.value}
                        onChange={() => {
                          setResponses(prev => ({ ...prev, phq2_q1: option.value }));
                          if (responses.phq2_q2 !== null && responses.gad2_q1 !== null && responses.gad2_q2 !== null) {
                            markSectionComplete('assessments');
                          }
                        }}
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Over the last 2 weeks, how often have you felt nervous, anxious, or on edge?</p>
                <div className="space-y-2">
                  {[
                    { value: 0, label: 'Not at all' },
                    { value: 1, label: 'Several days' },
                    { value: 2, label: 'More than half the days' },
                    { value: 3, label: 'Nearly every day' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="gad2_q1"
                        value={option.value}
                        checked={responses.gad2_q1 === option.value}
                        onChange={() => {
                          setResponses(prev => ({ ...prev, gad2_q1: option.value }));
                          if (responses.phq2_q1 !== null && responses.phq2_q2 !== null && responses.gad2_q2 !== null) {
                            markSectionComplete('assessments');
                          }
                        }}
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Add the other two questions for completeness */}
              <div>
                <p className="text-sm font-medium mb-2">Little interest or pleasure in doing things?</p>
                <div className="space-y-2">
                  {[
                    { value: 0, label: 'Not at all' },
                    { value: 1, label: 'Several days' },
                    { value: 2, label: 'More than half the days' },
                    { value: 3, label: 'Nearly every day' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="phq2_q2"
                        value={option.value}
                        checked={responses.phq2_q2 === option.value}
                        onChange={() => {
                          setResponses(prev => ({ ...prev, phq2_q2: option.value }));
                          if (responses.phq2_q1 !== null && responses.gad2_q1 !== null && responses.gad2_q2 !== null) {
                            markSectionComplete('assessments');
                          }
                        }}
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Not being able to stop or control worrying?</p>
                <div className="space-y-2">
                  {[
                    { value: 0, label: 'Not at all' },
                    { value: 1, label: 'Several days' },
                    { value: 2, label: 'More than half the days' },
                    { value: 3, label: 'Nearly every day' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="gad2_q2"
                        value={option.value}
                        checked={responses.gad2_q2 === option.value}
                        onChange={() => {
                          setResponses(prev => ({ ...prev, gad2_q2: option.value }));
                          if (responses.phq2_q1 !== null && responses.phq2_q2 !== null && responses.gad2_q1 !== null) {
                            markSectionComplete('assessments');
                          }
                        }}
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completion Section */}
        <Card className={canComplete() ? 'border-green-200 bg-green-50' : 'border-gray-200'}>
          <CardContent className="p-6">
            <Button
              onClick={handleSubmit}
              disabled={!canComplete() || isSubmitting}
              className={`w-full py-3 text-lg transition-all ${
                canComplete() 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
              size="lg"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Completing...</span>
                </div>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Complete Check-In
                </>
              )}
            </Button>
            
            {canComplete() && (
              <p className="text-center text-sm text-green-700 mt-2">
                Great job! You're ready to complete today's check-in.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CheckIn;
