import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Clock, 
  Mic, 
  MessageSquare, 
  AlertCircle, 
  TrendingUp, 
  Sparkles, 
  UserCheck, 
  UserX, 
  Award,
  HelpCircle,
  FileCheck2,
  BarChart3,
  Flame,
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

  // Valores máximos para las barras de progreso relativas
  const maxTiempo = Math.max(1, ...delegacionesNormalizadas.map(d => d.tiempoHabladoTotal));
  const maxIntervenciones = Math.max(1, ...delegacionesNormalizadas.map(d => d.cantidadIntervenciones));
  const maxPreguntas = Math.max(1, ...delegacionesNormalizadas.map(d => d.totalPreguntas));

  const getMaximoSegunMetrica = () => {
    if (metricaPodio === 'intervenciones') return maxIntervenciones;
    if (metricaPodio === 'preguntas') return maxPreguntas;
    return maxTiempo;
  };

  const getValorSegunMetrica = (del) => {
    if (metricaPodio === 'intervenciones') return `${del.cantidadIntervenciones} discursos`;
    if (metricaPodio === 'preguntas') return `${del.totalPreguntas} preguntas/POI`;
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }} className="anim-fade-scale">
      {/* ── FILA 1: TARJETAS KPI DE RENDIMIENTO ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.6rem' }}>
        {/* Tiempo en Sala */}
        <div style={{
          backgroundColor: 'var(--card-header-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '0.75rem 0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.7rem'
        }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock size={20} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.03em' }}>Tiempo en Sala</div>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-color)', whiteSpace: 'nowrap' }}>{formatMinutos(totalSegHablados)}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--muted-text)' }}>{formatMinutosExactos(totalSegHablados)}</div>
          </div>
        </div>

        {/* Intervenciones */}
        <div style={{
          backgroundColor: 'var(--card-header-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '0.75rem 0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.7rem'
        }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Mic size={20} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.03em' }}>Intervenciones</div>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-color)', whiteSpace: 'nowrap' }}>{totalDiscursos} discursos</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--muted-text)' }}>{totalPreguntasGlobal} preguntas / POI</div>
          </div>
        </div>

        {/* Participación de Sala */}
        <div style={{
          backgroundColor: 'var(--card-header-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '0.75rem 0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.7rem'
        }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <UserCheck size={20} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.03em' }}>Participación Sala</div>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-color)', whiteSpace: 'nowrap' }}>{porcentajeParticipacion}%</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--muted-text)' }}>{delegacionesActivas.length} de {totalPaises} países</div>
          </div>
        </div>

        {/* Éxito de Mociones */}
        <div style={{
          backgroundColor: 'var(--card-header-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '0.75rem 0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.7rem'
        }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: 'rgba(234, 88, 12, 0.15)', color: '#fb923c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MessageSquare size={20} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.03em' }}>Éxito Mociones</div>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-color)', whiteSpace: 'nowrap' }}>{tasaAprobacionMoc}%</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--muted-text)' }}>{mocAprobadas} aprobadas / {totalMoc} total</div>
          </div>
        </div>
      </div>

      {/* ── FILA 2: BALANCE DE DEBATE Y DESGLOSE DE MOCIONES ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.75rem' }}>
        {/* Balance GSL vs Caucuses */}
        <div style={{
          backgroundColor: 'var(--card-header-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '0.85rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.55rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <TrendingUp size={15} color="#3b82f6" />
              Balance de Debate: GSL vs Caucuses
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
            <span style={{ color: '#60a5fa', fontWeight: '700' }}>GSL: {totalSegHablados > 0 ? pctGsl : 0}% ({formatMinutos(totalGslSeg)})</span>
            <span style={{ color: '#c084fc', fontWeight: '700' }}>Caucuses: {totalSegHablados > 0 ? pctCaucus : 0}% ({formatMinutos(totalCaucusSeg)})</span>
          </div>

          {/* Barra de progreso bicolor */}
          <div style={{ height: '10px', width: '100%', borderRadius: '9999px', backgroundColor: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${totalSegHablados > 0 ? pctGsl : 0}%`, backgroundColor: '#3b82f6', transition: 'width 0.5s ease' }} title={`GSL: ${pctGsl}%`} />
            <div style={{ width: `${totalSegHablados > 0 ? pctCaucus : 0}%`, backgroundColor: '#a855f7', transition: 'width 0.5s ease' }} title={`Caucuses: ${pctCaucus}%`} />
          </div>
        </div>

        {/* Desglose de Mociones */}
        <div style={{
          backgroundColor: 'var(--card-header-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '0.85rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.55rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileCheck2 size={15} color="#4ade80" />
              Resolución de Mociones ({totalMoc})
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted-text)' }}>
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
                <span style={{ color: '#4ade80', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle2 size={12} /> Aprobadas ({mocAprobadas})
                </span>
                <span style={{ color: '#f87171', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <XCircle size={12} /> Rechazadas ({mocRechazadas})
                </span>
                {mocOtras > 0 && (
                  <span style={{ color: '#fb923c', fontWeight: '700' }}>
                    Otras / Pendientes ({mocOtras})
                  </span>
                )}
              </div>

              {/* Barra segmentada de mociones */}
              <div style={{ height: '10px', width: '100%', borderRadius: '9999px', backgroundColor: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${(mocAprobadas / totalMoc) * 100}%`, backgroundColor: '#22c55e', transition: 'width 0.4s ease' }} title={`Aprobadas: ${mocAprobadas}`} />
                <div style={{ width: `${(mocRechazadas / totalMoc) * 100}%`, backgroundColor: '#ef4444', transition: 'width 0.4s ease' }} title={`Rechazadas: ${mocRechazadas}`} />
                <div style={{ width: `${(mocOtras / totalMoc) * 100}%`, backgroundColor: '#f97316', transition: 'width 0.4s ease' }} title={`Otras: ${mocOtras}`} />
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
          borderRadius: '8px',
          padding: '0.9rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem'
        }}>
          {/* Header del Podio con Selector de Métrica */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '800', fontSize: '0.85rem', color: '#facc15' }}>
              <Trophy size={16} />
              <span>Ranking de Delegaciones Activas</span>
            </div>

            {/* Selector de Métrica para el Podio */}
            <div style={{
              display: 'flex',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-color)',
              borderRadius: '5px',
              padding: '1px'
            }}>
              <button
                onClick={() => setMetricaPodio('tiempo')}
                style={{
                  padding: '2px 6px',
                  fontSize: '0.68rem',
                  fontWeight: metricaPodio === 'tiempo' ? '800' : '500',
                  border: 'none',
                  borderRadius: '3px',
                  backgroundColor: metricaPodio === 'tiempo' ? 'var(--btn-bg)' : 'transparent',
                  color: metricaPodio === 'tiempo' ? 'var(--btn-text)' : 'var(--muted-text)',
                  cursor: 'pointer'
                }}
              >
                Tiempo
              </button>
              <button
                onClick={() => setMetricaPodio('intervenciones')}
                style={{
                  padding: '2px 6px',
                  fontSize: '0.68rem',
                  fontWeight: metricaPodio === 'intervenciones' ? '800' : '500',
                  border: 'none',
                  borderRadius: '3px',
                  backgroundColor: metricaPodio === 'intervenciones' ? 'var(--btn-bg)' : 'transparent',
                  color: metricaPodio === 'intervenciones' ? 'var(--btn-text)' : 'var(--muted-text)',
                  cursor: 'pointer'
                }}
              >
                Discursos
              </button>
              <button
                onClick={() => setMetricaPodio('preguntas')}
                style={{
                  padding: '2px 6px',
                  fontSize: '0.68rem',
                  fontWeight: metricaPodio === 'preguntas' ? '800' : '500',
                  border: 'none',
                  borderRadius: '3px',
                  backgroundColor: metricaPodio === 'preguntas' ? 'var(--btn-bg)' : 'transparent',
                  color: metricaPodio === 'preguntas' ? 'var(--btn-text)' : 'var(--muted-text)',
                  cursor: 'pointer'
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
            const colorBarra = idx === 0 ? '#facc15' : (idx === 1 ? '#94a3b8' : (idx === 2 ? '#d97706' : '#3b82f6'));

            return (
              <div key={del.id || idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.82rem', width: '22px', flexShrink: 0 }}>{medalla}</span>
                    <CountryFlag bandera={del.bandera} nombre={del.nombre} size="sm" />
                    <span style={{ fontWeight: '700', color: 'var(--text-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {del.nombre}
                    </span>
                  </div>
                  <span style={{ fontWeight: '700', color: 'var(--muted-text)', fontSize: '0.74rem', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>
                    {getValorSegunMetrica(del)}
                  </span>
                </div>
                <div style={{ height: '6px', width: '100%', borderRadius: '9999px', backgroundColor: 'rgba(255, 255, 255, 0.06)', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', backgroundColor: colorBarra, borderRadius: '9999px', transition: 'width 0.4s ease' }} />
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
          borderRadius: '8px',
          padding: '0.9rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '800', fontSize: '0.85rem', color: '#f87171' }}>
              <UserX size={16} />
              <span>Delegaciones Silenciosas ({delegacionesSilenciosas.length})</span>
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--muted-text)' }}>Sin actividad registrada</span>
          </div>

          {delegacionesSilenciosas.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '2rem 1rem', 
              color: '#4ade80', 
              fontSize: '0.82rem', 
              fontWeight: '700', 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.5rem',
              backgroundColor: 'rgba(34, 197, 94, 0.05)',
              borderRadius: '6px',
              border: '1px dashed rgba(34, 197, 94, 0.3)'
            }}>
              <Sparkles size={20} />
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
                    padding: '0.25rem 0.55rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '5px',
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

