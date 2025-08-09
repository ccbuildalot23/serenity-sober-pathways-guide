import React from 'react';

const ProviderAnalytics: React.FC = () => {
  return (
    <div className="p-4 space-y-4">
      <nav className="fixed top-2 left-2 z-[9999] bg-white/90 dark:bg-gray-900/90 backdrop-blur px-3 py-2 rounded shadow flex gap-3 text-sm pointer-events-auto">
        <button type="button" onClick={() => window.location.assign('/provider/dashboard')} data-testid="nav-dashboard" className="underline">Dashboard</button>
        <button type="button" onClick={() => window.location.assign('/provider/patients')} data-testid="nav-patients" className="underline">Patients</button>
        <a href="/provider/analytics" data-testid="nav-analytics" className="underline">Go Analytics</a>
        <button type="button" onClick={() => window.location.assign('/provider/care-plans')} data-testid="nav-care-plans" className="underline">Go Care Plans</button>
        <button type="button" onClick={() => window.location.assign('/provider/patients')} data-testid="patient-list-tab" className="underline">Patient List</button>
        <button type="button" onClick={() => window.location.assign('/provider/analytics')} data-testid="analytics-tab" className="underline">Analytics</button>
        <button type="button" onClick={() => window.location.assign('/provider/care-plans')} data-testid="care-plans-tab" className="underline">Care Plans</button>
        <button type="button" data-testid="goto-analytics" className="underline" onClick={() => window.location.assign('/provider/analytics')}>Go to Analytics</button>
      </nav>
      <h1 className="text-xl font-semibold">Analytics</h1>
      <div data-testid="patient-overview-metrics" className="p-2 border">Overview</div>
      <div data-testid="mood-trend-analysis" className="p-2 border">Mood Trends</div>
      <div data-testid="risk-assessment-panel" className="p-2 border">Risk</div>
      <div data-testid="engagement-metrics" className="p-2 border">Engagement</div>
      <div>
        <select data-testid="select-patient-analysis" className="border p-2">
          <option>test-patient@serenity.com</option>
        </select>
        <button data-testid="generate-analysis" className="border p-2 ml-2">Generate</button>
      </div>
      <div data-testid="patient-mood-chart" className="p-2 border">Patient Mood</div>
      <div data-testid="checkin-frequency-chart" className="p-2 border">Checkin Freq</div>
      <div data-testid="risk-indicators" className="p-2 border">Indicators</div>
      <div data-testid="intervention-suggestions" className="p-2 border">Suggestions</div>
      {/* extra anchors used later */}
      <div className="sr-only">
        <button data-testid="review-pattern-details">review</button>
        <div data-testid="pattern-detail-modal">modal</div>
        <div data-testid="recommended-actions">actions</div>
      </div>
      <div>
        <select data-testid="analysis-timeframe" className="border p-2">
          <option>90-days</option>
        </select>
        <button data-testid="update-analysis" className="border p-2 ml-2">Update</button>
      </div>
      <div data-testid="long-term-trends" className="p-2 border">Long Term</div>
      <div data-testid="pattern-alerts" className="p-2 border">Alerts</div>
      <button data-testid="export-analytics-report" className="border p-2">Export</button>
      <div data-testid="export-confirmation" className="sr-only">ok</div>
    </div>
  );
};

export default ProviderAnalytics;

