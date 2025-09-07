// Shared in-memory storage (resets on each deploy)
// For production, use a database
let checkins = [];

module.exports = function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    // Return last 7 check-ins
    const recent = checkins.slice(-7);
    return res.status(200).json(recent);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}