const { randomBytes, scryptSync, timingSafeEqual, createHmac, createHash } = require('node:crypto');

function hashPin(pin) {
  if (!pin || /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{64}$/.test(String(pin))) return pin || null;
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(String(pin), salt, 32).toString('hex')}`;
}

function verifyPin(pin, stored) {
  if (typeof pin !== 'string' || pin.length > 128 || !stored) return false;
  const parts = /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{64}$/.test(stored) ? stored.split('$') : [stored];
  const actual = parts[0] === 'scrypt' ? scryptSync(pin.trim(), parts[1], 32) : Buffer.from(pin.trim());
  const expected = parts[0] === 'scrypt' ? Buffer.from(parts[2], 'hex') : Buffer.from(stored);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function publicState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return {};
  const allowed = ['version', 'comision', 'nombreComite', 'tipoSesion', 'paises', 'oradoresCola', 'oradoresCaucus', 'caucusActivo', 'agendaSesion', 'votacionSesion', 'mociones', 'enmiendasSesion', 'registroIntervenciones', 'historicoMociones', 'roomSettings', 'speakingRequests', 'announcements'];
  const clean = Object.fromEntries(allowed.filter(k => k in state).map(k => [k, state[k]]));
  if (Array.isArray(clean.paises)) clean.paises = clean.paises.map(p => typeof p === 'object' && p ? {
    id: p.id, nombre: p.nombre, bandera: p.bandera || p.flag, estatus: p.estatus, veto: p.veto || p.tieneVeto
  } : p);
  return clean;
}

function removeStoredCredentials(state) {
  for (const key of ['pin_mesa', 'pinMesa', 'pin_admin', 'pin_acceso', 'secretPassword', 'staffPassword', 'backroomPassword', 'ownerToken']) delete state[key];
  if (state.localStorageSnapshot && typeof state.localStorageSnapshot === 'object') {
    for (const key of Object.keys(state.localStorageSnapshot)) if (/^openmun_(conf_.*pin|comite_pin|secret_pass|staff_pass|backroom_pass|access_|room_owner_)/.test(key)) delete state.localStorageSnapshot[key];
  }
  return state;
}

function canReadNote(note, identity) {
  if (!note || !identity) return false;
  const role = identity.role;
  const country = String(identity.country || '').toLowerCase().trim();
  const from = String(note.from || '').toLowerCase().trim();
  const to = String(note.to || '').toUpperCase().trim();
  if (role === 'chair' || role === 'secretariat') return true;
  if (note.status === 'pending' || note.status === 'rejected') return role === 'staff' || (role === 'delegate' && country && from === country);
  if (role === 'staff') return Boolean(note.reviewedAt) || to === 'STAFF' || ['CHAIR', 'MESA', 'MESA DE PRESIDENCIA', 'TODOS', 'ALL'].includes(to) || note.fromRole === 'staff' || note.fromRole === 'chair' || ['paje', 'logistica'].includes(note.type);
  if (role === 'backroom') return ['BACKROOM', 'TODOS', 'ALL'].includes(to) || note.fromRole === 'backroom';
  return role === 'delegate' && country && (to.toLowerCase() === country || from === country || ['TODOS', 'ALL'].includes(to));
}

function createSecurity(db) {
  const secret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');
  const conference = id => db.prepare('SELECT * FROM conferencias WHERE id = ?').get(String(id || '').toLowerCase());
  const committee = id => db.prepare('SELECT * FROM comites WHERE id = ?').get(String(id || '').toLowerCase());
  const version = identity => {
    const conf = conference(identity.confId);
    const com = identity.comiteId && committee(identity.comiteId);
    return createHash('sha256').update(`${conf?.pin_admin || ''}|${conf?.pin_acceso || ''}|${com?.pin_mesa || ''}`).digest('hex');
  };
  function sign(identity) {
    const payload = Buffer.from(JSON.stringify({ ...identity, version: version(identity), expires: Date.now() + 12 * 60 * 60 * 1000 })).toString('base64url');
    return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
  }
  function verify(token) {
    try {
      const [payload, signature] = String(token || '').split('.');
      const expected = createHmac('sha256', secret).update(payload).digest('base64url');
      if (!signature || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
      const identity = JSON.parse(Buffer.from(payload, 'base64url').toString());
      if (identity.expires <= Date.now() || identity.version !== version(identity)) return null;
      return identity;
    } catch { return null; }
  }
  function identify(credentials, confId, comiteId) {
    const conf = conference(confId);
    if (!conf) return null;
    const tokenIdentity = verify(credentials.token);
    const tokenMatches = tokenIdentity && tokenIdentity.confId === confId && (!tokenIdentity.comiteId || !comiteId || tokenIdentity.comiteId === comiteId);
    if (tokenMatches && tokenIdentity.role !== 'general') return tokenIdentity;
    if (verifyPin(credentials.adminPin, conf.pin_admin)) return { confId, role: 'secretariat' };
    const com = comiteId && committee(comiteId);
    if (com && verifyPin(credentials.chairPin, com.pin_mesa)) return { confId, comiteId, role: 'chair' };
    if (tokenMatches) return tokenIdentity;
    if (!conf.pin_acceso || verifyPin(credentials.conferencePin, conf.pin_acceso)) return { confId, role: 'general' };
    return null;
  }
  function middleware(req, res, next) {
    const parts = req.path.split('/').filter(Boolean);
    if (parts[0] !== 'api' || (parts[1] === 'conferencias' && parts.length === 2 && req.method === 'POST')) return next();
    if (parts[1] === 'supabase') {
      if (req.method === 'GET' && parts[2] === 'status') return next();
      return res.status(403).json({ error: 'Operación reservada al servidor.' });
    }
    if (req.body) {
      const textFields = ['id', 'nombre', 'pin', 'pin_mesa', 'pin_admin_actual', 'nuevo_pin_admin', 'pin_acceso', 'tipo_sesion', 'topico_actual', 'mensaje', 'emisor', 'tipo', 'titulo', 'asignado_a', 'email_admin'];
      if (textFields.some(key => req.body[key] != null && (typeof req.body[key] !== 'string' || req.body[key].length > (key.includes('pin') ? 128 : 10000)))) return res.status(400).json({ error: 'Un campo de texto tiene un tipo o tamaño incorrecto.' });
      if (req.body.datos_json !== undefined) {
        try {
          const state = typeof req.body.datos_json === 'string' ? JSON.parse(req.body.datos_json) : req.body.datos_json;
          if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error();
          const arrays = ['paises', 'oradoresCola', 'oradoresCaucus', 'mociones', 'historicoMociones', 'registroIntervenciones', 'notes', 'eventosCrisis', 'announcements'];
          if (arrays.some(key => state[key] !== undefined && !Array.isArray(state[key]))) throw new Error();
          for (const key of ['agendaSesion', 'caucusActivo', 'votacionSesion', 'enmiendasSesion']) if (state[key] != null && (typeof state[key] !== 'object' || Array.isArray(state[key]))) throw new Error();
          req.body.datos_json = removeStoredCredentials(state);
        } catch { return res.status(400).json({ error: 'El estado del comité no contiene una sesión JSON válida.' }); }
      }
    }
    let com = parts[1] === 'comites' ? committee(parts[2]) : null;
    let confId = parts[1] === 'conferencias' ? parts[2]?.toLowerCase() : com?.conferencia_id;
    if (['avisos', 'checklist'].includes(parts[1]) && parts[2]) {
      const table = parts[1] === 'avisos' ? 'avisos' : 'checklist_staff';
      const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(parts[2]);
      if (!row) return res.status(404).json({ error: 'Registro no encontrado.' });
      confId = row.conferencia_id;
      if (row.comite_id) com = committee(row.comite_id);
      req.record = row;
    }
    if (!confId) return res.status(404).json({ error: 'Recurso no encontrado.' });
    const credentials = {
      token: req.body?.pin_admin_actual ? '' : req.headers.authorization?.replace(/^Bearer /i, ''),
      adminPin: req.headers['x-openmun-admin-pin'] || req.body?.pin_admin_actual,
      chairPin: req.headers['x-openmun-chair-pin'], conferencePin: req.headers['x-openmun-conference-pin']
    };
    const access = parts[parts.length - 1] === 'acceso' && req.method === 'POST';
    if (access) {
      if (com) credentials.chairPin = req.body?.pin;
      else credentials.conferencePin = req.body?.pin;
    }
    let identity = identify(credentials, confId, com?.id);
    if (access && com) {
      if (identity?.role !== 'secretariat' && com.pin_mesa && !verifyPin(credentials.chairPin, com.pin_mesa)) return res.status(401).json({ error: 'PIN de Mesa Directiva incorrecto.' });
      if (identity && identity.role !== 'secretariat' && !com.pin_mesa) identity = { confId, comiteId: com.id, role: 'chair' };
    }
    if (!identity) return res.status(401).json({ error: 'Credenciales de acceso requeridas o incorrectas.' });
    const privileged = ['secretariat', 'chair', 'staff'].includes(identity.role);
    if (parts[1] === 'avisos' && req.method !== 'GET' && identity.role !== 'secretariat' && req.record?.creado_por !== `${identity.role}:${identity.comiteId || ''}`) return res.status(403).json({ error: 'Solo puedes retirar los avisos de tu rol y comité.' });
    if (identity.comiteId && parts[1] === 'conferencias' && parts.includes('checklist') && req.method === 'POST') req.body.comite_id = identity.comiteId;
    const conferenceWrite = parts[1] === 'conferencias' && (parts.length === 3 || parts[3] === 'comites');
    if (req.method !== 'GET' && !access && (!privileged || (conferenceWrite && identity.role !== 'secretariat'))) return res.status(403).json({ error: 'No tienes permisos para esta operación.' });
    if (parts.includes('checklist') && !privileged) return res.status(403).json({ error: 'Acceso exclusivo de staff y organización.' });
    if (com && identity.comiteId && identity.comiteId !== com.id) return res.status(403).json({ error: 'El comité no pertenece a esta sesión.' });
    if (identity.role === 'chair' && req.method !== 'GET' && com && identity.comiteId !== com.id) return res.status(403).json({ error: 'Comité incorrecto.' });
    req.identity = identity;
    res.setHeader('X-OpenMUN-Session', sign(identity));
    next();
  }
  return { conference, committee, sign, verify, identify, middleware };
}

module.exports = { hashPin, verifyPin, publicState, canReadNote, createSecurity, removeStoredCredentials };
