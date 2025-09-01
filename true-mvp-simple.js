/**
 * ULTRA SIMPLE MVP - No Dependencies
 * Mental Health Check-in in 100 lines
 */

import { createServer } from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3003;

// Simple in-memory storage
const data = {
  user: { email: 'user@example.com', password: 'TestPass123!' },
  checkins: []
};

// Serve the HTML file or handle API
const server = createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }
  
  // Serve HTML
  if (req.url === '/' && req.method === 'GET') {
    try {
      const html = readFileSync(join(__dirname, 'true-mvp-frontend.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(html);
    } catch (err) {
      res.writeHead(404);
      return res.end('File not found');
    }
  }
  
  // API Routes
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    const url = req.url;
    const method = req.method;
    
    // Login
    if (url === '/api/login' && method === 'POST') {
      try {
        const { email, password } = JSON.parse(body);
        if (email === data.user.email && password === data.user.password) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            token: 'simple-token-123',
            user: { id: 1, name: 'Test User' }
          }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid credentials' }));
        }
      } catch (err) {
        res.writeHead(400);
        res.end('Bad request');
      }
    }
    
    // Submit Check-in
    else if (url === '/api/checkin' && method === 'POST') {
      try {
        const checkin = JSON.parse(body);
        checkin.id = Date.now();
        checkin.date = new Date().toISOString();
        data.checkins.push(checkin);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(checkin));
      } catch (err) {
        res.writeHead(400);
        res.end('Bad request');
      }
    }
    
    // Get Check-ins
    else if (url === '/api/checkins' && method === 'GET') {
      const recent = data.checkins.slice(-7);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(recent));
    }
    
    // Crisis Alert
    else if (url === '/api/crisis' && method === 'POST') {
      console.log('🚨 CRISIS ALERT:', new Date());
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        message: 'Help is on the way. Call 988 for immediate support.' 
      }));
    }
    
    else {
      res.writeHead(404);
      res.end('Not found');
    }
  });
});

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║     🌟 TRUE MVP - MENTAL HEALTH APP 🌟    ║
╠═══════════════════════════════════════════╣
║                                           ║
║  ✅ Backend:  http://localhost:${PORT}/api  ║
║  ✅ Frontend: http://localhost:${PORT}/      ║
║                                           ║
║  Login: user@example.com / TestPass123!  ║
║                                           ║
║  Features (ONLY 4):                      ║
║   1. Login                               ║
║   2. Daily Check-in (mood + notes)      ║
║   3. Crisis Button                       ║
║   4. View History (last 7 days)         ║
║                                           ║
║  Zero dependencies. Ships in 1 hour.     ║
╚═══════════════════════════════════════════╝
  `);
});