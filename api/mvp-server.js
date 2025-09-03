/**
 * Serenity MVP - Serverless API for Vercel
 * Simple mental health check-in system
 */

// Simple in-memory storage (resets on each deployment)
const data = {
  user: { email: 'user@example.com', password: 'TestPass123!' },
  checkins: []
};

export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url, method } = req;
  
  // API Routes
  if (url === '/api/login' && method === 'POST') {
    const { email, password } = req.body || {};
    if (email === data.user.email && password === data.user.password) {
      return res.json({ success: true, token: 'mvp-token-123' });
    }
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  if (url === '/api/checkin' && method === 'POST') {
    const checkin = {
      id: Date.now(),
      mood: req.body.mood || 5,
      notes: req.body.notes || '',
      timestamp: new Date().toISOString()
    };
    data.checkins.push(checkin);
    return res.json({ success: true, checkin });
  }
  
  if (url === '/api/checkins' && method === 'GET') {
    const recent = data.checkins.slice(-7);
    return res.json({ checkins: recent });
  }
  
  if (url === '/api/crisis' && method === 'POST') {
    return res.json({ 
      success: true, 
      message: 'Crisis support activated',
      helpline: '988',
      timestamp: new Date().toISOString()
    });
  }
  
  return res.status(404).json({ error: 'Not found' });
}