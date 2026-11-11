export const LUAX_API_URL = import.meta.env?.VITE_LUAX_API_URL?.trim().replace(/\/$/, '') || '';

export function createLuaxAccess(baseUrl, fetcher = fetch, now = Date.now) {
  const origin = new URL(baseUrl);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
  if ((origin.protocol !== 'https:' && !(loopback && origin.protocol === 'http:')) || origin.origin !== baseUrl) {
    throw new Error('VITE_LUAX_API_URL must be an HTTPS origin or local HTTP origin');
  }
  const sessions = new Map();
  let generation = 0;
  const key = (role, id) => role + ':' + id;
  const unauthorized = () => Object.assign(new Error('Sesión no disponible'), { status: 401 });

  function current(scope) {
    const session = sessions.get(scope);
    if (session?.expiresAt > now()) return session;
    sessions.delete(scope);
    return null;
  }

  async function request(path, { body, scope, method = body ? 'POST' : 'GET' } = {}) {
    const session = scope ? current(scope) : null;
    if (scope && !session) throw unauthorized();
    const response = await fetcher(baseUrl + '/api' + path, {
      method,
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      headers: {
        ...(body && { 'Content-Type': 'application/json' }),
        ...(session && { Authorization: 'Bearer ' + session.token })
      },
      ...(body && { body: JSON.stringify(body) })
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 && session && sessions.get(scope) === session) sessions.delete(scope);
      throw Object.assign(new Error(data?.error || response.statusText), { status: response.status, data });
    }
    if (!data || typeof data !== 'object') throw new Error('Respuesta inválida de LUAX');
    return data;
  }

  async function authenticate(path, body, role, { conferenceId, committeeId = null, scope }) {
    const start = generation;
    const data = await request(path, { body, scope });
    if (generation !== start || typeof data.token !== 'string' || !data.token ||
        !Number.isFinite(data.expiresAt) || data.expiresAt <= now() ||
        data.role !== role || data.committeeId !== committeeId ||
        typeof data.conferenceId !== 'string' || !data.conferenceId ||
        (conferenceId && data.conferenceId !== conferenceId)) throw unauthorized();
    sessions.set(key(role, committeeId ?? conferenceId ?? data.conferenceId), data);
    return data;
  }

  const conferencePath = id => '/conferencias/' + encodeURIComponent(id);
  const committeePath = id => '/comites/' + encodeURIComponent(id);
  const checklistPath = id => conferencePath(id) + '/checklist';
  const checklistFilter = id => id ? '?comite_id=' + encodeURIComponent(id) : '';
  const checklistRequest = (id, suffix, options) =>
    request(checklistPath(id) + suffix, { ...options, scope: current(key('org', id)) ? key('org', id)
      : [...sessions.keys()].find(scope => scope.startsWith('staff:') && current(scope)?.conferenceId === id) || key('org', id) });
  const conferenceScope = id => current(key('org', id)) ? key('org', id) : key('observer', id);
  const committeeScope = (id, conferenceId) => {
    const member = [...sessions.keys()].find(scope => !scope.startsWith('org:') && !scope.startsWith('observer:') && scope.endsWith(':' + id) && current(scope));
    if (member) return member;
    const org = [...sessions.entries()].find(([scope, session]) => scope.startsWith('org:') && session.conferenceId === conferenceId && current(scope));
    if (org) return org[0];
    return key('chair', id);
  };
  const getSummary = id => request(conferencePath(id) + '/resumen', { scope: conferenceScope(id) });
  const noticeScope = (id, committee) => current(key('org', id)) ? key('org', id)
    : committee && current(committeeScope(committee, id)) ? committeeScope(committee, id) : conferenceScope(id);

  return {
    configureParticipants: (id, conferenceId, body) => request(committeePath(id) + '/credenciales', { scope: committeeScope(id, conferenceId), method: 'PUT', body }),
    async accessParticipant(id, role, password, conferenceId) {
      const scope = conferenceId && current(conferenceScope(conferenceId)) ? conferenceScope(conferenceId) : undefined;
      return authenticate(committeePath(id) + '/participantes', { role, password }, role, { committeeId: id, scope });
    },
    getNotices: (id, committee, all) => request(conferencePath(id) + '/avisos' + (all ? '?todos=true' : ''), { scope: noticeScope(id, committee) }),
    createNotice: (id, committee, body) => request(conferencePath(id) + '/avisos', { scope: noticeScope(id, committee), body }),
    deactivateNotice: (id, committee, notice) => request(conferencePath(id) + '/avisos/' + encodeURIComponent(notice) + '/desactivar', { scope: noticeScope(id, committee), method: 'PATCH' }),
    async registerConference(body) {
      await authenticate('/conferencias/registro', body, 'org', { conferenceId: body.id });
      return getSummary(body.id);
    },
    updateConference: (id, body) => request(conferencePath(id), { scope: key('org', id), method: 'PATCH', body }),
    createCommittee: (id, body) => request(conferencePath(id) + '/comites', { scope: key('org', id), body }),
    updateCommittee: (id, conferenceId, body) => request(committeePath(id), { scope: committeeScope(id, conferenceId), method: 'PATCH', body }),
    deleteCommittee: (id, conferenceId) => request(committeePath(id), { scope: key('org', conferenceId), method: 'DELETE' }),
    getCommitteeHistory: (id, conferenceId) =>
      request(committeePath(id) + '/historial-respaldo', { scope: key('org', conferenceId) }),
    restoreCommitteeHistory: (id, conferenceId, mensajes) =>
      request(committeePath(id) + '/historial-respaldo', { scope: key('org', conferenceId), body: { mensajes } }),
    socketSession: (id, conferenceId, role) => current(role ? key(role, id) : committeeScope(id, conferenceId)),
    async accessConference(id, pin) {
      if (pin || !current(conferenceScope(id))) {
        await authenticate(conferencePath(id) + '/acceso', { pin: pin || undefined, role: 'observer' },
          'observer', { conferenceId: id });
      }
      return getSummary(id);
    },
    async verifyOrganization(id, pin) {
      await authenticate(conferencePath(id) + '/acceso', { pin, role: 'org' }, 'org', { conferenceId: id });
      return { admin: true };
    },
    async verifyChair(id, pin) {
      await authenticate(committeePath(id) + '/acceso', { pin }, 'chair', { committeeId: id });
      return { ok: true, comiteId: id };
    },
    async enterChairWithoutPin(conferenceId, committeeId) {
      await authenticate(conferencePath(conferenceId) + '/sesiones', { role: 'chair', comiteId: committeeId },
        'chair', { conferenceId, committeeId, scope: key('org', conferenceId) });
    },
    getSummary,
    getChecklist: (id, committee) => checklistRequest(id, checklistFilter(committee)),
    createChecklistTask: (id, body) => checklistRequest(id, '', { body }),
    setChecklistTaskDone: (id, task, completado) => checklistRequest(id, '/' + encodeURIComponent(task), {
      method: 'PATCH', body: { completado }
    }),
    removeChecklistTask: (id, task) => checklistRequest(id, '/' + encodeURIComponent(task), { method: 'DELETE' }),
    removeCompletedChecklistTasks: (id, committee) =>
      checklistRequest(id, '/completados' + checklistFilter(committee), { method: 'DELETE' }),
    getCommittee(id, conferenceId) {
      return request(committeePath(id), {
        scope: committeeScope(id, conferenceId)
      });
    },
    hasOrganization: id => Boolean(current(key('org', id))),
    hasChair: id => Boolean(current(key('chair', id))),
    lockOrganization(id) {
      generation++;
      sessions.delete(key('org', id));
    },
    clear() {
      generation++;
      sessions.clear();
    }
  };
}

export const luaxAccess = LUAX_API_URL ? createLuaxAccess(LUAX_API_URL) : null;
