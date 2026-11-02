export function registrarVotoConDerechos(sesion, paisId, voto) {
  const conDerechos = voto === 'favor_derechos' || voto === 'contra_derechos';
  if (conDerechos && sesion.tipoVotacion !== 'substantive') return sesion;

  const votoBase = conDerechos ? voto.replace('_derechos', '') : voto;
  const votos = { ...sesion.votos };
  const derechos = { ...sesion.derechos };
  if (votoBase == null) delete votos[paisId];
  else votos[paisId] = votoBase;
  if (conDerechos) derechos[paisId] = true;
  else delete derechos[paisId];
  return { ...sesion, votos, derechos };
}
