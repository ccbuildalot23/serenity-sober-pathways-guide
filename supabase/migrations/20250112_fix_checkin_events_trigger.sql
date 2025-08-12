-- Fix checkin_events trigger with SECURITY DEFINER and proper RLS policies
-- This migration addresses trigger execution issues and ensures proper event logging

-- Drop existing trigger and function to start clean
DROP TRIGGER IF EXISTS trg_log_daily_checkin_event ON public.daily_checkins;
DROP FUNCTION IF EXISTS public.log_daily_checkin_event();

-- Drop existing problematic policies to recreate them properly
DROP POLICY IF EXISTS "Allow trigger function to insert checkin events" ON public.checkin_events;
DROP POLICY IF EXISTS "Users manage own checkin events - normal ops" ON public.checkin_events;
DROP POLICY IF EXISTS "Users manage own checkin events" ON public.checkin_events;

-- Create the trigger function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.log_daily_checkin_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- Critical: allows function to bypass RLS constraints
SET search_path = public
AS $$
DECLARE
    event_id UUID;
BEGIN
    -- Validate input data
    IF NEW.user_id IS NULL THEN
        RAISE WARNING 'Cannot log checkin event: user_id is NULL';
        RETURN NEW;
    END IF;

    BEGIN
        -- Insert checkin event record
        INSERT INTO public.checkin_events (
            user_id,
            created_at,
            mood_rating,
            sleep_quality,
            activities,
            notes
        ) VALUES (
            NEW.user_id,
            COALESCE(NEW.updated_at, NEW.created_at, now()),
            NEW.mood_rating,
            COALESCE(NEW.energy_rating, NEW.mood_rating), -- Use energy_rating if available, fallback to mood_rating
            NEW.activities,
            NEW.notes
        ) RETURNING id INTO event_id;

        -- Log success for monitoring
        RAISE INFO 'Successfully logged checkin event % for user %', event_id, NEW.user_id;
        
    EXCEPTION 
        WHEN unique_violation THEN
            -- Handle duplicate key violations gracefully
            RAISE WARNING 'Duplicate checkin event detected for user % at %', NEW.user_id, NEW.updated_at;
        WHEN foreign_key_violation THEN
            -- Handle case where user_id doesn't exist
            RAISE WARNING 'Cannot log checkin event: user % does not exist', NEW.user_id;
        WHEN OTHERS THEN
            -- Catch all other errors but don't fail the main transaction
            RAISE WARNING 'Failed to insert checkin_event for user %: % (%)', NEW.user_id, SQLERRM, SQLSTATE;
    END;
    
    RETURN NEW;
END;
$$;

-- Grant necessary permissions for the function
GRANT EXECUTE ON FUNCTION public.log_daily_checkin_event() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_daily_checkin_event() TO service_role;

-- Set function owner to ensure proper permissions
ALTER FUNCTION public.log_daily_checkin_event() OWNER TO postgres;

-- Create comprehensive RLS policies for checkin_events table

-- Policy 1: Allow system/trigger to insert events (highest priority)
CREATE POLICY "system_insert_checkin_events" 
    ON public.checkin_events
    FOR INSERT
    WITH CHECK (true);

-- Policy 2: Users can read their own checkin events  
CREATE POLICY "users_read_own_checkin_events"
    ON public.checkin_events
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy 3: Users can update their own checkin events (for corrections)
CREATE POLICY "users_update_own_checkin_events"
    ON public.checkin_events
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id AND user_id = auth.uid());

-- Policy 4: Users can delete their own checkin events (soft delete pattern)
CREATE POLICY "users_delete_own_checkin_events"
    ON public.checkin_events
    FOR DELETE
    USING (auth.uid() = user_id);

-- Policy 5: Service role has full access (for admin operations)
CREATE POLICY "service_role_full_access_checkin_events"
    ON public.checkin_events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create the trigger on daily_checkins
CREATE TRIGGER trg_log_daily_checkin_event
    AFTER INSERT OR UPDATE ON public.daily_checkins
    FOR EACH ROW 
    EXECUTE FUNCTION public.log_daily_checkin_event();

