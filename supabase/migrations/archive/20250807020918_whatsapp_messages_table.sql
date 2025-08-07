-- Create table for WhatsApp messages if not exists
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    whatsapp_message_id TEXT UNIQUE,
    from_number TEXT,
    to_number TEXT,
    message_type TEXT,
    template_name TEXT,
    message_body TEXT,
    sent_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending',
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access only
CREATE POLICY "Service role can manage WhatsApp messages"
    ON whatsapp_messages
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_message_id 
    ON whatsapp_messages(whatsapp_message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_to_number 
    ON whatsapp_messages(to_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status 
    ON whatsapp_messages(status);