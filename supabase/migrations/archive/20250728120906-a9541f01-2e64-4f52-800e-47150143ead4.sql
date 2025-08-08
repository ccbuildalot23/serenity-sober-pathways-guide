-- Add enhanced message features to peer_chat_messages
ALTER TABLE peer_chat_messages 
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES peer_chat_messages(id),
ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- Create index for message search
CREATE INDEX IF NOT EXISTS idx_peer_chat_messages_search ON peer_chat_messages USING gin(search_vector);

-- Create trigger to update search vector
CREATE OR REPLACE FUNCTION update_message_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.message_text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER peer_chat_messages_search_update
  BEFORE INSERT OR UPDATE OF message_text ON peer_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_message_search_vector();

-- Create message bookmarks table
CREATE TABLE IF NOT EXISTS peer_message_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message_id UUID NOT NULL REFERENCES peer_chat_messages(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, message_id)
);

-- Enable RLS on bookmarks
ALTER TABLE peer_message_bookmarks ENABLE ROW LEVEL SECURITY;

-- Create policies for bookmarks
CREATE POLICY "Users can manage their own bookmarks" 
ON peer_message_bookmarks 
FOR ALL 
USING (auth.uid() = user_id);

-- Create presence status table
CREATE TABLE IF NOT EXISTS peer_supporter_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  custom_message TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on presence
ALTER TABLE peer_supporter_presence ENABLE ROW LEVEL SECURITY;

-- Create policies for presence
CREATE POLICY "Users can update their own presence" 
ON peer_supporter_presence 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view presence status" 
ON peer_supporter_presence 
FOR SELECT 
USING (true);

-- Create message audit trail table
CREATE TABLE IF NOT EXISTS peer_message_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES peer_chat_messages(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'edited', 'deleted', 'reaction_added', 'reaction_removed')),
  old_content TEXT,
  new_content TEXT,
  user_id UUID NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS on audit trail
ALTER TABLE peer_message_audit ENABLE ROW LEVEL SECURITY;

-- Create policies for audit trail
CREATE POLICY "Users can view audit for their messages" 
ON peer_message_audit 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM peer_chat_messages 
  WHERE peer_chat_messages.id = peer_message_audit.message_id
  AND EXISTS (
    SELECT 1 FROM peer_chat_sessions 
    WHERE peer_chat_sessions.id = peer_chat_messages.session_id
    AND (peer_chat_sessions.user_id = auth.uid() OR peer_chat_sessions.peer_supporter_id = auth.uid())
  )
));

CREATE POLICY "System can create audit entries" 
ON peer_message_audit 
FOR INSERT 
WITH CHECK (true);

-- Create updated_at trigger for presence
CREATE TRIGGER update_presence_updated_at
  BEFORE UPDATE ON peer_supporter_presence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to clean up old typing indicators (already exists but ensuring it's there)
-- The cleanup_old_typing_indicators function already exists in the database

-- Create function for message search
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