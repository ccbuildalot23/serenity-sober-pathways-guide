
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the request is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the encrypted data from request body
    const { encryptedData } = await req.json()
    
    if (!encryptedData) {
      return new Response(
        JSON.stringify({ error: 'Encrypted data is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the encryption secret from environment (Supabase secrets)
    const encryptionSecret = Deno.env.get('ENCRYPTION_SECRET')
    
    if (!encryptionSecret) {
      console.error('ENCRYPTION_SECRET not configured in Supabase secrets')
      return new Response(
        JSON.stringify({ error: 'Encryption key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Perform decryption using Web Crypto API
    const enc = new TextEncoder();
    const data = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    // Extract salt, IV, and cipher
    const salt = data.slice(0, 16);
    const iv = data.slice(16, 28);
    const cipher = data.slice(28);

    // Import the key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(encryptionSecret),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    // Derive the decryption key using the same salt
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Decrypt the data
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipher
    );

    const dec = new TextDecoder();
    const decryptedData = dec.decode(plain);

    console.log('Data decrypted successfully for user:', user.id);

    return new Response(
      JSON.stringify({ decryptedData }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in decrypt-data function:', error)
    return new Response(
      JSON.stringify({ error: 'Decryption failed' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
