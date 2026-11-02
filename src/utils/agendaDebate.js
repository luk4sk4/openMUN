export function segundosRestantes(reloj, ahora = Date.now()) {
  return reloj.fin ? Math.max(0, Math.ceil((reloj.fin - ahora) / 1000)) : reloj.restante;
}

export function resultadoAgenda(favor, contra, presentes) {
  if (!Number.isInteger(presentes) || presentes <= 0 ||
      !Number.isInteger(favor) || !Number.isInteger(contra) ||
      favor < 0 || contra < 0 || favor + contra !== presentes) return null;
  return favor > presentes / 2 ? 'aprobado' : 'rechazado';
}

export function resolverDebateAgenda(agenda, id) {
  const tema = agenda.temasPropuestos.find(item => item.id === id);
  if (!tema?.debate || tema.debate.fase !== 'votacion') return agenda;
  const { favor, contra, presentes } = tema.debate;
  const resultado = resultadoAgenda(favor, contra, presentes);
  if (!resultado) return agenda;
  return {
    ...agenda,
    temaActual: resultado === 'aprobado' ? tema.titulo : (agenda.temaActual === tema.titulo ? '' : agenda.temaActual),
    temasPropuestos: agenda.temasPropuestos.map(item => item.id === id
      ? { ...item, estado: resultado === 'aprobado' ? 'En Discusión' : 'Pendiente', debate: { ...item.debate, fase: 'resultado', resultado } }
      : (resultado === 'aprobado' && item.estado === 'En Discusión' ? { ...item, estado: 'Pendiente' } : item))
  };
}
