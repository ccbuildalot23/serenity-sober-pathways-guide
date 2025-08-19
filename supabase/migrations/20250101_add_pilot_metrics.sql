-- Pilot metrics table for minimal metrics collection during pilot
create table if not exists public.pilot_metrics (
	provider_id text,
	patient_id text,
	event text not null,
	value text,
	ts timestamptz not null default now()
);

comment on table public.pilot_metrics is 'Minimal pilot metrics; avoid PHI. Retain for pilot only.';

