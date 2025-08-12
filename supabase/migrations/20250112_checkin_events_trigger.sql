-- Create trigger to log an immutable event for every daily_checkins write
create or replace function public.log_daily_checkin_event()
returns trigger
language plpgsql
as $$
begin
  insert into public.checkin_events (
    user_id,
    created_at,
    mood_rating,
    sleep_quality,
    activities,
    notes
  ) values (
    NEW.user_id,
    now(),
    NEW.mood_rating,
    NEW.sleep_quality,
    NEW.activities,
    NEW.notes
  );
  return NEW;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_log_daily_checkin_event'
  ) then
    create trigger trg_log_daily_checkin_event
      after insert or update on public.daily_checkins
      for each row execute function public.log_daily_checkin_event();
  end if;
end $$;


