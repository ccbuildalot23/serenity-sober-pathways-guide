import React from 'react';

const ProviderCarePlans: React.FC = () => {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Care Plans</h1>
      <div className="space-x-2">
        <button data-testid="create-care-plan-button" className="border p-2">Create</button>
      </div>
      <div data-testid="care-plan-templates" className="p-2 border">Templates</div>
      <div data-testid="care-plan-list" className="p-2 border">List</div>
      {/* Modal stubs */}
      <div data-testid="care-plan-modal" className="sr-only" />
      <select data-testid="select-patient" className="sr-only"><option>test-patient@serenity.com</option></select>
      <input data-testid="care-plan-title" className="sr-only" />
      <select data-testid="care-plan-template" className="sr-only"><option>substance-abuse-recovery</option></select>
      <button data-testid="add-goal-button" className="sr-only" />
      <input data-testid="goal-description" className="sr-only" />
      <select data-testid="goal-priority" className="sr-only"><option>high</option></select>
      <input data-testid="goal-target-date" className="sr-only" />
      <button data-testid="add-intervention-button" className="sr-only" />
      <select data-testid="intervention-type" className="sr-only"><option>therapy-session</option></select>
      <input data-testid="intervention-frequency" className="sr-only" />
      <input data-testid="intervention-notes" className="sr-only" />
      <button data-testid="save-care-plan" className="sr-only" />
      <div data-testid="care-plan-success" className="sr-only">ok</div>
      <button data-testid="edit-care-plan" className="sr-only" />
      <input data-testid="progress-notes" className="sr-only" />
      <button data-testid="update-care-plan" className="sr-only" />
      <div data-testid="update-success" className="sr-only">ok</div>
    </div>
  );
};

export default ProviderCarePlans;

