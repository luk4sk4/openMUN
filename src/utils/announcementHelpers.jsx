import React from 'react';
import { Globe, Users, Shield, Landmark, MessageSquare, AlertCircle, AlertTriangle, Info } from 'lucide-react';

/**
 * Constantes y definiciones de destinos para avisos
 */
export const CODIGOS_DESTINO = {
  GLOBAL: 'GLOBAL',
  SECRETARIA: 'SECRETARIA',
  STAFF_ALL: 'STAFF_ALL',
  CHAIRS_ALL: 'CHAIRS_ALL'
};

/**
 * Genera la lista completa y estructurada de destinatarios disponibles
 * agrupada de forma lógica para su uso en selectores de cualquier vista.
 *
 * @param {Array} comites - Lista de comités activos en la conferencia
 * @param {string} rolActual - Rol del emisor ('chair'|'staff'|'staff_global'|'secretaria'|'organizacion')
 * @param {string} currentComiteId - ID del comité actual si aplica
 */
export const obtenerOpcionesDestino = (comites = [], rolActual = 'mesa', currentComiteId = null) => {
  const opcionesGenerales = [
    { value: 'GLOBAL', label: '📢 Toda la Conferencia (Global)', icon: Globe },
    { value: 'SECRETARIA', label: '🛡️ Organización / Secretaría General', icon: Shield },
    { value: 'STAFF_ALL', label: '👥 Todo el Equipo de Staff', icon: Users },
    { value: 'CHAIRS_ALL', label: '🏛️ Todas las Mesas Directivas', icon: Landmark }
  ];

  // Si el emisor está en un comité, añadir accesos rápidos locales
  const opcionesLocales = [];
  if (currentComiteId) {
    const comiteActual = comites.find(c => String(c.id).toLowerCase() === String(currentComiteId).toLowerCase());
    const comiteNombre = comiteActual?.nombre || currentComiteId;

    if (rolActual === 'chair' || rolActual === 'mesa') {
      opcionesLocales.push({
        value: `STAFF_COMITE_${currentComiteId}`,
        label: `👥 Staff Asignado a mi Sala (${comiteNombre})`
      });
      opcionesLocales.push({
        value: currentComiteId,
        label: `🌐 Mi Comité Completo (${comiteNombre})`
      });
    } else if (rolActual === 'staff') {
      opcionesLocales.push({
        value: `CHAIR_${currentComiteId}`,
        label: `🏛️ Mesa Directiva de mi Sala (${comiteNombre})`
      });
      opcionesLocales.push({
        value: currentComiteId,
        label: `🌐 Mi Comité Completo (${comiteNombre})`
      });
    }
  }

  // Grupos por cada comité de la conferencia
  const gruposMesas = (comites || []).map(c => ({
    value: `CHAIR_${c.id}`,
    comiteId: c.id,
    label: `🏛️ Mesa de ${c.nombre || c.id}`
  }));

  const gruposStaff = (comites || []).map(c => ({
    value: `STAFF_COMITE_${c.id}`,
    comiteId: c.id,
    label: `👥 Staff de ${c.nombre || c.id}`
  }));

  const gruposSalas = (comites || []).map(c => ({
    value: c.id,
    comiteId: c.id,
    label: `🌐 Sala Completa de ${c.nombre || c.id}`
  }));

  return {
    opcionesGenerales,
    opcionesLocales,
    gruposMesas,
    gruposStaff,
    gruposSalas
  };
};

/**
 * Normaliza un ID de comité o destinatario eliminando prefijos de rol y comite_, y pasando a minúsculas.
 *
 * @param {string} id - ID a normalizar
 * @returns {string}
 */
export const normalizarIdComite = (id) => {
  if (!id) return '';
  let str = String(id).trim().toLowerCase();
  let prev;
  do {
    prev = str;
    str = str
      .replace(/^(chair|mesa|staff_comite|staff|comite)[\s_-]+/i, '')
      .replace(/^(comite|mesa)[\s_-]*/i, '');
  } while (str !== prev && str.length > 0);
  return str;
};


/**
 * Obtiene la etiqueta descriptiva, icono y colores asociados a un código de destino.
 *
 * @param {string} comiteId - El código guardado en el aviso (`comite_id`)
 * @param {Array} comites - Lista de comités de la conferencia
 */
