import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Clock, 
  Mic, 
  MessageSquare, 
  TrendingUp, 
  UserCheck, 
  UserX, 
  FileCheck2, 
  CheckCircle2, 
  XCircle 
} from 'lucide-react';
import CountryFlag from '../common/CountryFlag';

const formatMinutos = (seg) => {
  if (!seg || seg <= 0) return '0m 00s';
  const mins = Math.floor(seg / 60);
  const s = seg % 60;
  return `${mins}m ${s.toString().padStart(2, '0')}s`;
};

const formatMinutosExactos = (seg) => {
  if (!seg || seg <= 0) return '0.0 min';
  return `${(seg / 60).toFixed(1)} min`;
};

const GraficosParticipacion = ({
  paises = [],
  estadisticasDelegaciones = [],
  mociones = [],
  registroIntervenciones = []
}) => {
  const [metricaPodio, setMetricaPodio] = useState('tiempo'); // 'tiempo' | 'intervenciones' | 'preguntas'

  // Normalizar y enriquecer la lista de delegaciones con datos seguros
  const delegacionesNormalizadas = useMemo(() => {
    return estadisticasDelegaciones.map(d => {
      const tiempoHabladoTotal = Number(d.tiempoHabladoTotal ?? d.segHablados ?? 0);
      const cantidadIntervenciones = Number(d.cantidadIntervenciones ?? d.intervencionesCount ?? 0);
      const totalPreguntas = Number(d.preguntasRealizadas ?? d.totalPreguntas ?? 0);
      const mocPresentadas = Number(d.mocionesPropuestas ?? d.mocPresentadas ?? 0);
      const mocAprobadas = Number(d.mocionesAprobadas ?? d.mocAprobadas ?? 0);

      return {
        ...d,
        tiempoHabladoTotal,
        cantidadIntervenciones,
        totalPreguntas,
        mocPresentadas,
        mocAprobadas,
        haParticipado: tiempoHabladoTotal > 0 || cantidadIntervenciones > 0 || totalPreguntas > 0 || mocPresentadas > 0
      };
    });
  }, [estadisticasDelegaciones]);

  const totalPaises = paises.length || delegacionesNormalizadas.length;

  // Ordenadas por tiempo
  const listaPorTiempo = useMemo(() => {
    return [...delegacionesNormalizadas].sort((a, b) => b.tiempoHabladoTotal - a.tiempoHabladoTotal);
  }, [delegacionesNormalizadas]);

  // Ordenadas por intervenciones
  const listaPorIntervenciones = useMemo(() => {
    return [...delegacionesNormalizadas].sort((a, b) => b.cantidadIntervenciones - a.cantidadIntervenciones);
  }, [delegacionesNormalizadas]);

  // Ordenadas por preguntas
  const listaPorPreguntas = useMemo(() => {
    return [...delegacionesNormalizadas].sort((a, b) => b.totalPreguntas - a.totalPreguntas);
  }, [delegacionesNormalizadas]);

  const listaActivaParaPodio = useMemo(() => {
    if (metricaPodio === 'intervenciones') return listaPorIntervenciones;
    if (metricaPodio === 'preguntas') return listaPorPreguntas;
    return listaPorTiempo;
  }, [metricaPodio, listaPorIntervenciones, listaPorPreguntas, listaPorTiempo]);

  const totalSegHablados = useMemo(() => {
    return delegacionesNormalizadas.reduce((acc, d) => acc + d.tiempoHabladoTotal, 0);
  }, [delegacionesNormalizadas]);

  const totalDiscursos = useMemo(() => {
    return delegacionesNormalizadas.reduce((acc, d) => acc + d.cantidadIntervenciones, 0);
  }, [delegacionesNormalizadas]);

  const totalPreguntasGlobal = useMemo(() => {
    return delegacionesNormalizadas.reduce((acc, d) => acc + d.totalPreguntas, 0);
  }, [delegacionesNormalizadas]);

  // Delegaciones activas vs silenciosas
  const delegacionesActivas = useMemo(() => {
    return delegacionesNormalizadas.filter(d => d.haParticipado);
  }, [delegacionesNormalizadas]);

  const delegacionesSilenciosas = useMemo(() => {
    return delegacionesNormalizadas.filter(d => !d.haParticipado);
  }, [delegacionesNormalizadas]);

  const porcentajeParticipacion = totalPaises > 0 
    ? Math.round((delegacionesActivas.length / totalPaises) * 100) 
    : 0;

  // Balance GSL vs Caucus vs Otros en intervenciones
  const { totalGslSeg, totalCaucusSeg, pctGsl, pctCaucus } = useMemo(() => {
    if (!registroIntervenciones || registroIntervenciones.length === 0) {
      return { totalGslSeg: 0, totalCaucusSeg: 0, pctGsl: 50, pctCaucus: 50 };
    }
    const gsl = registroIntervenciones
      .filter(i => i.tipo === 'GSL' || i.contexto === 'GSL' || (!i.tipo && !i.contexto))
      .reduce((acc, i) => acc + (i.tiempoHabladoExacto || i.tiempoHablado || 0), 0);
    
    const caucus = Math.max(0, totalSegHablados - gsl);
    const pGsl = totalSegHablados > 0 ? Math.min(100, Math.max(0, Math.round((gsl / totalSegHablados) * 100))) : 50;
    const pCaucus = 100 - pGsl;

    return { totalGslSeg: gsl, totalCaucusSeg: caucus, pctGsl: pGsl, pctCaucus: pCaucus };
  }, [registroIntervenciones, totalSegHablados]);

  // Estadísticas de mociones
  const { totalMoc, mocAprobadas, mocRechazadas, mocOtras, tasaAprobacionMoc } = useMemo(() => {
    const total = mociones.length;
    const aprob = mociones.filter(m => m.estado === 'Aprobada' || m.estado === 'Aprobado').length;
    const rech = mociones.filter(m => m.estado === 'Rechazada' || m.estado === 'Rechazado' || m.estado === 'Descartada').length;
    const otras = total - aprob - rech;
    const tasa = total > 0 ? Math.round((aprob / total) * 100) : 0;
    return { totalMoc: total, mocAprobadas: aprob, mocRechazadas: rech, mocOtras: otras, tasaAprobacionMoc: tasa };
  }, [mociones]);

  const getMaximoSegunMetrica = () => {
    if (metricaPodio === 'intervenciones') return Math.max(1, ...delegacionesNormalizadas.map(d => d.cantidadIntervenciones));
    if (metricaPodio === 'preguntas') return Math.max(1, ...delegacionesNormalizadas.map(d => d.totalPreguntas));
    return Math.max(1, ...delegacionesNormalizadas.map(d => d.tiempoHabladoTotal));
  };

  const getValorSegunMetrica = (del) => {
    if (metricaPodio === 'intervenciones') return `${del.cantidadIntervenciones} discursos`;
    if (metricaPodio === 'preguntas') return `${del.totalPreguntas} preguntas / POI`;
    return `${formatMinutos(del.tiempoHabladoTotal)} (${del.cantidadIntervenciones} int.)`;
  };

  const getPorcentajeSegunMetrica = (del) => {
    const maxVal = getMaximoSegunMetrica();
    if (maxVal <= 0) return 0;
    if (metricaPodio === 'intervenciones') return Math.min(100, Math.round((del.cantidadIntervenciones / maxVal) * 100));
    if (metricaPodio === 'preguntas') return Math.min(100, Math.round((del.totalPreguntas / maxVal) * 100));
    return Math.min(100, Math.round((del.tiempoHabladoTotal / maxVal) * 100));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {/* ── FILA 1: TARJETAS KPI DE RENDIMIENTO ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.6rem' }}>
        {/* Tiempo en Sala */}
        <div style={{
          backgroundColor: 'var(--card-header-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          padding: '0.65rem 0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.7rem'
        }}>
          <div style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: 'var(--border-radius)', 
            backgroundColor: 'var(--info-soft)', 
            color: 'var(--info-color)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            flexShrink: 0 
          }}>
            <Clock size={18} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)', textTransform: 'uppercase', fontWeight: '650', letterSpacing: '0.04em' }}>
              Tiempo en sala
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: '650', color: 'var(--text-color)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              {formatMinutos(totalSegHablados)}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--muted-text)', fontVariantNumeric: 'tabular-nums' }}>
              {formatMinutosExactos(totalSegHablados)}
            </div>
          </div>
        </div>

        {/* Intervenciones */}
        <div style={{
          backgroundColor: 'var(--card-header-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          padding: '0.65rem 0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.7rem'
        }}>
          <div style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: 'var(--border-radius)', 
            backgroundColor: 'var(--success-soft)', 
            color: 'var(--success-color)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            flexShrink: 0 
          }}>
            <Mic size={18} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)', textTransform: 'uppercase', fontWeight: '650', letterSpacing: '0.04em' }}>
              Intervenciones
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: '650', color: 'var(--text-color)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              {totalDiscursos} discursos
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--muted-text)', fontVariantNumeric: 'tabular-nums' }}>
              {totalPreguntasGlobal} preguntas / POI
            </div>
          </div>
        </div>

        {/* Participación de Sala */}
        <div style={{
          backgroundColor: 'var(--card-header-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          padding: '0.65rem 0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.7rem'
        }}>
          <div style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: 'var(--border-radius)', 
            backgroundColor: 'var(--accent-soft)', 
            color: 'var(--accent-color)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            flexShrink: 0 
          }}>
            <UserCheck size={18} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)', textTransform: 'uppercase', fontWeight: '650', letterSpacing: '0.04em' }}>
              Participación sala
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: '650', color: 'var(--text-color)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              {porcentajeParticipacion}%
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--muted-text)', fontVariantNumeric: 'tabular-nums' }}>
              {delegacionesActivas.length} de {totalPaises} países
            </div>
          </div>
        </div>

        {/* Éxito de Mociones */}
        <div style={{
          backgroundColor: 'var(--card-header-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          padding: '0.65rem 0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.7rem'
        }}>
          <div style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: 'var(--border-radius)', 
            backgroundColor: 'var(--warning-soft)', 
            color: 'var(--warning-color)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            flexShrink: 0 
          }}>
            <MessageSquare size={18} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)', textTransform: 'uppercase', fontWeight: '650', letterSpacing: '0.04em' }}>
              Éxito mociones
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: '650', color: 'var(--text-color)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              {tasaAprobacionMoc}%
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--muted-text)', fontVariantNumeric: 'tabular-nums' }}>
              {mocAprobadas} aprobadas / {totalMoc} total
            </div>
          </div>
        </div>
      </div>

      {/* ── FILA 2: BALANCE DE DEBATE Y DESGLOSE DE MOCIONES ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.75rem' }}>
        {/* Balance GSL vs Caucuses */}
        <div style={{
          backgroundColor: 'var(--card-header-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          padding: '0.85rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '650', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <TrendingUp size={15} style={{ color: 'var(--info-color)' }} />
              Balance de debate: GSL vs Caucuses
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
            <span style={{ color: 'var(--info-color)', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
              GSL: {totalSegHablados > 0 ? pctGsl : 0}% ({formatMinutos(totalGslSeg)})
            </span>
            <span style={{ color: 'var(--accent-color)', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
              Caucuses: {totalSegHablados > 0 ? pctCaucus : 0}% ({formatMinutos(totalCaucusSeg)})
            </span>
          </div>

          {/* Barra de progreso bicolor */}
          <div style={{ height: '8px', width: '100%', borderRadius: '4px', backgroundColor: 'var(--subborder-color)', overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${totalSegHablados > 0 ? pctGsl : 0}%`, backgroundColor: 'var(--info-color)', transition: 'width 0.4s ease' }} title={`GSL: ${pctGsl}%`} />
            <div style={{ width: `${totalSegHablados > 0 ? pctCaucus : 0}%`, backgroundColor: 'var(--accent-color)', transition: 'width 0.4s ease' }} title={`Caucuses: ${pctCaucus}%`} />
          </div>
        </div>

        {/* Desglose de Mociones */}
        <div style={{
          backgroundColor: 'var(--card-header-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          padding: '0.85rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '650', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <FileCheck2 size={15} style={{ color: 'var(--success-color)' }} />
              Resolución de mociones ({totalMoc})
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted-text)', fontVariantNumeric: 'tabular-nums' }}>
              {mocAprobadas} aprobadas • {mocRechazadas} rechazadas
            </span>
          </div>

          {totalMoc === 0 ? (
            <div style={{ fontSize: '0.74rem', color: 'var(--muted-text)', fontStyle: 'italic', padding: '0.2rem 0' }}>
              No se han registrado mociones aún en este periodo.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.72rem', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--success-color)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem', fontVariantNumeric: 'tabular-nums' }}>
                  <CheckCircle2 size={12} /> Aprobadas ({mocAprobadas})
                </span>
                <span style={{ color: 'var(--danger-color)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem', fontVariantNumeric: 'tabular-nums' }}>
                  <XCircle size={12} /> Rechazadas ({mocRechazadas})
                </span>
                {mocOtras > 0 && (
                  <span style={{ color: 'var(--warning-color)', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
                    Otras / Pendientes ({mocOtras})
                  </span>
                )}
              </div>

              {/* Barra segmentada de mociones */}
              <div style={{ height: '8px', width: '100%', borderRadius: '4px', backgroundColor: 'var(--subborder-color)', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${(mocAprobadas / totalMoc) * 100}%`, backgroundColor: 'var(--success-color)', transition: 'width 0.4s ease' }} title={`Aprobadas: ${mocAprobadas}`} />
                <div style={{ width: `${(mocRechazadas / totalMoc) * 100}%`, backgroundColor: 'var(--danger-color)', transition: 'width 0.4s ease' }} title={`Rechazadas: ${mocRechazadas}`} />
                <div style={{ width: `${(mocOtras / totalMoc) * 100}%`, backgroundColor: 'var(--warning-color)', transition: 'width 0.4s ease' }} title={`Otras: ${mocOtras}`} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── FILA 3: PODIO Y TOP DELEGACIONES ACTIVAS VS DELEGACIONES SILENCIOSAS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.75rem' }}>
        {/* Podio / Ranking de Delegaciones Activas */}
        <div style={{
          backgroundColor: 'var(--card-header-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          padding: '0.85rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem'
        }}>
          {/* Header del Podio con Selector de Métrica */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: '650', fontSize: '0.85rem', color: 'var(--text-color)' }}>
              <Trophy size={16} style={{ color: 'var(--warning-color)' }} />
              <span>Ranking de delegaciones activas</span>
            </div>

            {/* Selector de Métrica para el Podio */}
            <div 
              role="group"
              aria-label="Métrica de ranking"
              style={{
                display: 'flex',
                backgroundColor: 'var(--input-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                padding: '2px'
              }}
            >
              <button
                onClick={() => setMetricaPodio('tiempo')}
                style={{
                  padding: '2px 7px',
                  fontSize: '0.7rem',
                  fontWeight: metricaPodio === 'tiempo' ? '650' : '500',
                  border: metricaPodio === 'tiempo' ? '1px solid var(--accent-color)' : '1px solid transparent',
                  borderRadius: 'calc(var(--border-radius) - 2px)',
                  backgroundColor: metricaPodio === 'tiempo' ? 'var(--accent-soft)' : 'transparent',
                  color: metricaPodio === 'tiempo' ? 'var(--accent-color)' : 'var(--muted-text)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Tiempo
              </button>
              <button
                onClick={() => setMetricaPodio('intervenciones')}
                style={{
                  padding: '2px 7px',
                  fontSize: '0.7rem',
                  fontWeight: metricaPodio === 'intervenciones' ? '650' : '500',
                  border: metricaPodio === 'intervenciones' ? '1px solid var(--accent-color)' : '1px solid transparent',
                  borderRadius: 'calc(var(--border-radius) - 2px)',
                  backgroundColor: metricaPodio === 'intervenciones' ? 'var(--accent-soft)' : 'transparent',
                  color: metricaPodio === 'intervenciones' ? 'var(--accent-color)' : 'var(--muted-text)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Discursos
              </button>
              <button
                onClick={() => setMetricaPodio('preguntas')}
                style={{
                  padding: '2px 7px',
                  fontSize: '0.7rem',
                  fontWeight: metricaPodio === 'preguntas' ? '650' : '500',
                  border: metricaPodio === 'preguntas' ? '1px solid var(--accent-color)' : '1px solid transparent',
                  borderRadius: 'calc(var(--border-radius) - 2px)',
                  backgroundColor: metricaPodio === 'preguntas' ? 'var(--accent-soft)' : 'transparent',
                  color: metricaPodio === 'preguntas' ? 'var(--accent-color)' : 'var(--muted-text)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Preguntas
              </button>
            </div>
          </div>

          {/* Lista de delegaciones en Podio */}
          {listaActivaParaPodio.slice(0, 8).map((del, idx) => {
            const pct = getPorcentajeSegunMetrica(del);
            const medalla = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `#${idx + 1}`));
            const colorBarra = idx === 0 
              ? 'var(--warning-color)' 
              : (idx === 1 ? 'var(--muted-text)' : (idx === 2 ? 'var(--accent-color)' : 'var(--info-color)'));

            return (
              <div key={del.id || idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.82rem', width: '22px', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{medalla}</span>
                    <CountryFlag bandera={del.bandera} nombre={del.nombre} size="sm" />
                    <span style={{ fontWeight: '600', color: 'var(--text-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {del.nombre}
                    </span>
                  </div>
                  <span style={{ fontWeight: '600', color: 'var(--muted-text)', fontSize: '0.72rem', whiteSpace: 'nowrap', marginLeft: '0.5rem', fontVariantNumeric: 'tabular-nums' }}>
                    {getValorSegunMetrica(del)}
                  </span>
                </div>
                <div style={{ height: '5px', width: '100%', borderRadius: '3px', backgroundColor: 'var(--subborder-color)', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', backgroundColor: colorBarra, borderRadius: '3px', transition: 'width 0.4s ease' }} />
                </div>
              </div>
            );
          })}

          {listaActivaParaPodio.length === 0 && (
            <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--muted-text)', fontSize: '0.8rem' }}>
              No hay datos registrados aún.
            </div>
          )}
        </div>

        {/* Delegaciones Silenciosas / Sin Intervenciones */}
        <div style={{
          backgroundColor: 'var(--card-header-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          padding: '0.85rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: '650', fontSize: '0.85rem', color: 'var(--text-color)' }}>
              <UserX size={16} style={{ color: 'var(--muted-text)' }} />
              <span>Delegaciones sin intervenciones ({delegacionesSilenciosas.length})</span>
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--muted-text)' }}>Sin actividad registrada</span>
          </div>

          {delegacionesSilenciosas.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '2rem 1rem', 
              color: 'var(--success-color)', 
              fontSize: '0.82rem', 
              fontWeight: '600', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.5rem',
              backgroundColor: 'var(--success-soft)',
              borderRadius: 'var(--border-radius)',
              border: '1px dashed var(--success-color)'
            }}>
              <CheckCircle2 size={20} />
              <span>¡Excelente participación! Todas las delegaciones registradas han intervenido en la sesión.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '2px' }}>
              {delegacionesSilenciosas.map(d => (
                <div
                  key={d.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.25rem 0.5rem',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    fontSize: '0.74rem',
                    color: 'var(--text-color)'
                  }}
                >
                  <CountryFlag bandera={d.bandera} nombre={d.nombre} size="sm" />
                  <span>{d.nombre}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GraficosParticipacion;
