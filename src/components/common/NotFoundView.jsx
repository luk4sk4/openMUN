import React from 'react';
import { Home, AlertCircle, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import OpenMunLogo from './OpenMunLogo';

export default function NotFoundView({ isLight = false, onGoHome }) {
  const { t } = useTranslation();

  const handleHomeClick = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-300 ${
        isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Background ambient glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Main card container */}
      <div
        className={`relative z-10 max-w-lg w-full rounded-2xl p-8 text-center backdrop-blur-xl border shadow-2xl transition-all ${
          isLight
            ? 'bg-white/80 border-slate-200 shadow-slate-200/50'
            : 'bg-slate-900/80 border-slate-800/80 shadow-black/60'
        }`}
      >
        <div className="flex justify-center mb-6">
          <OpenMunLogo className="h-10 text-blue-500" />
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20 mb-6">
          <AlertCircle className="w-4 h-4" />
          <span>{t('notFound.badge', 'Error 404')}</span>
        </div>

        <h1 className="text-7xl font-extrabold bg-gradient-to-r from-blue-400 via-indigo-500 to-sky-400 bg-clip-text text-transparent mb-3">
          404
        </h1>

        <h2 className="text-2xl font-bold mb-3 tracking-tight">
          {t('notFound.title', 'Página no encontrada')}
        </h2>

        <p
          className={`text-sm leading-relaxed mb-8 ${
            isLight ? 'text-slate-600' : 'text-slate-400'
          }`}
        >
          {t(
            'notFound.description',
            'La vista o enlace al que intentas acceder no existe, ha sido movido o el modo especificado no es válido.'
          )}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleHomeClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/30 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Home className="w-4 h-4" />
            <span>{t('notFound.backHome', 'Volver al Inicio')}</span>
          </button>
          
          <button
            onClick={() => window.history.back()}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all border ${
              isLight
                ? 'bg-slate-50 border-slate-300 hover:bg-slate-100 text-slate-700'
                : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('common.back', 'Volver atrás')}</span>
          </button>
        </div>
      </div>

      {/* Footer hint */}
      <div className={`mt-8 text-xs relative z-10 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
        OpenMUN &copy; {new Date().getFullYear()} — Plataforma Web de Modelo de Naciones Unidas
      </div>
    </div>
  );
}
