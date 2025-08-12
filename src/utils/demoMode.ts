// Demo/verification seeding for localStorage when running in bypass/demo modes
(() => {
  try {
    const params = new URLSearchParams(window.location.search);
    const isDemo = params.get('demo') === '1' || params.get('test_auth') === 'bypass';
    if (!isDemo) return;

    const now = new Date();
    const day = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

    const checkins = [
      { id: 'c1', user_id: 'test-user-12345', created_at: day(2), mood: 'positive', sleep_quality: 8, activities: ['exercise'], notes: 'Demo check-in 1' },
      { id: 'c2', user_id: 'test-user-12345', created_at: day(1), mood: 'neutral', sleep_quality: 7, activities: ['therapy'], notes: 'Demo check-in 2' },
      { id: 'c3', user_id: 'test-user-12345', created_at: day(0), mood: 'positive', sleep_quality: 9, activities: ['meeting', 'exercise'], notes: 'Demo check-in 3' },
    ];

    const contacts = [
      { id: 's1', user_id: 'test-user-12345', _name: 'Demo Sponsor', _phone_number: '+15550001', _relationship: 'sponsor' },
      { id: 's2', user_id: 'test-user-12345', _name: 'Demo Family', _phone_number: '+15550002', _relationship: 'family' },
    ];

    localStorage.setItem('serenity_checkins', JSON.stringify(checkins));
    localStorage.setItem('serenity_contacts', JSON.stringify(contacts));
  } catch {}
})();