export const obtenerEtiquetaDestino = (comiteId, comites = []) => {
  if (!comiteId || comiteId === 'GLOBAL' || comiteId === '' || comiteId === 'ALL' || comiteId === 'TODOS') {
    return {
      label: 'Toda la Conferencia',
      shortLabel: 'Global',
      icon: Globe,
      badgeBg: 'rgba(59, 130, 246, 0.15)',
      badgeColor: '#3b82f6',
      badgeBorder: 'rgba(59, 130, 246, 0.35)'
    };
  }

  const clean = String(comiteId).trim();
  const cleanUpper = clean.toUpperCase();

  if (cleanUpper === 'SECRETARIA' || cleanUpper === 'ORGANIZACION') {
    return {
      label: 'Organización / Secretaría',
      shortLabel: 'Organización',
      icon: Shield,
      badgeBg: 'rgba(139, 92, 246, 0.15)',
      badgeColor: '#8b5cf6',
      badgeBorder: 'rgba(139, 92, 246, 0.35)'
    };
  }

  if (cleanUpper === 'STAFF_ALL' || cleanUpper === 'STAFF_GLOBAL') {
    return {
      label: 'Todo el Staff',
      shortLabel: 'Todo Staff',
      icon: Users,
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      badgeColor: '#f59e0b',
      badgeBorder: 'rgba(245, 158, 11, 0.35)'
    };
  }

  if (['CHAIRS_ALL', 'CHAIR_ALL', 'MESAS_ALL', 'MESA_ALL', 'CHAIR_GLOBAL', 'MESA_GLOBAL'].includes(cleanUpper)) {
    return {
      label: 'Todas las Mesas',
      shortLabel: 'Todas Mesas',
      icon: Landmark,
      badgeBg: 'rgba(16, 185, 129, 0.15)',
      badgeColor: '#10b981',
      badgeBorder: 'rgba(16, 185, 129, 0.35)'
    };
  }

  if (cleanUpper.startsWith('STAFF_COMITE_') || cleanUpper.startsWith('STAFF_')) {
    const rawId = normalizarIdComite(clean);
    const comite = (comites || []).find(c => normalizarIdComite(c.id) === rawId);
    const nombre = comite?.nombre || rawId;
    return {
      label: `Staff de ${nombre}`,
      shortLabel: `Staff (${nombre})`,
      icon: Users,
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      badgeColor: '#f59e0b',
      badgeBorder: 'rgba(245, 158, 11, 0.35)'
    };
  }

  if (cleanUpper.startsWith('CHAIR_') || cleanUpper.startsWith('MESA_')) {
    const rawId = normalizarIdComite(clean);
    const comite = (comites || []).find(c => normalizarIdComite(c.id) === rawId);
    const nombre = comite?.nombre || rawId;
    return {
      label: `Mesa de ${nombre}`,
      shortLabel: `Mesa (${nombre})`,
      icon: Landmark,
      badgeBg: 'rgba(16, 185, 129, 0.15)',
      badgeColor: '#10b981',
      badgeBorder: 'rgba(16, 185, 129, 0.35)'
    };
  }

  // Si es un ID directo de comité (ej: 'c1' o 'COMITE_c1')
  const rawId = normalizarIdComite(clean);
  const comite = (comites || []).find(c => normalizarIdComite(c.id) === rawId);
  const nombre = comite?.nombre || rawId;

  return {
    label: `Sala de ${nombre}`,
    shortLabel: nombre,
    icon: Globe,
    badgeBg: 'rgba(59, 130, 246, 0.15)',
    badgeColor: '#3b82f6',
    badgeBorder: 'rgba(59, 130, 246, 0.35)'
  };
};

/**
 * Parsea el texto del mensaje buscando patrones de destinatario al inicio como `[Para X]`, `[Para Todo Staff]`, etc.
 * Retorna un componente con el tag estilizado como badge y el resto del texto formateado.
 *
 * @param {string} mensaje - El texto del mensaje recibido
 * @param {string} comiteId - Destino guardado en el aviso si no hay tag en el texto
 * @param {Array} comites - Lista de comités
 */
