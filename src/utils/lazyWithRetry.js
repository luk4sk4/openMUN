import React, { lazy } from 'react';

/**
 * Enhanced React.lazy wrapper that handles dynamic import failures.
 * 
 * In Single Page Applications (SPAs) deployed on platforms like Vercel/Netlify,
 * when a new build is deployed, old asset hashes are purged. A user with an active
 * session will experience a dynamic import error (TypeError: error loading dynamically imported module)
 * when attempting to load a code-split component.
 * 
 * This utility detects such chunk errors and automatically triggers a controlled page reload
 * (with session preservation) to load the latest build assets, preventing crash screens.
 * When the user is offline, reloads are strictly suppressed to avoid browser connection error screens.
 * 
 * @param {() => Promise<{ default: React.ComponentType<any> }>} componentImport 
 * @param {string} componentName 
 * @returns {React.LazyExoticComponent<React.ComponentType<any>>}
 */
export function lazyWithRetry(componentImport, componentName = 'component') {
  return lazy(async () => {
    const reloadKey = `openmun_lazy_reload_${componentName}`;
    const hasAlreadyReloaded = window.sessionStorage.getItem(reloadKey) === 'true';

    try {
      const component = await componentImport();
      // Reset reload flag on successful load
      if (hasAlreadyReloaded) {
        window.sessionStorage.removeItem(reloadKey);
      }
      return component;
    } catch (error) {
      const isDynamicChunkError =
        error?.name === 'ChunkLoadError' ||
        error?.message?.includes('dynamically imported module') ||
        error?.message?.includes('Failed to fetch dynamically imported module') ||
        error?.message?.includes('error loading dynamically imported module') ||
        error?.message?.includes('Importing a module script failed') ||
        error?.message?.includes('Load failed');

      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

      if (isDynamicChunkError) {
        // When offline, NEVER reload the page: reloading offline causes the browser
        // to navigate to the network and display a fatal "Unable to connect" screen.
        if (isOffline) {
          console.warn(`[OpenMUN LazyLoader] Cannot fetch chunk for ${componentName} while offline. Suppressing reload to preserve session.`);
          return {
            default: () => React.createElement(
              'div',
              {
                style: {
                  padding: '1.25rem',
                  textAlign: 'center',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  margin: '1rem',
                  color: 'inherit'
                }
              },
              React.createElement('p', { style: { margin: 0, fontWeight: 600, fontSize: '0.95rem' } }, 'Módulo no disponible sin conexión'),
              React.createElement(
                'p',
                { style: { margin: '6px 0 0 0', fontSize: '0.82rem', opacity: 0.8 } },
                'Este componente no se encuentra en la caché local y requiere conexión para descargarse por primera vez.'
              )
            )
          };
        }

        if (!hasAlreadyReloaded) {
          // Mark that we are attempting an automatic reload for this component
          window.sessionStorage.setItem(reloadKey, 'true');
          
          // Short timeout to allow any pending sync/state to settle
          setTimeout(() => {
            window.location.reload();
          }, 100);

          // Return a temporary null placeholder while reloading
          return { default: () => null };
        }
      }

      // If offline and reached this point, provide safe fallback rather than crashing entire view
      if (isOffline) {
        console.warn(`[OpenMUN LazyLoader] Fallback component served for ${componentName} due to offline state.`);
        return {
          default: () => React.createElement(
            'div',
            { style: { padding: '1rem', textAlign: 'center', opacity: 0.7, fontSize: '0.85rem' } },
            'Contenido no disponible temporalmente sin conexión.'
          )
        };
      }

      // If online and already reloaded once and it still fails, bubble up to ErrorBoundary
      console.error(`[OpenMUN LazyLoader] Failed to load ${componentName}:`, error);
      throw error;
    }
  });
}

export default lazyWithRetry;
