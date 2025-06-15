
import { log } from './debugUtils';
import { showConnectionStatus } from './connectionStatusDisplay';

// WebSocket debugging interceptor
export function setupWebSocketDebugging() {
  if (typeof window === 'undefined' || (window as any).wsDebuggingSetup) return;
  
  const OriginalWebSocket = window.WebSocket;
  
  // Create a proper constructor function that extends the original
  function DebugWebSocket(url: string | URL, protocols?: string | string[]) {
    log('websocket', 'WebSocket connection attempt', { url: url.toString() });
    
    const ws = new OriginalWebSocket(url, protocols);
    
    ws.addEventListener('open', () => {
      log('websocket', 'WebSocket opened', { url: url.toString() });
      showConnectionStatus('connected');
    });
    
    ws.addEventListener('close', (event) => {
      log('websocket', 'WebSocket closed', {
        url: url.toString(),
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
      showConnectionStatus('disconnected');
    });
    
    ws.addEventListener('error', (error) => {
      log('error', 'WebSocket error', { url: url.toString(), error });
    });
    
    ws.addEventListener('message', (event) => {
      if (event.data.includes('ping') || event.data.includes('pong')) {
        log('websocket', 'Heartbeat received', { url: url.toString() });
        // Update connection monitor if available
        if ((window as any).realtimeConnectionMonitor) {
          (window as any).realtimeConnectionMonitor.updatePingTime();
        }
      }
    });
    
    return ws;
  }
  
  // Copy static properties from original WebSocket
  DebugWebSocket.prototype = OriginalWebSocket.prototype;
  DebugWebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
  DebugWebSocket.OPEN = OriginalWebSocket.OPEN;
  DebugWebSocket.CLOSING = OriginalWebSocket.CLOSING;
  DebugWebSocket.CLOSED = OriginalWebSocket.CLOSED;
  
  // Replace the global WebSocket with our debug version
  window.WebSocket = DebugWebSocket as any;
  
  (window as any).wsDebuggingSetup = true;
  log('websocket', 'WebSocket debugging interceptor setup complete');
}
