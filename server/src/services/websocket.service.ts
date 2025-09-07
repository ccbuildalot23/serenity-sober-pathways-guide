import { Server } from 'http';
import WebSocket from 'ws';
import { logger } from '../utils/logger';

let wss: WebSocket.Server;

export const initializeWebSocket = (server: Server) => {
  wss = new WebSocket.Server({ server });
  
  wss.on('connection', (ws: WebSocket) => {
    logger.info('New WebSocket connection');
    
    ws.on('message', (message: string) => {
      logger.info('WebSocket message received:', message);
    });
    
    ws.on('close', () => {
      logger.info('WebSocket connection closed');
    });
  });
};

export const broadcast = (data: any) => {
  if (!wss) return;
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};