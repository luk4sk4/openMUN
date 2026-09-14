import { lazy } from 'react';

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

      if (isDynamicChunkError && !hasAlreadyReloaded) {
        // Mark that we are attempting an automatic reload for this component
        window.sessionStorage.setItem(reloadKey, 'true');
        
        // Short timeout to allow any pending sync/state to settle
        setTimeout(() => {
          window.location.reload();
        }, 100);

        // Return a temporary null placeholder while reloading
        return { default: () => null };
      }

      // If we've already reloaded once and it still fails, bubble up to ErrorBoundary
      console.error(`[OpenMUN LazyLoader] Failed to load ${componentName}:`, error);
      throw error;
    }
  });
}

export default lazyWithRetry;
