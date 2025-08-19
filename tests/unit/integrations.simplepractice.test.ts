import { MockSimplePracticeClient } from '../../packages/integrations/simplepractice';

const enabled = process.env.SIMPLEPRACTICE_TESTS === '1';

(enabled ? describe : describe.skip)('SimplePractice mock client', () => {
	it('lists patients and creates appointment', async () => {
		const client = new MockSimplePracticeClient();
		const patients = await client.listPatients();
		expect(patients.length).toBeGreaterThan(0);
		const created = await client.createAppointment({ patientId: patients[0].id, start: new Date().toISOString(), durationMinutes: 30 });
		expect(created.id).toBeTruthy();
	});
});

