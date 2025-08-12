-- Production Test User and Sample Data Seed (UUID-safe)
-- Ensure legacy 'phone' column exists on profiles to satisfy existing triggers in project
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN phone TEXT;
  END IF;
END $$;

DO $$
DECLARE
  v_user_id uuid;
  v_has_user_id boolean := false;
  v_has_id boolean := false;
  v_has_phone boolean := false;
  v_has_phone_number boolean := false;
BEGIN
  -- Check existing user by email
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'test-patient@serenity.com' 
  LIMIT 1;

  -- Create user if missing and capture id with RETURNING
  IF v_user_id IS NULL THEN
    INSERT INTO auth.users (
      id, aud, role, email, encrypted_password, 
      email_confirmed_at, created_at, updated_at, 
      raw_app_meta_data, raw_user_meta_data
    ) VALUES (
      gen_random_uuid(), 'authenticated', 'authenticated', 
      'test-patient@serenity.com',
      crypt('TestSerenity2024!@#', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"patient"}'
    ) RETURNING id INTO v_user_id;
  END IF;

  -- Detect profiles schema variants
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='profiles' AND column_name='user_id'
  ) INTO v_has_user_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='profiles' AND column_name='id'
  ) INTO v_has_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='profiles' AND column_name='phone'
  ) INTO v_has_phone;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='profiles' AND column_name='phone_number'
  ) INTO v_has_phone_number;

  -- Insert profile using explicit branches to avoid conflict target mismatches
  IF v_has_id AND v_has_user_id THEN
    -- Table has both id (PK) and user_id. Provide both.
    IF v_has_phone THEN
      INSERT INTO public.profiles (id, user_id, email, phone, created_at, updated_at)
      VALUES (v_user_id, v_user_id, 'test-patient@serenity.com', NULL, now(), now())
      ON CONFLICT DO NOTHING;
    ELSIF v_has_phone_number THEN
      INSERT INTO public.profiles (id, user_id, email, phone_number, created_at, updated_at)
      VALUES (v_user_id, v_user_id, 'test-patient@serenity.com', NULL, now(), now())
      ON CONFLICT DO NOTHING;
    ELSE
      INSERT INTO public.profiles (id, user_id, email, created_at, updated_at)
      VALUES (v_user_id, v_user_id, 'test-patient@serenity.com', now(), now())
      ON CONFLICT DO NOTHING;
    END IF;
  ELSIF v_has_id THEN
    -- Only id present (as PK)
    IF v_has_phone THEN
      INSERT INTO public.profiles (id, email, phone, created_at, updated_at)
      VALUES (v_user_id, 'test-patient@serenity.com', NULL, now(), now())
      ON CONFLICT DO NOTHING;
    ELSIF v_has_phone_number THEN
      INSERT INTO public.profiles (id, email, phone_number, created_at, updated_at)
      VALUES (v_user_id, 'test-patient@serenity.com', NULL, now(), now())
      ON CONFLICT DO NOTHING;
    ELSE
      INSERT INTO public.profiles (id, email, created_at, updated_at)
      VALUES (v_user_id, 'test-patient@serenity.com', now(), now())
      ON CONFLICT DO NOTHING;
    END IF;
  ELSIF v_has_user_id THEN
    -- Only user_id present
    IF v_has_phone THEN
      INSERT INTO public.profiles (user_id, email, phone, created_at, updated_at)
      VALUES (v_user_id, 'test-patient@serenity.com', NULL, now(), now())
      ON CONFLICT DO NOTHING;
    ELSIF v_has_phone_number THEN
      INSERT INTO public.profiles (user_id, email, phone_number, created_at, updated_at)
      VALUES (v_user_id, 'test-patient@serenity.com', NULL, now(), now())
      ON CONFLICT DO NOTHING;
    ELSE
      INSERT INTO public.profiles (user_id, email, created_at, updated_at)
      VALUES (v_user_id, 'test-patient@serenity.com', now(), now())
      ON CONFLICT DO NOTHING;
    END IF;
  ELSE
    -- Fallback: minimal insert with email only
    INSERT INTO public.profiles (email)
    VALUES ('test-patient@serenity.com')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Ensure user_roles has patient role (robust without relying on unique index)
  INSERT INTO public.user_roles (id, user_id, role)
  VALUES (gen_random_uuid(), v_user_id, 'patient')
  ON CONFLICT DO NOTHING;
  UPDATE public.user_roles SET role = 'patient' WHERE user_id = v_user_id;

  -- Sample daily check-ins for last 2 days and today
  INSERT INTO public.daily_checkins (id, user_id, checkin_date, mood_rating, sleep_quality, activities, notes, created_at, is_complete)
  VALUES
    (gen_random_uuid(), v_user_id, CURRENT_DATE - INTERVAL '2 days', 8, 8, 'exercise,meditation', 'Feeling strong today', now() - INTERVAL '2 days', true),
    (gen_random_uuid(), v_user_id, CURRENT_DATE - INTERVAL '1 day', 6, 7, 'therapy,reading', 'Working through emotions', now() - INTERVAL '1 day', true),
    (gen_random_uuid(), v_user_id, CURRENT_DATE, 9, 9, 'meeting,exercise', 'Grateful for another day', now(), true)
  ON CONFLICT DO NOTHING;

  -- Support Contacts
  INSERT INTO public.support_contacts (id, user_id, name, phone, email, relationship, created_at)
  VALUES
    (gen_random_uuid(), v_user_id, 'Sarah (Sponsor)', '+1555000001', 'sponsor@test.com', 'sponsor', now()),
    (gen_random_uuid(), v_user_id, 'Mom', '+1555000002', 'family@test.com', 'family', now()),
    (gen_random_uuid(), v_user_id, 'Recovery Buddy Mike', '+1555000003', 'buddy@test.com', 'peer', now())
  ON CONFLICT DO NOTHING;
END $$;


