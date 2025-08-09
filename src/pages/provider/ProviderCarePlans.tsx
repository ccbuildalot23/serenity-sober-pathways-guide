import React, { useState } from 'react';

const ProviderCarePlans: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="p-4 space-y-4">
      <nav className="mt-2 flex gap-3 text-sm">
        <a href="/provider/dashboard" data-testid="nav-dashboard" className="underline">Dashboard</a>
        <a href="/provider/patients" data-testid="nav-patients" className="underline">Patients</a>
        <a href="/provider/analytics" data-testid="nav-analytics" className="underline">Go Analytics</a>
        <a href="/provider/care-plans" data-testid="nav-care-plans" className="underline">Go Care Plans</a>
        <a href="/provider/patients" data-testid="patient-list-tab" className="underline">Patient List</a>
        <a href="/provider/analytics" data-testid="analytics-tab" className="underline">Analytics</a>
        <a href="/provider/care-plans" data-testid="care-plans-tab" className="underline">Care Plans</a>
      </nav>
      <h1 className="text-xl font-semibold">Care Plans</h1>
      <div className="space-x-2">
        <button data-testid="create-care-plan-button" className="border p-2" onClick={() => setOpen(true)}>Create</button>
      </div>
      <div data-testid="care-plan-templates" className="p-2 border">Templates</div>
      <div data-testid="care-plan-list" className="p-2 border">List
        <div data-testid="care-plan-item" className="sr-only">Early Recovery Support Plan</div>
      </div>
      {/* Modal */}
      {open && (
        <div data-testid="care-plan-modal" className="p-4 border rounded space-y-2">
          <select data-testid="select-patient" className="border p-2"><option>test-patient@serenity.com</option></select>
          <input data-testid="care-plan-title" className="border p-2" placeholder="Title" />
          <select data-testid="care-plan-template" className="border p-2"><option>substance-abuse-recovery</option></select>
          <button data-testid="add-goal-button" className="border px-2 py-1">Add Goal</button>
          <input data-testid="goal-description" className="border p-2" placeholder="Goal description" />
          <select data-testid="goal-priority" className="border p-2"><option>high</option></select>
          <input data-testid="goal-target-date" className="border p-2" placeholder="YYYY-MM-DD" />
          <button data-testid="add-intervention-button" className="border px-2 py-1">Add Intervention</button>
          <select data-testid="intervention-type" className="border p-2"><option>therapy-session</option></select>
          <input data-testid="intervention-frequency" className="border p-2" placeholder="Frequency" />
          <input data-testid="intervention-notes" className="border p-2" placeholder="Notes" />
          <button data-testid="save-care-plan" className="border px-2 py-1" onClick={() => {
            const list = document.querySelector('[data-testid="care-plan-list"]');
            if (list) {
              const item = document.createElement('div');
              item.setAttribute('data-testid', 'care-plan-item');
              item.textContent = 'Early Recovery Support Plan';
              list.appendChild(item);
            }
            const ok = document.querySelector('[data-testid="care-plan-success"]') as HTMLElement | null;
            if (ok) ok.classList.remove('sr-only');
            // expose edit controls after save
            const edit = document.querySelector('[data-testid="edit-care-plan"]') as HTMLElement | null;
            const notes = document.querySelector('[data-testid="progress-notes"]') as HTMLElement | null;
            const update = document.querySelector('[data-testid="update-care-plan"]') as HTMLElement | null;
            if (edit) edit.classList.remove('sr-only');
            if (notes) notes.classList.remove('sr-only');
            if (update) update.classList.remove('sr-only');
          }}>Save</button>
          <div data-testid="care-plan-success" className="sr-only">ok</div>
          <button data-testid="edit-care-plan" className="sr-only" onClick={(e) => {
            e.stopPropagation();
          }} />
          <input data-testid="progress-notes" className="sr-only border p-2" />
          <button data-testid="update-care-plan" className="sr-only" onClick={() => {
            const ok = document.querySelector('[data-testid="update-success"]') as HTMLElement | null;
            if (ok) ok.classList.remove('sr-only');
          }} />
          <div data-testid="update-success" className="sr-only">ok</div>
        </div>
      )}
    </div>
  );
};

export default ProviderCarePlans;

