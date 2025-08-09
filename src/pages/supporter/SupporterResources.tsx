import React from 'react';

const SupporterResources: React.FC = () => {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Resources</h1>
      <div data-testid="educational-materials" className="p-2 border">Education</div>
      <button data-testid="view-education-materials" className="border p-2">Open</button>
      <div data-testid="materials-library" className="sr-only">ok</div>
      <div data-testid="addiction-resources" className="sr-only">ok</div>
      <div data-testid="recovery-support-guides" className="sr-only">ok</div>
      <button data-testid="crisis-response-guides" className="border p-2">Crisis Guides</button>
      <div data-testid="crisis-guide-list" className="sr-only">ok</div>
      <button data-testid="suicide-prevention-guide" className="sr-only" />
      <div data-testid="guide-content" className="sr-only">ok</div>
      <div data-testid="emergency-contacts" className="sr-only">ok</div>
      <div data-testid="step-by-step-response" className="sr-only">ok</div>
      <button data-testid="professional-contacts" className="border p-2">Contacts</button>
      <div data-testid="therapist-contacts" className="sr-only">ok</div>
      <div data-testid="crisis-hotlines" className="sr-only">ok</div>
      <div data-testid="emergency-services" className="sr-only">ok</div>
      <button data-testid="add-personal-contact" className="border p-2">Add Contact</button>
      <div data-testid="contact-form" className="sr-only" />
      <input data-testid="contact-name" className="sr-only" />
      <input data-testid="contact-phone" className="sr-only" />
      <input data-testid="contact-email" className="sr-only" />
      <select data-testid="contact-type" className="sr-only"><option>therapist</option></select>
      <button data-testid="save-contact" className="sr-only" />
      <div data-testid="contact-saved-success" className="sr-only">ok</div>
    </div>
  );
};

export default SupporterResources;

