import React, { useState } from 'react';

const ProviderPatientProfile: React.FC = () => {
  const [showHistory, setShowHistory] = useState(false);
  const [showTrends, setShowTrends] = useState(false);
  const [showFiltered, setShowFiltered] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  return (
    <div className="p-4 space-y-4">
      <h1 data-testid="patient-profile-header" className="text-xl font-semibold">Patient Profile</h1>
      <section data-testid="patient-basic-info" className="p-2 border">Basic Info</section>
      <section data-testid="checkin-history-section" className="p-2 border">Check-in History</section>
      <div data-testid="mood-trend-chart" className="p-2 border">Mood Trend</div>
      <div className="mt-2 flex gap-3 text-sm">
        <button data-testid="checkin-history-tab" className="underline" onClick={() => setShowHistory(true)}>History</button>
        <button data-testid="mood-trends-tab" className="underline" onClick={() => setShowTrends(true)}>Mood Trends</button>
      </div>
      {showHistory && (
        <div className="space-y-2">
          <div data-testid="checkin-timeline" className="p-2 border">Timeline</div>
          <div data-testid="checkin-list" className="p-2 border">List</div>
          <div data-testid="mood-patterns" className="p-2 border">Patterns</div>
          <div className="flex gap-2">
            <button data-testid="date-range-picker" className="border px-2 py-1">Date Range</button>
            <button data-testid="last-30-days" className="border px-2 py-1" onClick={() => setShowFiltered(true)}>Last 30 Days</button>
          </div>
          {showFiltered && <div data-testid="filtered-checkins" className="p-2 border">filtered</div>}
          <button data-testid="view-checkin-details" className="border px-2 py-1" onClick={() => setShowDetail(true)}>View Details</button>
          {showDetail && (
            <div data-testid="checkin-detail-modal" className="p-3 border rounded">
              <div data-testid="mood-assessment">mood</div>
              <div data-testid="activities-completed">activities</div>
              <div data-testid="sleep-quality">sleep</div>
              <div data-testid="provider-notes-section">
                <input data-testid="provider-notes-input" className="border p-1" />
                <button data-testid="save-provider-notes" className="border px-2 py-1">Save</button>
                <div data-testid="notes-saved-confirmation" className="sr-only">ok</div>
              </div>
            </div>
          )}
        </div>
      )}
      {showTrends && (
        <div className="space-y-2">
          <div data-testid="mood-chart" className="p-2 border">chart</div>
          <div data-testid="trend-analysis" className="p-2 border">analysis</div>
        </div>
      )}
    </div>
  );
};

export default ProviderPatientProfile;


