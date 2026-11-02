export function registrarVotoConDerechos(sesion, paisId, voto) {
  const safeSesion = sesion || {
    asunto: 'Votación',
    tipoVotacion: 'procedural',
    tipoMayoria: 'simple',
    aplicarVeto: true,
    votos: {},
    derechos: {}
  };
  const tipoVotacion = safeSesion.tipoVotacion || 'procedural';
  const conDerechos = voto === 'favor_derechos' || voto === 'contra_derechos';

  const votoBase = conDerechos ? voto.replace('_derechos', '') : voto;
  const votos = { ...(safeSesion.votos || {}) };
  const derechos = { ...(safeSesion.derechos || {}) };
  if (votoBase == null) delete votos[paisId];
  else votos[paisId] = votoBase;
  if (conDerechos) derechos[paisId] = true;
  else delete derechos[paisId];
  return { ...safeSesion, tipoVotacion, votos, derechos };
}
