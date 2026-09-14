import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './languages'
import App from './App.jsx'

// Handle Vite dynamic import chunk loading errors (e.g. after a new deployment)
window.addEventListener('vite:preloadError', (event) => {
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

