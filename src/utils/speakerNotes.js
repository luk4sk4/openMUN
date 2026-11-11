export function getCurrentSpeaker(oradoresGSL, oradoresCaucus, caucusActivo) {
  const speaker = (caucusActivo?.activo ? oradoresCaucus : oradoresGSL)?.[0];
  return typeof speaker === 'string' ? { nombre: speaker } : speaker || null;
}

export function normalizeSpeakerScore(score) {
  if (score === '' || score === null || score === undefined) return null;
  const num = Number(score);
  if (!Number.isInteger(num) || num < 1 || num > 10) return null;
  return num;
}

export function formatSpeakerNote(draft) {
  if (!draft?.orador?.nombre) return null;
  const score = normalizeSpeakerScore(draft.nota);
  const text = draft.texto?.trim() || '';
  if (!text && score === null) return null;
  const scoreTag = score !== null ? ` · ${score}/10` : '';
  const body = text || `${score}/10`;
  return `[${draft.modalidad} · ${draft.orador.nombre}${scoreTag}]${draft.tema ? ` ${draft.tema}` : ''}\n${body}`;
}

export function extractSpeakerNoteCountry(text) {
  if (typeof text !== 'string' || !text.startsWith('[')) return null;
  const headerEnd = text.indexOf(']');
  if (headerEnd <= 1) return null;
  const parts = text.slice(1, headerEnd).split(' · ').map(part => part.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const last = parts[parts.length - 1];
  const hasScore = /^\d+\/10$/.test(last);
  const countryParts = hasScore ? parts.slice(1, -1) : parts.slice(1);
  return countryParts.join(' · ').trim() || null;
}

export function parseSpeakerNoteText(rawText) {
  if (typeof rawText !== 'string' || !rawText.trim()) return null;
  const text = rawText.trim();
  if (!text.startsWith('[')) {
    return {
      modalidad: 'GSL',
      pais: '',
      nota: null,
      tema: '',
      texto: text
    };
  }
  const headerEnd = text.indexOf(']');
  if (headerEnd <= 1) {
    return {
      modalidad: 'GSL',
      pais: '',
      nota: null,
      tema: '',
      texto: text
    };
  }
  const newlineIdx = text.indexOf('\n', headerEnd);
  const headerContent = text.slice(1, headerEnd);
  const parts = headerContent.split(' · ').map(part => part.trim()).filter(Boolean);
  const modalidad = parts[0] || 'GSL';
  const last = parts[parts.length - 1];
  const scoreMatch = last ? last.match(/^(\d+)\/10$/) : null;
  const nota = scoreMatch ? normalizeSpeakerScore(Number(scoreMatch[1])) : null;
  const countryParts = scoreMatch ? parts.slice(1, -1) : parts.slice(1);
  const pais = countryParts.join(' · ').trim();
  const tema = newlineIdx > headerEnd ? text.slice(headerEnd + 1, newlineIdx).trim() : text.slice(headerEnd + 1).trim();
  const body = newlineIdx > -1 ? text.slice(newlineIdx + 1).trim() : '';
  const texto = nota !== null && body === `${nota}/10` ? '' : body;
  return { modalidad, pais, nota, tema, texto };
}

export function createSpeakerNote(draft, autor = 'Secretaría') {
  const nombre = draft?.orador?.nombre?.trim?.() || draft?.pais?.trim?.() || '';
  if (!nombre) return null;
  const nota = normalizeSpeakerScore(draft?.nota);
  const texto = typeof draft?.texto === 'string' ? draft.texto.trim() : '';
  if (!texto && nota === null) return null;
  const timestamp = Number.isFinite(draft?.timestamp) ? draft.timestamp : Date.now();
  return {
    id: draft?.id || `sn_${timestamp}_${Math.random().toString(36).slice(2, 8)}`,
    pais: nombre,
    bandera: typeof draft?.orador?.bandera === 'string'
      ? draft.orador.bandera
      : (typeof draft?.bandera === 'string' ? draft.bandera : ''),
    modalidad: typeof draft?.modalidad === 'string' && draft.modalidad.trim() ? draft.modalidad.trim() : 'GSL',
    tema: typeof draft?.tema === 'string' ? draft.tema.trim() : '',
    nota,
    texto,
    autor: typeof (draft?.autor ?? autor) === 'string' && (draft?.autor ?? autor).trim()
      ? (draft?.autor ?? autor).trim()
      : 'Secretaría',
    fecha: typeof draft?.fecha === 'string' && draft.fecha ? draft.fecha : new Date(timestamp).toISOString(),
    timestamp
  };
}

export function normalizeSpeakerNote(item) {
  if (!item || typeof item !== 'object') return null;

  // Caso 1: Objeto estructurado de nota de orador
  if (typeof item.pais === 'string' && item.pais.trim() && (item.texto !== undefined || item.nota !== undefined)) {
    const nota = normalizeSpeakerScore(item.nota);
    const texto = typeof item.texto === 'string' ? item.texto.trim() : '';
    if (!texto && nota === null) return null;
    const parsedTime = item.timestamp ? Number(item.timestamp) : (item.fecha ? Date.parse(item.fecha) : Date.now());
    const timestamp = Number.isFinite(parsedTime) ? parsedTime : Date.now();
    return {
      id: String(item.id || `sn_${timestamp}_${Math.random().toString(36).slice(2, 8)}`),
      pais: item.pais.trim(),
      bandera: typeof item.bandera === 'string' ? item.bandera : '',
      modalidad: typeof item.modalidad === 'string' && item.modalidad.trim() ? item.modalidad.trim() : 'GSL',
      tema: typeof item.tema === 'string' ? item.tema.trim() : '',
      nota,
      texto,
      autor: typeof item.autor === 'string' && item.autor.trim() ? item.autor.trim() : 'Secretaría',
      fecha: typeof item.fecha === 'string' && item.fecha ? item.fecha : new Date(timestamp).toISOString(),
      timestamp
    };
  }

  // Caso 2: Fila de base de datos notas_intervenciones ({ id, pais, autor, contenido, creado_en }) o legacy speaker_annotation ({ id, text, from, timestamp })
  const rawContent = typeof item.contenido === 'string' ? item.contenido : (typeof item.text === 'string' ? item.text : '');
  const parsed = parseSpeakerNoteText(rawContent);
  const pais = (typeof item.pais === 'string' && item.pais.trim()) || parsed?.pais || '';
  if (!pais) return null;
  const nota = normalizeSpeakerScore(item.nota ?? parsed?.nota);
  const texto = parsed ? parsed.texto : rawContent.trim();
  if (!texto && nota === null) return null;
  const rawDate = item.timestamp || (item.creado_en ? Date.parse(item.creado_en) : (item.fecha ? Date.parse(item.fecha) : Date.now()));
  const timestamp = Number.isFinite(Number(rawDate)) ? Number(rawDate) : Date.now();
  return {
    id: String(item.id || `sn_${timestamp}_${Math.random().toString(36).slice(2, 8)}`),
    pais,
    bandera: typeof item.bandera === 'string' ? item.bandera : '',
    modalidad: (typeof item.modalidad === 'string' && item.modalidad.trim()) || parsed?.modalidad || 'GSL',
    tema: (typeof item.tema === 'string' && item.tema.trim()) || parsed?.tema || '',
    nota,
    texto,
    autor: (typeof item.autor === 'string' && item.autor.trim()) || (typeof item.from === 'string' && item.from.trim()) || 'Secretaría',
    fecha: typeof item.creado_en === 'string' ? item.creado_en : new Date(timestamp).toISOString(),
    timestamp
  };
}
