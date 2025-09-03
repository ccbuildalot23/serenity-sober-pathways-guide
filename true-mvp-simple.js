/**
 * Serenity - Mental Health Tracker MVP
 * Simple daily mood tracking and crisis support
 * Zero dependencies, maximum impact
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

// Import provider functionality
let providerModule;
try {
  providerModule = await import('./provider-mvp.js');
} catch (err) {
  console.log('Provider module not found, running patient-only mode');
}

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
  
  // Serve Provider Dashboard
  if (req.url === '/provider' && req.method === 'GET') {
    try {
      const html = readFileSync(join(__dirname, 'provider-dashboard.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(html);
    } catch (err) {
      res.writeHead(404);
      return res.end('Provider dashboard not found');
    }
  }
  
  // API Routes
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    const url = req.url;
    const method = req.method;
    
    // Check if provider module handles this route
    if (providerModule && providerModule.handleProviderRoutes) {
      const handled = providerModule.handleProviderRoutes(url, method, body, res);
      if (handled) return;
    }
    
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
║     🌟 SERENITY - MENTAL HEALTH MVP 🌟     ║
╠═══════════════════════════════════════════╣
║                                           ║
║  ✅ Simple daily mood tracking            ║
║  ✅ Crisis support resources              ║  
║  ✅ Provider dashboard with ROI           ║
║  ✅ Billing automation (CCM/BHI)          ║
║                                           ║
║  Patient Portal:  http://localhost:${PORT}/ ║
║  Provider Portal: http://localhost:${PORT}/provider ║
║                                           ║
║  Patient: user@example.com / TestPass123!  ║
║  Provider: provider@example.com / ProviderPass123! ║
║                                           ║
║  Dual value: Patients + Providers = Success ║
╚═══════════════════════════════════════════╝
  `);
});