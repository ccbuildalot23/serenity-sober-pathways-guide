export type SimplePracticePatient = {
	id: string;
	firstName: string;
	lastName: string;
	dateOfBirth?: string;
};

export type SimplePracticeAppointment = {
	id?: string;
	patientId: string;
	start: string;
	durationMinutes: number;
	note?: string;
};

export interface SimplePracticeClient {
	listPatients(): Promise<SimplePracticePatient[]>;
	createAppointment(appointment: SimplePracticeAppointment): Promise<{ id: string }>;
	exportBilling(month: string): Promise<{ url: string }>;
}

export class MockSimplePracticeClient implements SimplePracticeClient {
	async listPatients(): Promise<SimplePracticePatient[]> {
		return [
			{ id: 'p1', firstName: 'Demo', lastName: 'Patient', dateOfBirth: '1990-01-01' }
		];
	}
	async createAppointment(appointment: SimplePracticeAppointment): Promise<{ id: string }> {
		return { id: appointment.id || `apt-${Date.now()}` };
	}
	async exportBilling(month: string): Promise<{ url: string }> {
		return { url: `https://example.com/billing-${month}.csv` };
	}
}