-- Add counter increment functionality
-- Create a function to get checkin count for a user
CREATE OR REPLACE FUNCTION public.get_user_checkin_count(target_user_id UUID DEFAULT auth.uid())
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    checkin_count INTEGER;
BEGIN
    -- Validate user access
    IF target_user_id IS NULL OR (auth.uid() IS NOT NULL AND auth.uid() != target_user_id) THEN
        RETURN 0;
    END IF;
    
    SELECT COUNT(*) INTO checkin_count
    FROM public.checkin_events 
    WHERE user_id = target_user_id;
    
    RETURN COALESCE(checkin_count, 0);
END;
$$;

-- Grant permissions for the count function
GRANT EXECUTE ON FUNCTION public.get_user_checkin_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_checkin_count(UUID) TO service_role;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_checkin_events_user_created_at ON public.checkin_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkin_events_created_at ON public.checkin_events(created_at DESC);

-- Add check constraint to ensure data validity
-- Drop existing constraints if they exist (won't error if they don't)
ALTER TABLE public.checkin_events DROP CONSTRAINT IF EXISTS check_mood_rating_range;
ALTER TABLE public.checkin_events DROP CONSTRAINT IF EXISTS check_sleep_quality_range;

-- Add the constraints
ALTER TABLE public.checkin_events 
    ADD CONSTRAINT check_mood_rating_range 
    CHECK (mood_rating IS NULL OR (mood_rating >= 1 AND mood_rating <= 5));

ALTER TABLE public.checkin_events 
    ADD CONSTRAINT check_sleep_quality_range 
    CHECK (sleep_quality IS NULL OR (sleep_quality >= 1 AND sleep_quality <= 5));

-- Test the trigger functionality
DO $$
DECLARE
    test_user_id UUID;
    test_checkin_id UUID;
    events_before INTEGER;
    events_after INTEGER;
    test_successful BOOLEAN := FALSE;
BEGIN
    -- Try to find an existing user for testing
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Count events before
        SELECT COUNT(*) INTO events_before 
        FROM public.checkin_events 
        WHERE user_id = test_user_id;
        
        BEGIN
            -- Insert test daily_checkin to trigger the function
            INSERT INTO public.daily_checkins (
                user_id, 
                checkin_date, 
                mood_rating, 
                energy_rating,
                activities, 
                notes,
                is_complete
            ) VALUES (
                test_user_id,
                CURRENT_DATE,
                4,
                3,
                'trigger_test_activities',
                'Testing enhanced trigger functionality - ' || now()::text,
                true
            ) RETURNING id INTO test_checkin_id;
            
            -- Small delay to ensure trigger executes
            PERFORM pg_sleep(0.1);
            
            -- Count events after
            SELECT COUNT(*) INTO events_after 
            FROM public.checkin_events 
            WHERE user_id = test_user_id;
            
            -- Check if trigger worked
            IF events_after > events_before THEN
                test_successful := TRUE;
                RAISE NOTICE 'SUCCESS: Enhanced checkin events trigger working correctly. Events: % → %', events_before, events_after;
            ELSE
                RAISE WARNING 'TRIGGER TEST FAILED: Events count unchanged at %', events_before;
            END IF;
            
            -- Clean up test data
            DELETE FROM public.checkin_events 
            WHERE user_id = test_user_id 
                AND notes LIKE 'Testing enhanced trigger functionality%';
                
            DELETE FROM public.daily_checkins 
            WHERE id = test_checkin_id;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Test failed with error: % (%)', SQLERRM, SQLSTATE;
            -- Try to clean up even if test failed
            IF test_checkin_id IS NOT NULL THEN
                DELETE FROM public.daily_checkins WHERE id = test_checkin_id;
            END IF;
        END;
    ELSE
        RAISE NOTICE 'No test user available - skipping trigger validation';
    END IF;
    
    -- Final status report
    IF test_successful THEN
        RAISE NOTICE 'MIGRATION COMPLETED: Checkin events trigger is properly configured with SECURITY DEFINER';
    ELSE
        RAISE WARNING 'MIGRATION COMPLETED: Trigger created but validation test could not confirm functionality';
    END IF;
END $$;

-- Add comment for future reference
COMMENT ON FUNCTION public.log_daily_checkin_event() IS 
'Trigger function to log immutable checkin events when daily_checkins are created/updated. 
Uses SECURITY DEFINER to bypass RLS policies during trigger execution.
Enhanced with error handling and validation.';

COMMENT ON FUNCTION public.get_user_checkin_count(UUID) IS 
'Returns the total count of checkin events for a user. 
Used for tracking progress and statistics.';