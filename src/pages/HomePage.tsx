import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { 
  Heart, 
  Shield, 
  Users, 
  Leaf, 
  Sparkles, 
  ArrowRight, 
  Play,
  CheckCircle,
  Star,
  Quote
} from 'lucide-react';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-lavender-50 to-sky-50">
      {/* Floating orbs background - disabled for performance */}
      {/* <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-lavender-200/20 rounded-full blur-3xl animate-float" />
        <div className="absolute top-40 right-20 w-80 h-80 bg-sky-200/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-emerald-200/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div> */}

      {/* Premium Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white/60 backdrop-blur-xl border-b border-white/20 shadow-xl"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-lavender-100/50 via-transparent to-sky-100/50" />
        <div className="relative max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3"
            >
              <motion.div 
                className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <Heart className="w-6 h-6 text-white" />
              </motion.div>
              <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Serenity</span>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-6"
            >
              <Link 
                to="/auth" 
                className="text-gray-700 hover:text-emerald-600 font-medium transition-colors duration-300"
              >
                Sign In
              </Link>
              <Link 
                to="/auth" 
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                Get Started
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Hero Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <h1 className="text-5xl md:text-7xl font-bold text-gray-800 mb-6 leading-tight">
              Your Journey to
              <span className="block bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Serenity Begins
              </span>
              <span className="block text-gray-700">Here</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8">
              A compassionate, HIPAA-compliant platform supporting your recovery journey with 
              evidence-based tools, community support, and professional guidance.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
          >
            <Link 
              to="/auth"
              className="group bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center space-x-3"
            >
              <span>Start Your Journey</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
            
            <button className="group bg-white/80 backdrop-blur-sm text-gray-700 px-8 py-4 rounded-2xl font-semibold text-lg shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 flex items-center space-x-3">
              <Play className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
              <span>Watch Demo</span>
            </button>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 px-6 py-20 bg-white/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
              Healing Features for Your Recovery
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive tools and support designed to nurture your well-being and guide your path to recovery.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Heart,
                title: "Daily Check-ins",
                description: "Gentle mood tracking and progress monitoring to support your emotional well-being.",
                color: "emerald"
              },
              {
                icon: Shield,
                title: "Crisis Support",
                description: "Immediate access to crisis resources and professional help when you need it most.",
                color: "turquoise"
              },
              {
                icon: Users,
                title: "Peer Community",
                description: "Connect with others on similar journeys in a safe, supportive environment.",
                color: "sky"
              },
              {
                icon: Leaf,
                title: "Recovery Tools",
                description: "Evidence-based resources and exercises to strengthen your recovery foundation.",
                color: "sage"
              },
              {
                icon: Sparkles,
                title: "Professional Guidance",
                description: "Access to licensed healthcare providers and recovery specialists.",
                color: "emerald"
              },
              {
                icon: CheckCircle,
                title: "Progress Tracking",
                description: "Celebrate milestones and track your growth with meaningful insights.",
                color: "turquoise"
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <GlassCard className="p-8 bg-white/80 hover:bg-white/90 group">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-md">
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
              Stories of Hope & Healing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Real experiences from our community members who have found strength and support on their recovery journey.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "Serenity has been my anchor during the most challenging times. The daily check-ins help me stay connected to my progress.",
                author: "Sarah M.",
                role: "Recovery Journey: 18 months",
                rating: 5
              },
              {
                quote: "The community here is incredible. I've found friends who truly understand what I'm going through.",
                author: "Michael R.",
                role: "Recovery Journey: 9 months",
                rating: 5
              },
              {
                quote: "Professional, compassionate, and always there when I need support. This platform has changed my life.",
                author: "Jennifer L.",
                role: "Recovery Journey: 2 years",
                rating: 5
              }
            ].map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
              >
                <GlassCard className="p-8 bg-white/80 hover:bg-white/90">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-emerald-500 fill-current" />
                    ))}
                  </div>
                  <Quote className="w-8 h-8 text-emerald-400 mb-4" />
                  <p className="text-gray-700 text-lg leading-relaxed mb-6 italic">
                    "{testimonial.quote}"
                  </p>
                  <div>
                    <p className="font-semibold text-gray-800">{testimonial.author}</p>
                    <p className="text-gray-600 text-sm">{testimonial.role}</p>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <GlassCard className="p-12 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
                Ready to Begin Your Healing Journey?
              </h2>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Join thousands of others who have found hope, support, and strength through Serenity. 
                Your path to recovery starts with a single step.
              </p>
              <Link 
                to="/auth"
                className="inline-flex items-center space-x-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                <span>Start Your Free Journey</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <p className="text-gray-500 text-sm mt-4">
                No credit card required • HIPAA compliant • 24/7 support
              </p>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-12 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">Serenity</span>
              </div>
              <p className="text-gray-300 leading-relaxed">
                Supporting your recovery journey with compassion, evidence-based tools, and a caring community.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-sage-300">
                <li><Link to="/auth" className="hover:text-white transition-colors">Sign In</Link></li>
                <li><Link to="/auth" className="hover:text-white transition-colors">Get Started</Link></li>
                <li><Link to="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link to="/support" className="hover:text-white transition-colors">Support</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sage-300">
                <li><Link to="/crisis" className="hover:text-white transition-colors">Crisis Support</Link></li>
                <li><Link to="/community" className="hover:text-white transition-colors">Community</Link></li>
                <li><Link to="/tools" className="hover:text-white transition-colors">Recovery Tools</Link></li>
                <li><Link to="/providers" className="hover:text-white transition-colors">Find Providers</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sage-300">
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/hipaa" className="hover:text-white transition-colors">HIPAA Compliance</Link></li>
                <li><Link to="/accessibility" className="hover:text-white transition-colors">Accessibility</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-sage-800 mt-8 pt-8 text-center text-sage-400">
            <p>&copy; 2024 Serenity Sober Pathways Guide. All rights reserved. Made with ❤️ for recovery.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;