export const formatearMensajeAviso = (mensaje, comiteId = null, comites = []) => {
  if (!mensaje || typeof mensaje !== 'string') return mensaje;

  // Coincide con [Para ...] o [PARA ...] al inicio del mensaje
  const match = mensaje.match(/^(\[(?:Para|PARA|para)\s+([^\]]+)\])\s*(.*)/s);

  if (match) {
    const [_, fullTag, targetName, contenidoRestante] = match;
    const targetClean = targetName.trim();
    const targetLower = targetClean.toLowerCase();

    let badgeBg = 'rgba(59, 130, 246, 0.15)';
    let badgeColor = '#3b82f6';
    let badgeBorder = 'rgba(59, 130, 246, 0.35)';

    if (targetLower.includes('urgente') || targetLower.includes('alerta') || targetLower.includes('seguridad')) {
      badgeBg = 'rgba(239, 68, 68, 0.15)';
      badgeColor = '#ef4444';
      badgeBorder = 'rgba(239, 68, 68, 0.35)';
    } else if (targetLower.includes('staff') || targetLower.includes('logistica') || targetLower.includes('logística')) {
      badgeBg = 'rgba(245, 158, 11, 0.15)';
      badgeColor = '#f59e0b';
      badgeBorder = 'rgba(245, 158, 11, 0.35)';
    } else if (targetLower.includes('secretar') || targetLower.includes('organizac') || targetLower.includes('presidencia')) {
      badgeBg = 'rgba(139, 92, 246, 0.15)';
      badgeColor = '#a855f7';
      badgeBorder = 'rgba(139, 92, 246, 0.35)';
    }

    return (
      <div style={{ display: 'inline', wordBreak: 'break-word' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.74rem',
            fontWeight: '800',
            padding: '0.12rem 0.5rem',
            borderRadius: '6px',
            backgroundColor: badgeBg,
            color: badgeColor,
            border: `1px solid ${badgeBorder}`,
            marginRight: '0.45rem',
            letterSpacing: '0.02em',
            verticalAlign: 'baseline',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}
        >
          <span style={{ opacity: 0.75, fontWeight: '600' }}>Para:</span>
          <span>{targetClean}</span>
        </span>
        <span>{contenidoRestante}</span>
      </div>
    );
  }

  // Si no tiene tag en texto pero tiene un comiteId específico que no es global
  if (comiteId && comiteId !== 'GLOBAL' && comiteId !== 'ALL' && comiteId !== 'TODOS') {
    const meta = obtenerEtiquetaDestino(comiteId, comites);
    return (
      <div style={{ display: 'inline', wordBreak: 'break-word' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.74rem',
            fontWeight: '800',
            padding: '0.12rem 0.5rem',
            borderRadius: '6px',
            backgroundColor: meta.badgeBg,
            color: meta.badgeColor,
            border: `1px solid ${meta.badgeBorder}`,
            marginRight: '0.45rem',
            letterSpacing: '0.02em',
            verticalAlign: 'baseline',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}
        >
          <span style={{ opacity: 0.75, fontWeight: '600' }}>Para:</span>
          <span>{meta.shortLabel}</span>
        </span>
        <span>{mensaje}</span>
      </div>
    );
  }

  return <span>{mensaje}</span>;
};

/**
 * Filtra si un aviso de Base de Datos le corresponde a la entidad/rol actual.
 *
 * Reglas estrictas:
 * - Chair / Mesa: solo ve su mesa, mesa global, global, y su comité. NUNCA ve mensajes a staff ni secretaría.
 * - Staff: solo ve su comité, staff de su comité, staff global, y global. NUNCA ve mensajes a mesas ni secretaría.
 * - Delegate: solo ve su comité y global.
 * - Secretaría General / Admin: ve todo.
 *
 * @param {object} aviso - Objeto de aviso desde la base de datos
 * @param {object} context - Contexto del visor { role: 'secretaria'|'staff'|'staff_global'|'chair'|'delegate', currentComiteId: string }
 * @returns {boolean}
 */
export const correspondeAviso = (aviso, { role = 'staff', currentComiteId = null, currentComiteNombre = null, comites = [] } = {}) => {
  if (!aviso) return false;

  const userRole = String(role || 'staff').trim().toLowerCase();

  // 1. La Secretaría General / Organización / Admin siempre ve TODO
  if (userRole === 'secretaria' || userRole === 'organizacion' || userRole === 'admin') {
    return true;
  }

  const rawDestino = aviso.comite_id ? String(aviso.comite_id).trim() : '';
  const destinoUpper = rawDestino.toUpperCase();

  // 2. Mensajes Globales (sin comite_id o 'GLOBAL'/'ALL'/'TODOS') -> Llegan a todos los roles
  const esGlobal = !rawDestino || destinoUpper === 'GLOBAL' || destinoUpper === 'ALL' || destinoUpper === 'TODOS';
  if (esGlobal) {
    return true;
  }

  const normCurrent = normalizarIdComite(currentComiteId);
  const normNombre = normalizarIdComite(currentComiteNombre);
  const rawCurrent = currentComiteId ? String(currentComiteId).trim().toLowerCase() : '';

  // Buscar comité coincidente en la lista de comités si está disponible
  const matchingComite = (comites || []).find(c => {
    if (!c) return false;
    const cid = String(c.id || '').trim().toLowerCase();
    const cnom = String(c.nombre || '').trim().toLowerCase();
    const normCid = normalizarIdComite(c.id);
    const normCnom = normalizarIdComite(c.nombre);
    return (
      (rawCurrent && cid === rawCurrent) ||
      (normCurrent && normCid === normCurrent) ||
      (normCurrent && normCnom === normCurrent) ||
      (normNombre && normCnom === normNombre) ||
      (normNombre && normCid === normNombre)
    );
  });

  const matchingIdNorm = matchingComite ? normalizarIdComite(matchingComite.id) : null;
  const matchingNomNorm = matchingComite ? normalizarIdComite(matchingComite.nombre) : null;
  const matchingRawId = matchingComite ? String(matchingComite.id).trim().toLowerCase() : null;

  const coincideComite = (normTarget, rawTarget) => {
    if (!normTarget && !rawTarget) return false;
    const cleanTarget = (normTarget || '').toLowerCase();
    const cleanRaw = (rawTarget || '').toLowerCase();

    // 1. Coincidencia con ID actual o Nombre actual normalizado (bidireccional)
    if (normCurrent && (cleanTarget === normCurrent || cleanRaw === rawCurrent || cleanRaw.endsWith(rawCurrent) || rawCurrent.endsWith(cleanRaw))) return true;
    if (rawCurrent && (cleanRaw === rawCurrent || cleanRaw.endsWith(rawCurrent) || rawCurrent.endsWith(cleanRaw))) return true;
    if (normNombre && (cleanTarget === normNombre || cleanRaw === normNombre || cleanRaw.includes(normNombre) || normNombre.includes(cleanTarget) || cleanTarget.includes(normNombre))) return true;

    // 2. Coincidencia con datos del comité en la lista de comités de la conferencia
    if (matchingIdNorm && (cleanTarget === matchingIdNorm || cleanRaw === matchingRawId || cleanRaw.endsWith(matchingRawId) || matchingRawId.endsWith(cleanRaw))) return true;
    if (matchingNomNorm && (cleanTarget === matchingNomNorm || cleanRaw === matchingNomNorm || cleanRaw.includes(matchingNomNorm) || matchingNomNorm.includes(cleanTarget))) return true;
    if (matchingRawId && (cleanRaw === matchingRawId || cleanRaw.endsWith(matchingRawId) || matchingRawId.endsWith(cleanRaw))) return true;

    // 3. Búsqueda directa del comité objetivo en la lista
    const targetComiteObj = (comites || []).find(c => {
      if (!c) return false;
      const cid = String(c.id || '').trim().toLowerCase();
      const cnom = String(c.nombre || '').trim().toLowerCase();
      const nCid = normalizarIdComite(c.id);
      const nCnom = normalizarIdComite(c.nombre);
      return cleanTarget === cid || cleanTarget === nCid || cleanRaw === cid || cleanTarget === cnom || cleanTarget === nCnom || cleanRaw === cnom;
    });

    if (targetComiteObj) {
      const tid = String(targetComiteObj.id || '').trim().toLowerCase();
      const tnom = String(targetComiteObj.nombre || '').trim().toLowerCase();
      const nTid = normalizarIdComite(targetComiteObj.id);
      const nTnom = normalizarIdComite(targetComiteObj.nombre);
      if (rawCurrent && (rawCurrent === tid || rawCurrent.endsWith(tid) || tid.endsWith(rawCurrent))) return true;
      if (normCurrent && (normCurrent === nTid || normCurrent === nTnom)) return true;
      if (normNombre && (normNombre === nTnom || normNombre === nTid)) return true;
    }

    return false;
  };

  // 3. CHAIR / MESA DIRECTIVA (y consola de secretaría de sala)
  if (userRole === 'chair' || userRole === 'mesa' || userRole === 'secretariat' || userRole === 'dais') {
    // a) Mesa global o local directa
    if (['CHAIRS_ALL', 'CHAIR_ALL', 'MESAS_ALL', 'MESA_ALL', 'CHAIR_GLOBAL', 'MESA_GLOBAL', 'CHAIR_LOCAL'].includes(destinoUpper)) {
      return true;
    }

    // b) Las mesas NUNCA deben ver avisos dirigidos a Staff ni a Secretaría General
    if (destinoUpper === 'STAFF_ALL' || destinoUpper === 'STAFF_GLOBAL' || destinoUpper.startsWith('STAFF_') || destinoUpper === 'SECRETARIA' || destinoUpper === 'ORGANIZACION') {
      return false;
    }

    // c) Si la mesa no tiene sala asignada ni por ID ni por Nombre, solo ve Global y Mesa Global (ya evaluados arriba)
    if ((!normCurrent && !normNombre) || normCurrent === 'todos') {
      return false;
    }

    // d) Su mesa: ej. CHAIR_<comiteId> o MESA_<comiteId>
    if (destinoUpper.startsWith('CHAIR_') || destinoUpper.startsWith('MESA_')) {
      const targetMesa = normalizarIdComite(destinoUpper);
      const rawTarget = rawDestino.replace(/^(chair_|mesa_)/i, '');
      return coincideComite(targetMesa, rawTarget);
    }

    // e) Su comité completo: ej. <comiteId> o COMITE_<comiteId>
    const targetComite = normalizarIdComite(destinoUpper);
    return coincideComite(targetComite, rawDestino);
  }

  // 4. STAFF (y STAFF GLOBAL)
  if (userRole === 'staff' || userRole === 'staff_global') {
    // a) Staff global o local directo
    if (destinoUpper === 'STAFF_ALL' || destinoUpper === 'STAFF_GLOBAL' || destinoUpper === 'STAFF_LOCAL') {
      return true;
    }

    // b) El Staff NUNCA debe ver avisos dirigidos a Mesas Directivas ni a Secretaría General
    if (['CHAIRS_ALL', 'CHAIR_ALL', 'MESAS_ALL', 'MESA_ALL', 'CHAIR_GLOBAL', 'MESA_GLOBAL', 'CHAIR_LOCAL'].includes(destinoUpper) ||
        destinoUpper.startsWith('CHAIR_') || destinoUpper.startsWith('MESA_') ||
        destinoUpper === 'SECRETARIA' || destinoUpper === 'ORGANIZACION') {
      return false;
    }

    // c) Staff de su comité: ej. STAFF_COMITE_<comiteId> o STAFF_<comiteId>
    if (destinoUpper.startsWith('STAFF_COMITE_') || destinoUpper.startsWith('STAFF_')) {
      const targetStaffComite = normalizarIdComite(destinoUpper);
      const rawTarget = rawDestino.replace(/^(staff_comite_|staff_)/i, '');
      // Si el staff es global o no tiene sala fija ('TODOS' o null), ve avisos a staff de cualquier sala para soporte
      if ((!normCurrent && !normNombre) || normCurrent === 'todos' || userRole === 'staff_global') {
        return true;
      }
      return coincideComite(targetStaffComite, rawTarget);
    }

    // d) Su comité: ej. <comiteId> o COMITE_<comiteId>
    if ((!normCurrent && !normNombre) || normCurrent === 'todos') {
      // Si no tiene sala fija, no ve mensajes a salas específicas completas
      return false;
    }
    const targetComite = normalizarIdComite(destinoUpper);
    return coincideComite(targetComite, rawDestino);
  }

  // 5. DELEGATE (Delegaciones de un comité)
  if (userRole === 'delegate') {
    // Los delegados NUNCA ven avisos internos de staff, mesas o secretaría
    if (destinoUpper === 'STAFF_ALL' || destinoUpper === 'STAFF_GLOBAL' || destinoUpper.startsWith('STAFF_')) return false;
    if (['CHAIRS_ALL', 'CHAIR_ALL', 'MESAS_ALL', 'MESA_ALL', 'CHAIR_GLOBAL', 'MESA_GLOBAL'].includes(destinoUpper) ||
        destinoUpper.startsWith('CHAIR_') || destinoUpper.startsWith('MESA_')) return false;
    if (destinoUpper === 'SECRETARIA' || destinoUpper === 'ORGANIZACION') return false;

    // Su comité
    if (normCurrent && normCurrent !== 'todos') {
      const targetComite = normalizarIdComite(destinoUpper);
      return coincideComite(targetComite, rawDestino);
    }
    return false;
  }

  // Usuario general: solo ve comunicados globales
  return false;
};

