import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { DataExportDashboard } from '@/components/data-export/DataExportDashboard';
import { Download } from 'lucide-react';

const DataExport: React.FC = () => {
  const [activeTab, setActiveTab] = useState('data-export');

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-indigo-100/50">
        {/* Glass morphism header */}
        <div className="sticky top-0 z-10 bg-white/60 backdrop-blur-xl border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center space-x-3"
            >
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                <Download className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Data Export
              </h1>
            </motion.div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <DataExportDashboard />
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default DataExport;