import React, { useState } from 'react';
import {
  Copy,
  FileDown,
  Download,
  Loader2,
  Check,
  Search,
  BookOpen,
  FileText,
  Printer
} from 'lucide-react';
import { reconstruirTextoResolucion } from '../../../utils/resolutionUtils';
import {
  descargarResolucionDocx,
  descargarResolucionPdf,
  descargarResolucionTxt
} from '../../../utils/documentHandlers';

/**
 * Vista formal del Documento Consolidado de Resolución MUN.
 * Presenta el texto con la tipografía y estructura clásica de las Naciones Unidas,
 * preámbulo en cursiva, artículos operativos numerados, resaltado de cláusulas
 * modificadas por enmiendas y exportador multiformato (Word, PDF, TXT).
 */
const VistaConsolidadaOficial = ({
  titulo = 'Proyecto de Resolución',
  articulos = [],
  textoResolucion = '',
  isLight = false,
  onShowToast
}) => {
  const [descargando, setDescargando] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [modoRaw, setModoRaw] = useState(false);

  const textoFinal = articulos && articulos.length > 0
    ? reconstruirTextoResolucion(articulos)
    : (textoResolucion || '');

  const preambulo = articulos.find(a => a.esPreambulo);
  const operativos = articulos.filter(a => !a.esPreambulo);

  const handleCopiar = () => {
    navigator.clipboard.writeText(textoFinal);
    setCopiado(true);
    if (onShowToast) onShowToast('¡Resolución copiada al portapapeles!');
    setTimeout(() => setCopiado(false), 2200);
  };

  const handleDescargar = async (formato) => {
    setDescargando(formato);
    try {
      const payload = {
        titulo: titulo || 'Proyecto de Resolucion',
        articulos: articulos,
        textoRaw: textoFinal
      };

      if (formato === 'docx') {
        await descargarResolucionDocx(payload);
      } else if (formato === 'pdf') {
        await descargarResolucionPdf(payload);
      } else {
        descargarResolucionTxt(payload);
      }
      if (onShowToast) onShowToast(`Archivo ${formato.toUpperCase()} generado correctamente`);
    } catch (err) {
      console.error('Error al exportar resolución:', err);
      alert(`Error al generar archivo ${formato.toUpperCase()}: ${err.message}`);
    } finally {
      setDescargando(null);
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  const articulosFiltrados = articulos.filter(a => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (a.prefijo && a.prefijo.toLowerCase().includes(q)) ||
           (a.texto && a.texto.toLowerCase().includes(q));
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
      {/* ── BARRA DE HERRAMIENTAS Y ACCIONES DE EXPORTACIÓN ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
        backgroundColor: 'var(--card-hover, rgba(255,255,255,0.02))',
        padding: '0.45rem 0.65rem',
        borderRadius: '8px',
        border: '1px solid var(--subborder-color)'
      }}>
        {/* Selector de modo y búsqueda */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            backgroundColor: 'var(--panel-bg)',
            border: '1px solid var(--subborder-color)',
            borderRadius: '5px',
            padding: '0.2rem 0.45rem',
            width: '180px'
          }}>
            <Search size={12} color="var(--muted-text)" />
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar en el documento..."
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--text-color)',
                fontSize: '0.72rem',
                outline: 'none',
                width: '100%'
              }}
            />
          </div>

          <button
            onClick={() => setModoRaw(m => !m)}
            style={{
              backgroundColor: modoRaw ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              border: `1px solid ${modoRaw ? '#3b82f6' : 'var(--subborder-color)'}`,
              color: modoRaw ? '#60a5fa' : 'var(--muted-text)',
              padding: '0.3rem 0.55rem',
              borderRadius: '5px',
              fontSize: '0.72rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            {modoRaw ? <BookOpen size={12} /> : <FileText size={12} />}
            <span>{modoRaw ? 'Ver Formato MUN' : 'Ver Texto Plano'}</span>
          </button>
        </div>

        {/* Botones de Descarga y Copia */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleCopiar}
            style={{
              backgroundColor: copiado ? '#16a34a' : 'var(--card-hover, rgba(255,255,255,0.06))',
              border: `1px solid ${copiado ? '#16a34a' : 'var(--subborder-color)'}`,
              color: copiado ? '#ffffff' : 'var(--text-color)',
              padding: '0.3rem 0.55rem',
              borderRadius: '5px',
              fontSize: '0.72rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              transition: 'all 0.15s ease'
            }}
            title="Copiar resolución completa al portapapeles"
          >
            {copiado ? <Check size={12} /> : <Copy size={12} />}
            <span>{copiado ? '¡Copiado!' : 'Copiar'}</span>
          </button>

          {/* Word (.docx) */}
          <button
            onClick={() => handleDescargar('docx')}
            disabled={descargando === 'docx'}
            title="Descargar documento Word (.docx) con formato formal"
            style={{
              backgroundColor: 'rgba(37, 99, 235, 0.15)',
              border: '1px solid #3b82f6',
              color: '#60a5fa',
              padding: '0.3rem 0.55rem',
              borderRadius: '5px',
              fontSize: '0.72rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            {descargando === 'docx' ? (
              <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <FileDown size={12} />
            )}
            <span>Word (.docx)</span>
          </button>

          {/* PDF (.pdf) */}
          <button
            onClick={() => handleDescargar('pdf')}
            disabled={descargando === 'pdf'}
            title="Descargar documento formal en PDF (.pdf)"
            style={{
              backgroundColor: 'rgba(220, 38, 38, 0.15)',
              border: '1px solid #ef4444',
              color: '#f87171',
              padding: '0.3rem 0.55rem',
              borderRadius: '5px',
              fontSize: '0.72rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            {descargando === 'pdf' ? (
              <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <FileDown size={12} />
            )}
            <span>PDF (.pdf)</span>
          </button>

          {/* TXT */}
          <button
            onClick={() => handleDescargar('txt')}
            disabled={descargando === 'txt'}
            title="Descargar archivo de texto plano (.txt)"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid #10b981',
              color: '#34d399',
              padding: '0.3rem 0.55rem',
              borderRadius: '5px',
              fontSize: '0.72rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            {descargando === 'txt' ? (
              <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Download size={12} />
            )}
            <span>TXT</span>
          </button>
        </div>
      </div>

      {/* ── CUERPO DEL DOCUMENTO FORMAL ── */}
      {modoRaw ? (
        /* Vista de Texto Plano / Markdown */
        <div style={{
          backgroundColor: 'var(--panel-bg)',
          border: '1px solid var(--subborder-color)',
          borderRadius: '8px',
          padding: '1rem',
          fontSize: '0.8rem',
          lineHeight: 1.6,
          color: 'var(--text-color)',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          userSelect: 'text',
          overflowY: 'auto'
        }}>
          {textoFinal || 'Sin contenido de resolución cargado.'}
        </div>
      ) : (
        /* Vista Formal de Documento de Naciones Unidas */
        <div style={{
          backgroundColor: isLight ? '#ffffff' : '#0f172a',
          border: '1px solid var(--subborder-color)',
          borderRadius: '8px',
          padding: '1.5rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          userSelect: 'text',
          overflowY: 'auto'
        }}>
          {/* Título Principal y Encabezado de Asamblea */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid var(--subborder-color)', paddingBottom: '1rem' }}>
            <div style={{
              fontSize: '0.72rem',
              letterSpacing: '0.12em',
              fontWeight: '900',
              color: 'var(--muted-text)',
              textTransform: 'uppercase',
              marginBottom: '0.35rem'
            }}>
              NACIONES UNIDAS • PROYECTO OFICIAL DE RESOLUCIÓN
            </div>
            <h2 style={{
              fontSize: '1.2rem',
              fontWeight: '900',
              color: 'var(--text-color)',
              margin: '0.25rem 0',
              letterSpacing: '-0.01em'
            }}>
              {titulo || 'Proyecto de Resolución'}
            </h2>
            <div style={{
              fontSize: '0.74rem',
              color: 'var(--muted-text)',
              marginTop: '0.35rem',
              display: 'flex',
              justifyContent: 'center',
              gap: '1rem'
            }}>
              <span>{operativos.length} Cláusulas Operativas</span>
              {preambulo && <span>• Cláusulas Preambulatorias</span>}
            </div>
          </div>

          {/* Cláusulas Preambulatorias */}
          {preambulo && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: '900',
                color: '#a855f7',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <span>CLÁUSULAS PREAMBULATORIAS</span>
              </div>
              <div style={{
                fontSize: '0.82rem',
                lineHeight: 1.7,
                color: 'var(--text-color)',
                fontStyle: 'italic',
                paddingLeft: '0.75rem',
                borderLeft: '3px solid rgba(168, 85, 247, 0.4)',
                whiteSpace: 'pre-wrap'
              }}>
                {preambulo.texto}
              </div>
            </div>
          )}

          {/* Separador */}
          {operativos.length > 0 && (
            <div style={{
              borderTop: '1px dashed var(--subborder-color)',
              margin: '0.5rem 0'
            }} />
          )}

          {/* Cláusulas Operativas */}
          {operativos.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: '900',
                color: '#3b82f6',
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
              }}>
                CLÁUSULAS OPERATIVAS
              </div>

              {articulosFiltrados.filter(a => !a.esPreambulo).map(art => (
                <div
                  key={art.id}
                  style={{
                    backgroundColor: art.modificado ? 'rgba(34, 197, 94, 0.04)' : 'transparent',
                    border: art.modificado ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid transparent',
                    borderRadius: '6px',
                    padding: art.modificado ? '0.5rem 0.65rem' : '0.2rem 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem' }}>
                    <span style={{
                      fontWeight: '800',
                      color: 'var(--text-color)',
                      fontSize: '0.84rem',
                      flexShrink: 0
                    }}>
                      {art.prefijo || `Artículo ${art.numero}.`}
                    </span>
                    <span style={{
                      fontSize: '0.82rem',
                      lineHeight: 1.6,
                      color: 'var(--text-color)',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {art.texto}
                    </span>
                    {art.modificado && (
                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: '800',
                        color: '#22c55e',
                        backgroundColor: 'rgba(34, 197, 94, 0.12)',
                        padding: '0.1rem 0.35rem',
                        borderRadius: '3px',
                        alignSelf: 'flex-start',
                        flexShrink: 0
                      }}>
                        Modificado
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {articulos.length === 0 && !textoFinal && (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted-text)', fontSize: '0.85rem' }}>
              No hay cláusulas en la resolución actual. Carga un archivo Word/PDF o pega el texto desde la pestaña "Cargar / Importar".
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VistaConsolidadaOficial;
