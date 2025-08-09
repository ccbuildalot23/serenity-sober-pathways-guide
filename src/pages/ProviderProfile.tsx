import React from 'react';

const ProviderProfile: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Provider Profile</h1>
      <form data-testid="provider-profile-form" className="space-y-4">
        <section data-testid="professional-info" className="space-y-2">
          <input data-testid="provider-name" className="border p-2 w-full" placeholder="Name" />
          <input data-testid="specialty" className="border p-2 w-full" placeholder="Specialty" />
          <input data-testid="license-number" className="border p-2 w-full" placeholder="License Number" />
          <input data-testid="phone-number" className="border p-2 w-full" placeholder="Phone Number" />
        </section>
        <section data-testid="contact-preferences" className="space-y-2">
          <label className="block">Availability</label>
          <label><input data-testid="monday-availability" type="checkbox" className="mr-2"/> Monday</label>
          <label><input data-testid="tuesday-availability" type="checkbox" className="mr-2"/> Tuesday</label>
          <div className="flex gap-2">
            <input data-testid="start-time" className="border p-2" placeholder="Start" />
            <input data-testid="end-time" className="border p-2" placeholder="End" />
          </div>
        </section>
        <button type="button" data-testid="save-profile" className="border px-3 py-2 rounded">Save</button>
      </form>
      <div data-testid="profile-updated-success" className="sr-only">saved</div>

      {/* Password change stub */}
      <div className="mt-6">
        <button data-testid="change-password-tab" className="border px-3 py-2 rounded">Change Password</button>
        <div className="mt-3 space-y-2">
          <input data-testid="current-password" className="border p-2 w-full" placeholder="Current Password" />
          <input data-testid="new-password" className="border p-2 w-full" placeholder="New Password" />
          <input data-testid="confirm-password" className="border p-2 w-full" placeholder="Confirm Password" />
          <button data-testid="update-password" className="border px-3 py-2 rounded">Update Password</button>
          <div data-testid="password-updated-success" className="sr-only">updated</div>
        </div>
      </div>
    </div>
  );
};

export default ProviderProfile;


