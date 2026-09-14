import { useState, useEffect } from 'react';

/**
 * Normaliza la ruta actual a partir de window.location
 * Soporta pathnames (/privacy, /terms), query parameters (?page=privacy) y hashes (#privacy).
 */
export function getNormalizedRoute() {
  if (typeof window === 'undefined') return null;

  const path = window.location.pathname.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);
  const pageParam = searchParams.get('page')?.toLowerCase();
  const hash = window.location.hash.toLowerCase().replace('#', '');

  if (
    path === '/privacy' ||
    path === '/politica-privacidad' ||
    path === '/privacy-policy' ||
    pageParam === 'privacy' ||
    hash === 'privacy' ||
    hash === 'politica-privacidad'
  ) {
    return 'privacy';
  }

  if (
    path === '/terms' ||
    path === '/terminos-condiciones' ||
    path === '/terms-and-conditions' ||
    pageParam === 'terms' ||
    hash === 'terms' ||
    hash === 'terminos-condiciones'
  ) {
    return 'terms';
  }

  return null;
}

/**
 * Navega a una ruta sin recargar la página.
 * @param {string} path - Ruta destino, e.g. '/privacy', '/terms', '/'
 */
export function navigateTo(path) {
  if (typeof window === 'undefined') return;

  // Si la ruta solicitada es raíz
  if (path === '/' || path === '') {
    // Si teníamos query params de page, los limpiamos
    const url = new URL(window.location.href);
    url.searchParams.delete('page');
    url.hash = '';
    
    // Si estamos en un subdirectorio o raíz, pushState a pathname sin /privacy /terms
    let targetPath = url.pathname;
    if (targetPath.endsWith('/privacy') || targetPath.endsWith('/terms') || targetPath.endsWith('/politica-privacidad') || targetPath.endsWith('/terminos-condiciones')) {
      targetPath = targetPath.substring(0, targetPath.lastIndexOf('/')) || '/';
    }

    window.history.pushState({}, '', targetPath + url.search);
  } else {
    // Para entornos SPA donde subpáginas directas como /privacy no tienen fallback de servidor backend,
    // usamos query param o pathname directamente.
    window.history.pushState({}, '', path);
  }

  // Notificar a los suscriptores del cambio de ruta
  window.dispatchEvent(new Event('popstate'));
}

/**
 * Hook personalizado para observar cambios en la ruta actual.
 */
export function useRouter() {
  const [route, setRoute] = useState(getNormalizedRoute);

  useEffect(() => {
    const handleRouteChange = () => {
      setRoute(getNormalizedRoute());
    };

    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, []);

  return {
    route,
    navigateTo
  };
}
