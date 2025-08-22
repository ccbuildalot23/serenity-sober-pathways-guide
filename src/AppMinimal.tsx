import React, { useMemo, useState } from 'react';

type Contact = { id: string; name: string; phone: string };

function useLocal<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  const save = (next: T) => {
    setValue(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
  };
  return [value, save] as const;
}

export default function AppMinimal() {
  const [email, setEmail] = useLocal<string>('minimal_user', '');
  const isAuthed = useMemo(() => !!email, [email]);
  const [contacts, setContacts] = useLocal<Contact[]>('minimal_contacts', []);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  try {

    const addContact = () => {
      if (!name || !phone) return;
      const next = [...contacts, { id: crypto.randomUUID(), name, phone }];
      setContacts(next);
      setName('');
      setPhone('');
    };

    const crisis = () => {
      try { localStorage.setItem('minimal_last_crisis', new Date().toISOString()); } catch {}
      window.location.href = 'tel:988';
    };

    if (!isAuthed) {
      return (
        <div className="min-h-screen grid place-items-center p-6">
          <div className="max-w-sm w-full border rounded-lg p-4 shadow-sm">
            <h1 className="text-xl font-semibold mb-3">Sign in</h1>
            <input
              aria-label="Email"
              placeholder="you@example.com"
              className="w-full border rounded px-3 py-2 mb-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              className="w-full bg-blue-600 text-white rounded px-3 py-2"
              onClick={() => setEmail(email.trim())}
            >Continue</button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen p-6 max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex gap-2">
            <button className="border rounded px-3 py-2" onClick={crisis}>Crisis (988)</button>
            <button className="border rounded px-3 py-2" onClick={() => { try { localStorage.clear(); } catch {}; window.location.reload(); }}>Sign out</button>
          </div>
        </header>

        <section className="mb-6">
          <h2 className="font-semibold mb-2">Add Support Contact</h2>
          <div className="flex gap-2 max-sm:flex-col">
            <input className="border rounded px-3 py-2 flex-1" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="border rounded px-3 py-2 flex-1" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button className="bg-green-600 text-white rounded px-3 py-2" onClick={addContact}>Add</button>
          </div>
        </section>

        <section>
          <h2 className="font-semibold mb-2">Support Contacts</h2>
          <ul className="space-y-2">
            {contacts.map(c => (
              <li key={c.id} className="border rounded p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-sm text-gray-600">{c.phone}</div>
                </div>
                <a className="text-blue-600" href={`tel:${c.phone}`}>Call</a>
              </li>
            ))}
            {contacts.length === 0 && <li className="text-gray-600">No contacts yet.</li>}
          </ul>
        </section>
      </div>
    );
  } catch (error) {
    console.error('Minimal app error:', error);
    return <div className="min-h-screen grid place-items-center p-6">Something went wrong (minimal)</div>;
  }
}


