import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './languages'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'

// Register Service Worker for offline capability
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[OpenMUN PWA] New version available');
  },
  onOfflineReady() {
    console.log('[OpenMUN PWA] App ready to work offline');
  }
});

// Handle Vite dynamic import chunk loading errors (e.g. after a new deployment)
window.addEventListener('vite:preloadError', (event) => {
  // CRITICAL: If the user is offline, DO NOT trigger a page reload!
  // A reload while offline forces the browser to request openmun.app from network,
  // crashing the active session with the browser's "Unable to connect" screen.
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.warn('[OpenMUN] Preload chunk error ignored because user is offline. Preserving session.');
    event.preventDefault();
    return;
  }

  console.warn('[OpenMUN] Detected chunk preload error, refreshing application...', event);
  const lastReload = parseInt(sessionStorage.getItem('openmun_last_preload_reload') || '0', 10);
  const now = Date.now();
  if (now - lastReload > 8000) {
    sessionStorage.setItem('openmun_last_preload_reload', now.toString());
    window.location.reload();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

