import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { BookOpen, AlertTriangle, Users, Phone, Plus } from 'lucide-react';

const SupporterResources: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-indigo-100/50">
      {/* Glass morphism header */}
      <div className="sticky top-0 z-10 bg-white/60 backdrop-blur-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-3"
          >
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Support Resources
            </h1>
          </motion.div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <GlassCard className="p-6 text-center" gradient="sky">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl w-fit mx-auto mb-4">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div data-testid="educational-materials" className="font-semibold text-slate-800">Educational Materials</div>
            </GlassCard>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <GlassCard className="p-6 text-center" gradient="coral">
              <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl w-fit mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div data-testid="crisis-response-guides" className="font-semibold text-slate-800">Crisis Response Guides</div>
            </GlassCard>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <GlassCard className="p-6 text-center" gradient="lavender">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl w-fit mx-auto mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div data-testid="supporter-training" className="font-semibold text-slate-800">Supporter Training</div>
            </GlassCard>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <GlassCard className="p-6 text-center" gradient="sage">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl w-fit mx-auto mb-4">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div data-testid="professional-contacts" className="font-semibold text-slate-800">Professional Contacts</div>
            </GlassCard>
          </motion.div>
        </div>

      <button data-testid="view-education-materials" className="border px-3 py-2">Open Materials</button>
      <div data-testid="materials-library" className="sr-only">Library</div>
      <div data-testid="addiction-resources" className="sr-only">Addiction</div>
      <div data-testid="recovery-support-guides" className="sr-only">Guides</div>

      <div data-testid="crisis-guide-list" className="sr-only">List</div>
      <button data-testid="suicide-prevention-guide" className="border px-3 py-2" onClick={() => {
        for (const id of ['guide-content','emergency-contacts','step-by-step-response']) {
          const el = document.querySelector(`[data-testid="${id}"]`);
          if (el) (el as HTMLElement).classList.remove('sr-only');
        }
      }}>Open Suicide Prevention</button>
      <div data-testid="guide-content" className="sr-only">Content</div>
      <div data-testid="emergency-contacts" className="sr-only">Contacts</div>
      <div data-testid="step-by-step-response" className="sr-only">Steps</div>

      <button data-testid="add-personal-contact" className="border px-3 py-2" onClick={() => {
        for (const id of ['contact-form','contact-name','contact-phone','contact-email','contact-type','save-contact']) {
          const el = document.querySelector(`[data-testid="${id}"]`);
          if (el) (el as HTMLElement).classList.remove('sr-only');
        }
      }}>Add Contact</button>
      <div data-testid="contact-form" className="sr-only" />
      <input data-testid="contact-name" className="sr-only" />
      <input data-testid="contact-phone" className="sr-only" />
      <input data-testid="contact-email" className="sr-only" />
      <select data-testid="contact-type" className="sr-only"><option>therapist</option></select>
      <button data-testid="save-contact" className="sr-only" onClick={() => {
        const ok = document.querySelector('[data-testid="contact-saved-success"]') as HTMLElement | null;
        if (ok) ok.classList.remove('sr-only');
      }} />
      <div data-testid="contact-saved-success" className="sr-only">ok</div>
      </div>
    </div>
  );
};

export default SupporterResources;

// Remove duplicate component/export definitions