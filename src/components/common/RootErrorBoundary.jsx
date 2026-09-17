import React, { Component } from 'react';
import { RefreshCw, AlertTriangle, Sparkles, Copy, Check, Home } from 'lucide-react';
import OpenMunLogo from './OpenMunLogo';

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

export class RootErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
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
    this.setState({ errorInfo });
    console.error('[OpenMUN RootErrorBoundary] Uncaught application error:', error, errorInfo);

    // If it's a chunk error and we haven't attempted a force reload in this session, do it once automatically ONLY if online
    if (isDynamicChunkError(error)) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        console.warn('[OpenMUN RootErrorBoundary] Suppressing automatic reload for chunk error because user is offline.');
        return;
      }
      const reloadKey = 'openmun_root_chunk_reload';
      const hasReloaded = window.sessionStorage?.getItem(reloadKey) === 'true';
      if (!hasReloaded) {
        window.sessionStorage?.setItem(reloadKey, 'true');
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const confirmReload = window.confirm(
        'Actualmente no tienes conexión a internet. Si recargas ahora y no tienes los recursos en caché, la pantalla podría quedar inaccesible hasta que regrese la conexión. ¿Deseas recargar de todos modos?'
      );
      if (!confirmReload) return;
    }
    // Clear chunk reload flags before manual reload
    try {
      Object.keys(window.sessionStorage || {}).forEach((k) => {
        if (k.startsWith('openmun_lazy_reload_') || k === 'openmun_root_chunk_reload') {
          window.sessionStorage.removeItem(k);
        }
      });
    } catch (_) {}
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleCopyError = () => {
    const errorDetails = `OpenMUN Error Report:
Error: ${this.state.error?.toString() || 'Unknown'}
Location: ${window.location.href}
Time: ${new Date().toISOString()}
Component Stack:
${this.state.errorInfo?.componentStack || 'No component stack available'}`;

    navigator.clipboard.writeText(errorDetails).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render() {
    if (this.state.hasError) {
      const isLight = document.documentElement.classList.contains('light-theme') || 
                      localStorage.getItem('openmun_theme') === 'light';
      const isChunk = this.state.isChunkError;

      return (
        <div
          className={`min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-300 ${
            isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'
          }`}
          style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
        >
          {/* Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />

          <div
            className={`relative z-10 max-w-xl w-full rounded-2xl p-8 text-center backdrop-blur-xl border shadow-2xl transition-all ${
              isLight
                ? 'bg-white/90 border-slate-200 shadow-slate-200/50'
                : 'bg-slate-900/90 border-slate-800 shadow-black/80'
            }`}
          >
            <div className="flex justify-center mb-6">
              <OpenMunLogo className="h-10 text-blue-500" />
            </div>

            {/* Badge */}
            {isChunk ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30 mb-4">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>Nueva versión de OpenMUN</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Error de Ejecución</span>
              </div>
            )}

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">
              {isChunk
                ? 'Actualización lista para aplicar'
                : 'Se ha producido un error inesperado'}
            </h1>

            <p
              className={`text-sm leading-relaxed mb-6 ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              {isChunk
                ? 'Se ha desplegado una nueva versión de la aplicación. Tus datos y comités están guardados de forma segura en tu navegador. Haz clic en el botón para recargar y sincronizar con la última versión.'
                : 'Ha ocurrido un problema al procesar este elemento. Tu sesión, oradores y notas continúan almacenados de forma segura en la memoria local.'}
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/30 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{isChunk ? 'Actualizar ahora' : 'Recargar aplicación'}</span>
              </button>

              <button
                onClick={this.handleGoHome}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all border cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 hover:bg-slate-100 text-slate-700'
                    : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Ir al Inicio</span>
              </button>
            </div>

            {/* Error Details Accordion */}
            <div className="text-left">
              <details
                className={`text-xs rounded-xl p-3 border transition-colors ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                }`}
              >
                <summary className="font-semibold cursor-pointer select-none flex items-center justify-between">
                  <span>Detalles técnicos del error</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      this.handleCopyError();
                    }}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors ml-2"
                  >
                    {this.state.copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{this.state.copied ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </summary>
                <div className="mt-3 overflow-x-auto max-h-48 whitespace-pre-wrap font-mono text-[11px] opacity-80 leading-relaxed">
                  <strong>Mensaje:</strong> {this.state.error && this.state.error.toString()}
                  {this.state.errorInfo?.componentStack && (
                    <>
                      <br /><br />
                      <strong>Component Stack:</strong>
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </div>
              </details>
            </div>
          </div>

          <div
            className={`mt-6 text-xs relative z-10 ${
              isLight ? 'text-slate-500' : 'text-slate-500'
            }`}
          >
            OpenMUN &copy; {new Date().getFullYear()} — Plataforma Web para Modelos de Naciones Unidas
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RootErrorBoundary;
