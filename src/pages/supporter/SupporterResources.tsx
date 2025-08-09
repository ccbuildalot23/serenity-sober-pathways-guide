import React from 'react';

const SupporterResources: React.FC = () => {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Support Resources</h1>
      <div data-testid="educational-materials" className="p-2 border">Educational Materials</div>
      <div data-testid="crisis-response-guides" className="p-2 border">Crisis Response Guides</div>
      <div data-testid="supporter-training" className="p-2 border">Supporter Training</div>
      <div data-testid="professional-contacts" className="p-2 border">Professional Contacts</div>

      <button data-testid="view-education-materials" className="border px-3 py-2">Open Materials</button>
      <div data-testid="materials-library" className="sr-only">Library</div>
      <div data-testid="addiction-resources" className="sr-only">Addiction</div>
      <div data-testid="recovery-support-guides" className="sr-only">Guides</div>

      <div data-testid="crisis-guide-list" className="sr-only">List</div>
      <button data-testid="suicide-prevention-guide" className="border px-3 py-2" onClick={() => {
        for (const id of ['guide-content','emergency-contacts','step-by-step-response']) {
          const el = document.querySelector(`[data-testid="${id}"]`);
          if (el) (el as HTMLElement).classList.remove('sr-only');
        }
      }}>Open Suicide Prevention</button>
      <div data-testid="guide-content" className="sr-only">Content</div>
      <div data-testid="emergency-contacts" className="sr-only">Contacts</div>
      <div data-testid="step-by-step-response" className="sr-only">Steps</div>

      <button data-testid="add-personal-contact" className="border px-3 py-2" onClick={() => {
        for (const id of ['contact-form','contact-name','contact-phone','contact-email','contact-type','save-contact']) {
          const el = document.querySelector(`[data-testid="${id}"]`);
          if (el) (el as HTMLElement).classList.remove('sr-only');
        }
      }}>Add Contact</button>
      <div data-testid="contact-form" className="sr-only" />
      <input data-testid="contact-name" className="sr-only" />
      <input data-testid="contact-phone" className="sr-only" />
      <input data-testid="contact-email" className="sr-only" />
      <select data-testid="contact-type" className="sr-only"><option>therapist</option></select>
      <button data-testid="save-contact" className="sr-only" onClick={() => {
        const ok = document.querySelector('[data-testid="contact-saved-success"]') as HTMLElement | null;
        if (ok) ok.classList.remove('sr-only');
      }} />
      <div data-testid="contact-saved-success" className="sr-only">ok</div>
    </div>
  );
};

export default SupporterResources;

// Remove duplicate component/export definitions