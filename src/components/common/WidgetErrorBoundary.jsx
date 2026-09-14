import React, { Component } from 'react';
import { AlertCircle, RefreshCw, Sparkles } from 'lucide-react';

function isDynamicChunkError(error) {
  if (!error) return false;
  const msg = (error.message || error.toString() || '').toLowerCase();
  return (
    error.name === 'ChunkLoadError' ||
    msg.includes('dynamically imported module') ||
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('load failed') ||
    msg.includes('loading chunk')
  );
}

export class WidgetErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isChunkError: false
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
      isChunkError: isDynamicChunkError(error)
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[WidgetErrorBoundary] Error in widget ${this.props.widgetId}:`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, isChunkError: false });
  };

  handleReloadPage = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { widgetTitle = 'Widget', isLight } = this.props;
      const isChunk = this.state.isChunkError;

      return (
        <div
          style={{
            height: '100%',
            minHeight: '180px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
            textAlign: 'center',
            backgroundColor: isLight ? 'rgba(241, 245, 249, 0.7)' : 'rgba(15, 23, 42, 0.6)',
            color: 'var(--text-color)',
            borderRadius: 'var(--border-radius)',
            gap: '0.75rem'
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              padding: '8px',
              borderRadius: '50%',
              backgroundColor: isChunk ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: isChunk ? '#3b82f6' : '#ef4444'
            }}
          >
            {isChunk ? <Sparkles size={20} /> : <AlertCircle size={20} />}
          </div>

          <div style={{ maxWidth: '280px' }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 600 }}>
              {isChunk ? 'Nueva versión disponible' : `Error en ${widgetTitle}`}
            </h4>
            <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.7, lineHeight: 1.35 }}>
              {isChunk
                ? 'El widget se ha actualizado en el servidor. Pulsa recargar para sincronizar.'
                : 'No se pudo cargar este módulo correctamente. Tus datos siguen intactos.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            {isChunk ? (
              <button
                onClick={this.handleReloadPage}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={13} />
                <span>Actualizar aplicación</span>
              </button>
            ) : (
              <button
                onClick={this.handleRetry}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  backgroundColor: isLight ? '#e2e8f0' : '#334155',
                  color: 'var(--text-color)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={13} />
                <span>Reintentar</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default WidgetErrorBoundary;
