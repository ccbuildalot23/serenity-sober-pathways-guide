-- Fix security warnings by adding SET search_path to functions

-- Update function to update supporter chat count
CREATE OR REPLACE FUNCTION update_supporter_chat_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        UPDATE peer_supporters 
        SET current_chat_count = current_chat_count + 1
        WHERE user_id = NEW.peer_supporter_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status IN ('ended', 'escalated') THEN
        UPDATE peer_supporters 
        SET current_chat_count = current_chat_count - 1,
            total_chats_completed = total_chats_completed + 1
        WHERE user_id = NEW.peer_supporter_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Update function to update supporter average rating
CREATE OR REPLACE FUNCTION update_supporter_rating()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NEW.user_rating IS NOT NULL THEN
        UPDATE peer_supporters 
        SET average_rating = (
            SELECT AVG(user_rating) 
            FROM peer_chat_sessions 
            WHERE peer_supporter_id = NEW.peer_supporter_id 
            AND user_rating IS NOT NULL
        )
        WHERE user_id = NEW.peer_supporter_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Update function to clean up old typing indicators
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    DELETE FROM peer_chat_typing 
    WHERE updated_at < NOW() - INTERVAL '5 minutes';
END;
$$;

-- Update function to get next user in queue
CREATE OR REPLACE FUNCTION get_next_queue_user(supporter_id UUID)
RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    next_user_id UUID;
BEGIN
    SELECT user_id INTO next_user_id
    FROM peer_support_queue
    WHERE (preferred_supporter_id IS NULL OR preferred_supporter_id = supporter_id)
    ORDER BY 
        CASE priority 
            WHEN 'crisis' THEN 1 
            WHEN 'high' THEN 2 
            ELSE 3 
        END,
        created_at ASC
    LIMIT 1;
    
    IF next_user_id IS NOT NULL THEN
        DELETE FROM peer_support_queue WHERE user_id = next_user_id;
    END IF;
    
    RETURN next_user_id;
END;
$$;