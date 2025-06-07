const enc = new TextEncoder();
const dec = new TextDecoder();
const secret = import.meta.env.VITE_ENCRYPTION_KEY || 'serenity-secret-key';

const getKey = async () => {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

export const encrypt = async (text: string): Promise<string> => {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
  const buff = new Uint8Array(iv.byteLength + cipher.byteLength);
  buff.set(iv);
  buff.set(new Uint8Array(cipher), iv.byteLength);
  return btoa(String.fromCharCode(...buff));
};

export const decrypt = async (cipherText: string): Promise<string> => {
  const data = Uint8Array.from(atob(cipherText), c => c.charCodeAt(0));
  const iv = data.slice(0, 12);
  const cipher = data.slice(12);
  const key = await getKey();
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return dec.decode(plain);
};