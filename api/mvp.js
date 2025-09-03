// Vercel serverless function wrapper for MVP
export default function handler(req, res) {
  // Import and run the MVP server logic
  import('../true-mvp-simple.js').then(() => {
    res.status(200).json({ message: 'MVP server running' });
  }).catch(err => {
    res.status(500).json({ error: err.message });
  });
}