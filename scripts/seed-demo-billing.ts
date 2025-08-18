#!/usr/bin/env ts-node

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!url || !key) {
	console.log('[seed] Missing SUPABASE_URL or key (SERVICE_ROLE_KEY/ANON_KEY). Skipping seed.');
	process.exit(0);
}

const supabase = createClient(url, key);

async function main() {
	const now = new Date();
	const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

	// Create a demo provider if not exists
	const providerId = 'demo-provider-0001';
	await supabase.from('profiles').upsert({ id: providerId, role: 'provider', email: 'demo-provider@example.com', created_at: new Date().toISOString() });

	// Seed ~45 CCM minutes and ~25 BHI minutes this month
	const events = [
		{ type: 'coordination_call', duration_minutes: 15 },
		{ type: 'careplan_update', duration_minutes: 15 },
		{ type: 'med_recon', duration_minutes: 15 },
		{ type: 'assessment', duration_minutes: 15 },
		{ type: 'careplan_update', duration_minutes: 10 },
	];

	const rows = events.map((e, idx) => ({
		id: `demo-evt-${Date.now()}-${idx}`,
		patient_id: `demo-patient-${(idx % 3) + 1}`,
		provider_id: providerId,
		type: e.type,
		duration_minutes: e.duration_minutes,
		created_at: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1 + idx)).toISOString(),
	}));

	await supabase.from('interaction_events').upsert(rows);
	console.log('Seeded demo billing data for provider:', providerId);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});

