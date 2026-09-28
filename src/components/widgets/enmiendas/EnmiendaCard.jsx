import React, { useState, memo } from 'react';
import {
  FilePlus,
  FileMinus,
  Edit3,
  Vote,
  Check,
  X,
  RotateCcw,
  Trash2,
  Eye,
  EyeOff,
  Quote,
  ArrowRight
} from 'lucide-react';
import CountryFlag from '../../common/CountryFlag';

/**
 * Tarjeta interactiva para cada enmienda individual con comparación visual clara (diff),
 * visualización del proponente con bandera y controles rápidos de resolución y votación.
 */
const EnmiendaCard = memo(({
  enm,
  paises = [],
  articuloTexto = '',
  onVotar,
  onResolver,
  onEliminar
}) => {
  const [mostrarPreviewContexto, setMostrarPreviewContexto] = useState(false);

  const paisObj = (paises || []).find(
    p => p.nombre?.toLowerCase() === enm.paisProponente?.toLowerCase()
  );

  const esAdicion = enm.tipo === 'adicion';
  const esSupresion = enm.tipo === 'supresion';
  const esModificacion = enm.tipo === 'modificacion';

  const estadoBadge = {
    aceptada: {
      bg: 'rgba(34, 197, 94, 0.15)',
      border: 'rgba(34, 197, 94, 0.35)',
      color: '#22c55e',
      label: 'Aceptada'
    },
    rechazada: {
      bg: 'rgba(239, 68, 68, 0.15)',
      border: 'rgba(239, 68, 68, 0.35)',
      color: '#ef4444',
      label: 'Rechazada'
    },
    pendiente: {
      bg: 'rgba(234, 179, 8, 0.15)',
      border: 'rgba(234, 179, 8, 0.35)',
      color: '#eab308',
      label: 'Pendiente'
    }
  }[enm.estado || 'pendiente'] || {
    bg: 'rgba(148, 163, 184, 0.15)',
    border: 'rgba(148, 163, 184, 0.35)',
    color: '#94a3b8',
    label: enm.estado
  };

  // Simular previsualización de cómo quedaría el texto si se aprueba
  const calcularTextoSimulado = () => {
    if (!articuloTexto) return enm.textoPropuesto || '';
    if (esAdicion) {
      return `${articuloTexto.trim()} ${enm.textoPropuesto.trim()}`;
    }
    if (esSupresion) {
      if (enm.textoOriginal && articuloTexto.includes(enm.textoOriginal.trim())) {
        return articuloTexto.replace(enm.textoOriginal.trim(), '').replace(/\s+/g, ' ').trim();
      }
      return '[Cláusula suprimida completamente]';
    }
    if (esModificacion) {
      if (enm.textoOriginal && articuloTexto.includes(enm.textoOriginal.trim())) {
        return articuloTexto.replace(enm.textoOriginal.trim(), enm.textoPropuesto.trim());
      }
      return enm.textoPropuesto.trim();
    }
    return articuloTexto;
  };

  return (
    <div
      style={{
        backgroundColor: enm.estado === 'aceptada'
          ? 'rgba(34, 197, 94, 0.05)'
          : enm.estado === 'rechazada'
            ? 'rgba(239, 68, 68, 0.05)'
            : 'var(--card-hover, rgba(255, 255, 255, 0.03))',
        border: `1px solid ${
          enm.estado === 'aceptada'
            ? 'rgba(34, 197, 94, 0.35)'
            : enm.estado === 'rechazada'
              ? 'rgba(239, 68, 68, 0.35)'
              : 'var(--subborder-color)'
        }`,
        borderRadius: '8px',
        padding: '0.65rem 0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        transition: 'all 0.2s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}
    >
      {/* ── CABECERA DE LA ENMIENDA ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          {/* Badge de Tipo */}
          <span style={{
            fontSize: '0.66rem',
            fontWeight: '800',
            padding: '0.15rem 0.45rem',
            borderRadius: '4px',
            backgroundColor: esAdicion
              ? 'rgba(34, 197, 94, 0.2)'
              : esSupresion
                ? 'rgba(239, 68, 68, 0.2)'
                : 'rgba(59, 130, 246, 0.2)',
            color: esAdicion ? '#22c55e' : esSupresion ? '#ef4444' : '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            textTransform: 'uppercase',
            letterSpacing: '0.02em'
          }}>
            {esAdicion && <FilePlus size={12} />}
            {esSupresion && <FileMinus size={12} />}
            {esModificacion && <Edit3 size={12} />}
            <span>{esAdicion ? 'Adición' : esSupresion ? 'Supresión' : 'Modificación'}</span>
          </span>

          {/* Proponente con Bandera */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            backgroundColor: 'rgba(255,255,255,0.05)',
            padding: '0.15rem 0.45rem',
            borderRadius: '4px',
            border: '1px solid var(--subborder-color)'
          }}>
            <CountryFlag country={paisObj} bandera={paisObj?.bandera} nombre={enm.paisProponente} size="xs" />
            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-color)' }}>
              {enm.paisProponente || 'Delegación'}
            </span>
          </div>

          {enm.articuloNumero && (
            <span style={{ fontSize: '0.68rem', color: 'var(--muted-text)', fontWeight: '600' }}>
              • {enm.articuloNumero}
            </span>
          )}
        </div>

        {/* Estado actual */}
        <span style={{
          fontSize: '0.64rem',
          fontWeight: '800',
          padding: '0.12rem 0.5rem',
          borderRadius: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          backgroundColor: estadoBadge.bg,
          border: `1px solid ${estadoBadge.border}`,
          color: estadoBadge.color
        }}>
          {estadoBadge.label}
        </span>
      </div>

      {/* ── CUERPO CON COMPARACIÓN VISUAL (DIFF) ── */}
      <div style={{ fontSize: '0.76rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {esAdicion && (
          <div style={{
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderLeft: '3px solid #22c55e',
            padding: '0.4rem 0.55rem',
            borderRadius: '0 6px 6px 0',
            color: '#22c55e',
            fontWeight: '600',
            lineHeight: 1.4,
            wordBreak: 'break-word'
          }}>
            <span style={{ fontWeight: '800', marginRight: '0.3rem' }}>+</span>
            {enm.textoPropuesto}
          </div>
        )}

        {esSupresion && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderLeft: '3px solid #ef4444',
            padding: '0.4rem 0.55rem',
            borderRadius: '0 6px 6px 0',
            color: '#ef4444',
            textDecoration: 'line-through',
            fontWeight: '500',
            lineHeight: 1.4,
            wordBreak: 'break-word'
          }}>
            <span style={{ fontWeight: '800', marginRight: '0.3rem', textDecoration: 'none' }}>-</span>
            {enm.textoOriginal || 'Supresión total del apartado'}
          </div>
        )}

        {esModificacion && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {enm.textoOriginal && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                borderLeft: '3px solid #ef4444',
                padding: '0.3rem 0.5rem',
                borderRadius: '0 4px 4px 0',
                color: '#ef4444',
                textDecoration: 'line-through',
                fontSize: '0.73rem',
                lineHeight: 1.35,
                wordBreak: 'break-word'
              }}>
                <span style={{ fontWeight: '800', marginRight: '0.3rem', textDecoration: 'none' }}>Original:</span>
                {enm.textoOriginal}
              </div>
            )}
            <div style={{
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              borderLeft: '3px solid #22c55e',
              padding: '0.35rem 0.5rem',
              borderRadius: '0 4px 4px 0',
              color: '#22c55e',
              fontWeight: '600',
              fontSize: '0.75rem',
              lineHeight: 1.4,
              wordBreak: 'break-word'
            }}>
              <span style={{ fontWeight: '800', marginRight: '0.3rem' }}>➔ Propuesto:</span>
              {enm.textoPropuesto}
            </div>
          </div>
        )}

        {/* Motivación / Justificación */}
        {enm.justificacion && (
          <div style={{
            fontSize: '0.68rem',
            color: 'var(--muted-text)',
            fontStyle: 'italic',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.3rem',
            paddingLeft: '0.25rem',
            marginTop: '0.1rem'
          }}>
            <Quote size={11} style={{ flexShrink: 0, marginTop: '2px', opacity: 0.7 }} />
            <span>{enm.justificacion}</span>
          </div>
        )}
      </div>

      {/* ── PREVISUALIZACIÓN EN CONTEXTO ── */}
      {mostrarPreviewContexto && (
        <div style={{
          backgroundColor: 'var(--panel-bg)',
          border: '1px dashed #3b82f6',
          borderRadius: '6px',
          padding: '0.5rem 0.65rem',
          fontSize: '0.72rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.3rem'
        }}>
          <div style={{ fontWeight: '800', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Eye size={12} /> Previsualización del artículo si se aprueba:
          </div>
          <div style={{
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            padding: '0.4rem 0.55rem',
            borderRadius: '4px',
            color: 'var(--text-color)',
            lineHeight: 1.45,
            whiteSpace: 'pre-wrap'
          }}>
            {calcularTextoSimulado()}
          </div>
        </div>
      )}

      {/* ── BARRA DE ACCIONES ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.4rem',
        marginTop: '0.2rem',
        borderTop: '1px solid var(--subborder-color)',
        paddingTop: '0.4rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {/* Botón de Votación Oficial */}
          <button
            onClick={() => onVotar && onVotar(enm)}
            title="Llevar esta enmienda al widget de Votación de la Sesión"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#3b82f6',
              padding: '0.25rem 0.55rem',
              borderRadius: '4px',
              fontSize: '0.68rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              transition: 'all 0.15s ease'
            }}
          >
            <Vote size={12} />
            <span>Votar Moción</span>
          </button>

          {/* Toggle Previsualizar */}
          {articuloTexto && (
            <button
              onClick={() => setMostrarPreviewContexto(p => !p)}
              title={mostrarPreviewContexto ? 'Ocultar previsualización' : 'Previsualizar en el artículo'}
              style={{
                backgroundColor: mostrarPreviewContexto ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                border: '1px solid var(--subborder-color)',
                color: mostrarPreviewContexto ? '#60a5fa' : 'var(--muted-text)',
                padding: '0.25rem 0.45rem',
                borderRadius: '4px',
                fontSize: '0.68rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem'
              }}
            >
              {mostrarPreviewContexto ? <EyeOff size={11} /> : <Eye size={11} />}
              <span>{mostrarPreviewContexto ? 'Ocultar' : 'Prever'}</span>
            </button>
          )}
        </div>

        {/* Acciones de Estado (Aceptar / Rechazar / Deshacer / Eliminar) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          {enm.estado === 'pendiente' ? (
            <>
              <button
                onClick={() => onResolver && onResolver(enm.id, 'aceptada')}
                title="Aceptar enmienda y actualizar automáticamente el texto de la resolución"
                style={{
                  backgroundColor: '#16a34a',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.25rem 0.55rem',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  transition: 'opacity 0.15s ease'
                }}
              >
                <Check size={12} />
                <span>Aceptar</span>
              </button>

              <button
                onClick={() => onResolver && onResolver(enm.id, 'rechazada')}
                title="Rechazar enmienda"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#ef4444',
                  padding: '0.25rem 0.55rem',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem'
                }}
              >
                <X size={12} />
                <span>Rechazar</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => onResolver && onResolver(enm.id, 'pendiente')}
              title="Revertir decisión y volver a poner en pendiente"
              style={{
                backgroundColor: 'transparent',
                border: '1px solid var(--subborder-color)',
                color: 'var(--muted-text)',
                padding: '0.25rem 0.45rem',
                borderRadius: '4px',
                fontSize: '0.68rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem'
              }}
            >
              <RotateCcw size={11} />
              <span>Deshacer</span>
            </button>
          )}

          <button
            onClick={() => {
              if (window.confirm('¿Eliminar esta enmienda de la sesión?')) {
                onEliminar && onEliminar(enm.id);
              }
            }}
            title="Eliminar enmienda"
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--muted-text)',
              padding: '0.25rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
});

export default EnmiendaCard;
