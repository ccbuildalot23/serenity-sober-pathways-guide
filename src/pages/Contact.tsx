import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { GlassCard } from '@/components/ui/GlassCard';
import { Phone, MessageCircle, Heart, MapPin, ArrowLeft, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const Contact = () => {
  const navigate = useNavigate();
  const [sponsorNumber, setSponsorNumber] = useState(localStorage.getItem('sponsor_number') || '');
  const [showLocalResources, setShowLocalResources] = useState(false);

  const addSponsorNumber = () => {
    const number = prompt("Enter your sponsor's phone number:", sponsorNumber);
    if (number) {
      localStorage.setItem('sponsor_number', number);
      setSponsorNumber(number);
      alert('Sponsor number saved! You can call them with one tap now.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-indigo-900/30">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            className="text-white/70 hover:text-white mb-4 bg-white/10 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="text-center space-y-6">
            <motion.h1
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
            >
              You're Going To Be Okay
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-white/90"
            >
              Real people who care. They're waiting for your call right now.
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-lg text-emerald-400 font-medium"
            >
              ✓ You matter. ✓ This feeling will pass. ✓ Help is one tap away.
            </motion.p>
          </div>
        </motion.div>

        {/* Primary Crisis Lines */}
        <div className="space-y-6">
          {/* 988 Lifeline - HUGE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <GlassCard className="bg-gradient-to-r from-red-500/20 to-rose-500/20 border-red-400/30">
              <div className="p-8">
                <Button
                  onClick={() => window.location.href = 'tel:988'}
                  className="w-full h-24 bg-white hover:bg-gray-100 text-red-600 rounded-xl shadow-xl"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Phone className="w-10 h-10" />
                    <span className="text-3xl font-bold">988</span>
                    <span className="text-sm">Suicide & Crisis Lifeline</span>
                  </div>
                </Button>
                <p className="text-center text-white/90 mt-4">
                  Free • Confidential • 24/7 • Trained counselors
                </p>
              </div>
            </GlassCard>
          </motion.div>

          {/* Crisis Text Line */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
          >
            <GlassCard className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border-blue-400/30">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Crisis Text Line</h3>
                </div>
                <Button
                  onClick={() => window.open('sms:741741?body=HOME', '_self')}
                  className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                >
                  Text HOME to 741741
                </Button>
                <p className="text-sm text-white/70 mt-3 text-center">
                  Free 24/7 support via text message
                </p>
              </div>
            </GlassCard>
          </motion.div>

          {/* SAMHSA Helpline */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-3">
                <Phone className="w-6 h-6" />
                SAMHSA National Helpline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => window.location.href = 'tel:1-800-662-4357'}
                className="w-full h-16 bg-green-600 hover:bg-green-700 text-white rounded-xl"
              >
                1-800-662-HELP (4357)
              </Button>
              <p className="text-sm text-gray-400 mt-3 text-center">
                Treatment referrals and information • English & Spanish
              </p>
            </CardContent>
          </Card>

          {/* Your Sponsor */}
          <Card className="bg-purple-900/20 border-purple-800/50">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-3">
                <Heart className="w-6 h-6" />
                Your Sponsor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sponsorNumber ? (
                <div className="space-y-3">
                  <Button
                    onClick={() => window.location.href = `tel:${sponsorNumber}`}
                    className="w-full h-16 bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
                  >
                    Call Your Sponsor
                  </Button>
                  <Button
                    onClick={addSponsorNumber}
                    variant="outline"
                    className="w-full border-gray-600 text-gray-300"
                  >
                    Update Number
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={addSponsorNumber}
                  className="w-full h-16 bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Sponsor Number
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* What to Expect */}
        <div className="mt-8 bg-gray-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-center">What to Expect When You Call</h2>
          <div className="space-y-3 text-gray-300">
            <p className="flex items-start gap-3">
              <span className="text-green-400">✓</span>
              <span>They've heard it all. Nothing you say will shock them.</span>
            </p>
            <p className="flex items-start gap-3">
              <span className="text-green-400">✓</span>
              <span>You don't have to give your name.</span>
            </p>
            <p className="flex items-start gap-3">
              <span className="text-green-400">✓</span>
              <span>They won't judge you or tell you what to do.</span>
            </p>
            <p className="flex items-start gap-3">
              <span className="text-green-400">✓</span>
              <span>It's okay to just cry. They'll stay with you.</span>
            </p>
          </div>
        </div>

        {/* Local Resources */}
        <div className="mt-8">
          <Button
            onClick={() => setShowLocalResources(!showLocalResources)}
            variant="outline"
            className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <MapPin className="w-5 h-5 mr-2" />
            {showLocalResources ? 'Hide' : 'Show'} Local NA/AA Hotlines
          </Button>
          
          {showLocalResources && (
            <div className="mt-4 bg-gray-800 rounded-xl p-6 space-y-3">
              <p className="text-sm text-gray-400 mb-4">
                These numbers connect you to local recovery meetings and support:
              </p>
              <div className="space-y-2">
                <Button
                  onClick={() => window.open('https://www.na.org/meetingsearch/', '_blank')}
                  variant="outline"
                  className="w-full justify-start border-gray-600 text-gray-300"
                >
                  Find NA Meetings Near You
                </Button>
                <Button
                  onClick={() => window.open('https://www.aa.org/find-aa', '_blank')}
                  variant="outline"
                  className="w-full justify-start border-gray-600 text-gray-300"
                >
                  Find AA Meetings Near You
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Additional Support */}
        <div className="mt-12 space-y-6">
          <h2 className="text-2xl font-bold text-center">More Support Options</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg">Veterans Crisis Line</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => window.location.href = 'tel:1-800-273-8255'}
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300"
                >
                  1-800-273-8255, Press 1
                </Button>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg">LGBTQ+ National Hotline</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => window.location.href = 'tel:1-888-843-4564'}
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300"
                >
                  1-888-843-4564
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Hope-Centered Footer Message */}
        <div className="mt-12 text-center space-y-4 text-gray-400">
          <div className="bg-green-900/20 border border-green-800/50 rounded-xl p-6 mb-8">
            <p className="text-lg text-green-300 font-medium mb-2">
              You took the hardest step by coming here.
            </p>
            <p className="text-gray-300">
              Every person who answers these phones chose this work because they believe in you. They're hoping you'll call.
            </p>
          </div>
          <div className="bg-blue-900/20 border border-blue-800/50 rounded-xl p-6">
            <p className="text-lg text-blue-300 font-medium mb-2">
              Your Recovery Journey Starts With One Call
            </p>
            <p className="text-gray-300">
              Recovery isn't about being perfect. It's about showing up for yourself, especially on the hard days.
            </p>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800">
            <p className="text-sm">
              If you or someone you know is in immediate danger, call 911.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;