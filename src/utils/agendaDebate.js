export function normalizarDebateAgenda(debate, temas) {
  if (!debate || !['debate', 'votacion', 'aprobada', 'rechazada'].includes(debate.fase)) return null;
  if (debate.propuestaId === debate.alternativaId ||
      !temas.some(t => t.id === debate.propuestaId) ||
      !temas.some(t => t.id === debate.alternativaId)) return null;
  const aFavor = Array.isArray(debate.aFavor) ? [...new Set(debate.aFavor.filter(id => typeof id === 'string'))] : [];
  const enContra = Array.isArray(debate.enContra) ? [...new Set(debate.enContra.filter(id => typeof id === 'string' && !aFavor.includes(id)))] : [];
  return { propuestaId: debate.propuestaId, alternativaId: debate.alternativaId, fase: debate.fase, aFavor, enContra };
}

export function resolverDebateAgenda(temas, debate, aprobada) {
  const valido = normalizarDebateAgenda(debate, temas);
  if (!valido || valido.fase !== 'votacion') return null;
  const elegido = temas.find(t => t.id === (aprobada ? valido.propuestaId : valido.alternativaId));
  return {
    temaActual: elegido.titulo,
    temasPropuestos: [elegido, ...temas.filter(t => t.id !== elegido.id)].map(t => ({
      ...t,
      estado: t.id === elegido.id ? 'En Discusión' : (t.estado === 'En Discusión' ? 'Pendiente' : t.estado)
    })),
    debateAgenda: { ...valido, fase: aprobada ? 'aprobada' : 'rechazada' }
  };
}
