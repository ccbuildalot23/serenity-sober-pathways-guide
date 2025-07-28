-- Fix search path for security functions by recreating trigger first
DROP TRIGGER IF EXISTS peer_chat_messages_search_update ON peer_chat_messages;
DROP FUNCTION IF EXISTS update_message_search_vector();

CREATE OR REPLACE FUNCTION update_message_search_vector()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.message_text, ''));
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER peer_chat_messages_search_update
  BEFORE INSERT OR UPDATE OF message_text ON peer_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_message_search_vector();

-- Fix the search function
DROP FUNCTION IF EXISTS search_peer_messages(UUID, TEXT, UUID);
CREATE OR REPLACE FUNCTION search_peer_messages(
  session_id_param UUID,
  search_query TEXT,
  user_id_param UUID
) 
RETURNS TABLE (
  id UUID,
  message_text TEXT,
  sender_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  rank REAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify user has access to this session
  IF NOT EXISTS (
    SELECT 1 FROM peer_chat_sessions 
    WHERE peer_chat_sessions.id = session_id_param
    AND (peer_chat_sessions.user_id = user_id_param OR peer_chat_sessions.peer_supporter_id = user_id_param)
  ) THEN
    RAISE EXCEPTION 'Access denied to session';
  END IF;

  RETURN QUERY
  SELECT 
    pcm.id,
    pcm.message_text,
    pcm.sender_type,
    pcm.created_at,
    ts_rank(pcm.search_vector, plainto_tsquery('english', search_query)) as rank
  FROM peer_chat_messages pcm
  WHERE pcm.session_id = session_id_param
  AND pcm.deleted_at IS NULL
  AND pcm.search_vector @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC, pcm.created_at DESC;
END;
$$;