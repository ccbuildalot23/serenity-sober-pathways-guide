
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

    // Get the data to encrypt from request body
    const { data: plaintext } = await req.json()
    
    if (!plaintext) {
      return new Response(
        JSON.stringify({ error: 'Data is required' }),
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

    // Validate the key is strong
    const forbiddenKeys = [
      'serenity-secret-key',
      'your-secret-key',
      'default-key',
      'test-key',
      'dev-key'
    ];
    
    if (forbiddenKeys.includes(encryptionSecret) || encryptionSecret.length < 32) {
      console.error('SECURITY ERROR: Weak encryption key detected')
      return new Response(
        JSON.stringify({ error: 'Weak encryption key configuration' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Perform encryption using Web Crypto API
    const enc = new TextEncoder();
    
    // Import the key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(encryptionSecret),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    // Generate a random salt for key derivation
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    // Derive the encryption key
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
      ['encrypt']
    );

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the data
    const cipher = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plaintext)
    );

    // Combine salt, IV, and cipher for storage
    const combined = new Uint8Array(salt.byteLength + iv.byteLength + cipher.byteLength);
    combined.set(salt);
    combined.set(iv, salt.byteLength);
    combined.set(new Uint8Array(cipher), salt.byteLength + iv.byteLength);

    const encryptedData = btoa(String.fromCharCode(...combined));

    console.log('Data encrypted successfully for user:', user.id);

    return new Response(
      JSON.stringify({ encryptedData }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in encrypt-data function:', error)
    return new Response(
      JSON.stringify({ error: 'Encryption failed' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
