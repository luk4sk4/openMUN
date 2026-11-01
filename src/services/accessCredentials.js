import { sessionStore as localStorage } from '../utils/sessionStorage';
export function rememberAccessToken(token) {
  if (!token) return;
  try {
    const claims = JSON.parse(atob(token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')));
    const scope = claims.comiteId || claims.confId;
    if (scope) sessionStorage.setItem(`openmun_access_${scope}`, token);
    if (claims.confId) localStorage.setItem('openmun_current_conf_id', claims.confId);
  } catch (error) { console.warn('No se pudo conservar la sesión de acceso.', error); }
}

export function getAccessCredentials(confId, comiteId) {
  const conf = String(confId || localStorage.getItem('openmun_current_conf_id') || '').toLowerCase();
  const com = String(comiteId || localStorage.getItem('openmun_current_comite_id') || '').toLowerCase();
  const conferenceToken = conf && sessionStorage.getItem(`openmun_access_${conf}`);
  let isAdminToken = false;
  try { isAdminToken = JSON.parse(atob(conferenceToken.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))).role === 'secretariat'; } catch { /* A missing or expired session is checked by the server. */ }
  return {
    token: (isAdminToken && conferenceToken) || (com && sessionStorage.getItem(`openmun_access_${com}`)) || conferenceToken || '',
    adminPin: (conf && localStorage.getItem(`openmun_conf_admin_pin_${conf}`)) || '',
    chairPin: (com && localStorage.getItem(`openmun_comite_pin_${com}`)) || '',
    conferencePin: (conf && localStorage.getItem(`openmun_conf_pin_${conf}`)) || ''
  };
}

export async function authorizedFetch(url, options = {}) {
  const path = new URL(url, window.location.href).pathname.split('/');
  const confId = path[2] === 'conferencias' ? decodeURIComponent(path[3] || '') : undefined;
  const comiteId = path[2] === 'comites' ? decodeURIComponent(path[3] || '') : undefined;
  const credentials = getAccessCredentials(confId, comiteId);
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(credentials.token ? { Authorization: `Bearer ${credentials.token}` } : {}),
      'X-OpenMUN-Admin-Pin': credentials.adminPin,
      'X-OpenMUN-Chair-Pin': credentials.chairPin,
      'X-OpenMUN-Conference-Pin': credentials.conferencePin,
      ...options.headers
    }
  });
  if (response.ok) rememberAccessToken(response.headers.get('X-OpenMUN-Session'));
  return response;
}
