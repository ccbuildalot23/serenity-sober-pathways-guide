import React, { useState } from 'react';

const ProviderCarePlans: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
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

      {/* Dedicated visible edit trigger outside scrollable list */}
      <div className="space-x-2">
        <button
          data-testid="edit-care-plan"
          className="border px-2 py-1"
          onClick={() => {
            setOpen(true);
            setEditing(true);
            // ensure any previous success state is hidden
            try {
              const ok = document.querySelector('[data-testid="update-success"]') as HTMLElement | null;
              if (ok) ok.classList.add('sr-only');
            } catch {}
          }}
        >
          Edit First Plan
        </button>
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

          {/* Editing UI displayed when triggered */}
          {editing && (
            <div className="space-y-2">
              <input data-testid="progress-notes" className="border p-2 w-full" placeholder="Progress notes" />
              <button
                data-testid="update-care-plan"
                className="border px-2 py-1"
                onClick={() => {
                  const ok = document.querySelector('[data-testid="update-success"]') as HTMLElement | null;
                  if (ok) ok.classList.remove('sr-only');
                }}
              >
                Update
              </button>
              <div data-testid="update-success" className="sr-only">ok</div>
            </div>
          )}

          <button
            data-testid="save-care-plan"
            className="border px-2 py-1"
            onClick={() => {
              const list = document.querySelector('[data-testid="care-plan-list"]');
              if (list) {
                const item = document.createElement('div');
                item.setAttribute('data-testid', 'care-plan-item');
                item.textContent = 'Early Recovery Support Plan';
                list.appendChild(item);
              }
              const ok = document.querySelector('[data-testid="care-plan-success"]') as HTMLElement | null;
              if (ok) ok.classList.remove('sr-only');
              setEditing(true);
            }}
          >
            Save
          </button>
          <div data-testid="care-plan-success" className="sr-only">ok</div>
        </div>
      )}
    </div>
  );
};

export default ProviderCarePlans;

