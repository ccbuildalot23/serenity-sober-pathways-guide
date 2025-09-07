module.exports = function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { email, password } = req.body;
  
  // Simple hardcoded authentication for MVP
  if (email === 'user@example.com' && password === 'TestPass123!') {
    return res.status(200).json({
      token: 'simple-token-123',
      user: { id: 1, name: 'Test User' }
    });
  }
  
  return res.status(401).json({ error: 'Invalid credentials' });
}