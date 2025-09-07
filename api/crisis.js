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
  
  // Log crisis alert (in production, this would trigger notifications)
  console.log('🚨 CRISIS ALERT:', new Date().toISOString(), req.body);
  
  return res.status(200).json({
    message: 'Help is on the way. Call 988 for immediate support.',
    resources: [
      '988 - Suicide & Crisis Lifeline',
      'Text HOME to 741741 - Crisis Text Line',
      '1-800-273-8255 - National Suicide Prevention Lifeline'
    ]
  });
}