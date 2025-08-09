import React, { useState } from 'react';

const ProviderPatients: React.FC = () => {
  const [filtered, setFiltered] = useState(false);
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Patients</h1>
      <div>
        <input data-testid="search-patients" placeholder="Search patients" className="border p-2" />
        <select data-testid="filter-by-status" className="border p-2 ml-2">
          <option value="all">all</option>
          <option value="needs-attention">needs-attention</option>
        </select>
        <select data-testid="sort-options" className="border p-2 ml-2">
          <option value="last-checkin-desc">last-checkin-desc</option>
        </select>
        <button data-testid="apply-filter" className="border p-2 ml-2" onClick={() => setFiltered(true)}>Apply</button>
        <button data-testid="clear-filters" className="border p-2 ml-2" onClick={() => setFiltered(false)}>Clear</button>
      </div>
      {filtered ? (
        <div data-testid="filtered-results" className="p-2 border">Filtered</div>
      ) : (
        <div data-testid="all-patients-view" className="p-2 border">All</div>
      )}
      <div data-testid="patient-table" className="border p-2">
        <div data-testid="patient-row" className="p-2 border-b">
          <span data-testid="patient-name">test-patient@serenity.com</span>
          <button data-testid="view-patient-details" className="ml-4" onClick={() => (window.location.href = '/provider/patients/1')}>View</button>
        </div>
      </div>
    </div>
  );
};

export default ProviderPatients;

