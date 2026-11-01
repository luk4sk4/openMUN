export const DEBATE_BREAK_MS = 30 * 60 * 1000;

export function normalizarSesionesDebate(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(n => Number.isSafeInteger(n) && n > 0 && n <= 8640000000000000))].sort((a, b) => a - b);
}

export function fechaRegistro(item) {
  const fecha = Date.parse(item?.fecha);
  if (Number.isFinite(fecha)) return fecha;
  const id = Number(item?.id);
  return id > 1000000000000 ? id : null;
}

export function sesionDelRegistro(item, sesiones) {
  const fecha = fechaRegistro(item);
  return sesiones.findLast(inicio => fecha !== null && inicio <= fecha) ?? 'SIN_SESION';
}

export function necesitaConfirmarSesion(ultimaActividad, ahora = Date.now()) {
  return Number.isFinite(ultimaActividad) && ahora - ultimaActividad >= DEBATE_BREAK_MS;
}
