
// Connection status display function
export function showConnectionStatus(status: 'connected' | 'connecting' | 'disconnected' | 'connected-polling') {
  const statusElement = document.getElementById('connection-status') || 
    (() => {
      const el = document.createElement('div');
      el.id = 'connection-status';
      el.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        padding: 10px 20px;
        border-radius: 5px;
        font-family: monospace;
        z-index: 9999;
        transition: all 0.3s ease;
        font-size: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      `;
      document.body.appendChild(el);
      return el;
    })();

  const styles = {
    connected: { bg: '#4ade80', color: '#166534' },
    'connected-polling': { bg: '#3b82f6', color: '#1e40af' },
    connecting: { bg: '#fbbf24', color: '#92400e' },
    disconnected: { bg: '#f87171', color: '#991b1b' }
  };

  const style = styles[status] || styles.disconnected;
  statusElement.style.backgroundColor = style.bg;
  statusElement.style.color = style.color;
  
  const displayText = status === 'connected-polling' ? 'Connected (Polling)' : 
                     status.charAt(0).toUpperCase() + status.slice(1);
  statusElement.textContent = `Connection: ${displayText}`;
}

export function removeConnectionStatus() {
  const statusElement = document.getElementById('connection-status');
  if (statusElement) {
    statusElement.remove();
  }
}
