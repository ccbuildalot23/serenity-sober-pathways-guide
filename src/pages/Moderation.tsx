import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ModerationDashboard from '@/components/community/ModerationDashboard';

const Moderation = () => {
  return (
    <div className="container mx-auto p-6">
      <Routes>
        <Route path="/" element={<ModerationDashboard />} />
      </Routes>
    </div>
  );
};

export default Moderation;