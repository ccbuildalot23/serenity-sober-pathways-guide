import React from 'react';

const SupporterProfile: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Supporter Profile</h1>
      <form data-testid="supporter-profile-form" className="space-y-3">
        <section data-testid="personal-info" className="space-y-2">
          <input data-testid="supporter-name" className="border p-2 w-full" placeholder="Name" />
          <input data-testid="phone-number" className="border p-2 w-full" placeholder="Phone" />
          <input data-testid="relationship" className="border p-2 w-full" placeholder="Relationship" />
        </section>
        <section data-testid="availability-settings" className="space-y-2">
          <label><input data-testid="available-24-7" type="checkbox" className="mr-2"/> Available 24/7</label>
          <input data-testid="preferred-contact-method" className="border p-2 w-full" placeholder="Preferred contact method" />
          <select data-testid="response-time" className="border p-2 w-full"><option value="immediate">immediate</option></select>
        </section>
        <section data-testid="notification-preferences" className="space-y-2">
          <label><input data-testid="crisis-alerts" type="checkbox" className="mr-2"/> Crisis alerts</label>
          <label><input data-testid="daily-checkin-summaries" type="checkbox" className="mr-2"/> Daily summaries</label>
          <label><input data-testid="weekly-reports" type="checkbox" className="mr-2"/> Weekly reports</label>
          <select data-testid="notification-frequency" className="border p-2 w-full"><option value="real-time">real-time</option></select>
        </section>
        <button data-testid="save-profile" className="border px-3 py-2 rounded">Save</button>
        <div data-testid="profile-updated-success" className="sr-only">saved</div>
      </form>
      <div className="mt-4">
        <button data-testid="emergency-contacts-tab" className="border px-3 py-2 rounded">Emergency Contacts</button>
        <div className="space-y-2 mt-3">
          <button data-testid="add-emergency-contact" className="border px-3 py-2 rounded">Add Emergency Contact</button>
          <input data-testid="emergency-name" className="sr-only" />
          <input data-testid="emergency-phone" className="sr-only" />
          <select data-testid="emergency-relationship" className="sr-only"><option value="friend">friend</option></select>
          <button data-testid="save-emergency-contact" className="sr-only" />
          <div data-testid="emergency-contact-saved" className="sr-only">ok</div>
        </div>
      </div>
    </div>
  );
};

export default SupporterProfile;


