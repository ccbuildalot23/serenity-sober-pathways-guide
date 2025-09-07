// In-memory storage (resets on each deploy)
// For production, use a database like Supabase, MongoDB, or PostgreSQL
let checkins = [];

module.exports = function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'POST') {
    // Submit a new check-in
    const checkin = req.body;
    checkin.id = Date.now();
    checkin.date = new Date().toISOString();
    checkins.push(checkin);
    
    // Keep only last 30 check-ins to prevent memory issues
    if (checkins.length > 30) {
      checkins = checkins.slice(-30);
    }
    
    return res.status(200).json(checkin);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}