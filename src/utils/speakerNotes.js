export function getCurrentSpeaker(oradoresGSL, oradoresCaucus, caucusActivo) {
  const speaker = (caucusActivo?.activo ? oradoresCaucus : oradoresGSL)?.[0];
  return typeof speaker === 'string' ? { nombre: speaker } : speaker || null;
}

export function formatSpeakerNote(draft) {
  if (!draft?.orador?.nombre || !draft.texto?.trim()) return null;
  return `[${draft.modalidad} · ${draft.orador.nombre}]${draft.tema ? ` ${draft.tema}` : ''}\n${draft.texto.trim()}`;
}
