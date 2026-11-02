import React, { useEffect } from 'react';
import {
  X,
  Users,
  Clock,
  FileText,
  Vote,
  Radio,
  Sliders,
  HelpCircle,
  Play
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const stepsData = [
  {
    badge: '01',
    badgeLabelKey: 'home.step1Badge',
    titleKey: 'home.step1Title',
    descKey: 'home.step1Desc',
    titleDefault: 'Prepara tu Comité',
    descDefault: 'Importa la lista de países o delegaciones desde un archivo Excel o texto plano. Establece el quorum y configura los tiempos iniciales de debate.',
    labelDefault: 'Preparación'
  },
  {
    badge: '02',
    badgeLabelKey: 'home.step2Badge',
    titleKey: 'home.step2Title',
    descKey: 'home.step2Desc',
    titleDefault: 'Modera el Debate',
    descDefault: 'Gestiona la Lista General de Oradores (GSL), cronometra intervenciones, introduce caucuses moderados o no moderados y computa votaciones con mayorías automáticas.',
    labelDefault: 'Moderación'
  },
  {
    badge: '03',
    badgeLabelKey: 'home.step3Badge',
    titleKey: 'home.step3Title',
    descKey: 'home.step3Desc',
    titleDefault: 'Proyecta y Sincroniza',
    descDefault: 'Conecta en directo la pantalla de delegaciones o el proyector de Secretaría mediante un código QR o enlace web sin depender de cables.',
    labelDefault: 'Transmisión'
  },
];

const FEATURES = [
  {
    icon: Users,
    titleKey: 'home.features.0.title',
    descKey: 'home.features.0.desc',
    titleDefault: 'Lista General de Oradores (GSL)',
    descDefault: 'Gestión fluida de delegaciones con tiempos configurables por orador, cesiones de palabra y visualización en cola en tiempo real.'
  },
  {
    icon: Clock,
    titleKey: 'home.features.1.title',
    descKey: 'home.features.1.desc',
    titleDefault: 'Cronómetros Dinámicos',
    descDefault: 'Temporizadores para caucuses y tiempos individuales por orador con indicadores de semáforo y alertas sonoras optativas.'
  },
  {
    icon: FileText,
    titleKey: 'home.features.2.title',
    descKey: 'home.features.2.desc',
    titleDefault: 'Pizarra de Mociones',
    descDefault: 'Registro rápido de propuestas parlamentarias con orden de precedencia automático, tipo de debate y votación inmediata.'
  },
  {
    icon: Vote,
    titleKey: 'home.features.3.title',
    descKey: 'home.features.3.desc',
    titleDefault: 'Sistema de Votaciones & Quorum',
    descDefault: 'Cálculo instantáneo de mayorías (simple, 2/3, cualificada), votación en rol, registro de presentes y abstenciones automáticas.'
  },
  {
    icon: Radio,
    titleKey: 'home.features.4.title',
    descKey: 'home.features.4.desc',
    titleDefault: 'Transmisión en Directo',
    descDefault: 'Sincronización en tiempo real entre la Mesa, delegados y pantallas de proyección utilizando WebSockets seguros (WSS) y canales locales de alta velocidad.'
  },
  {
    icon: Sliders,
    titleKey: 'home.features.5.title',
    descKey: 'home.features.5.desc',
    titleDefault: 'Tablero Modular Personalizable',
    descDefault: 'Disposición flexible de widgets, soporte para modo claro/oscuro, ajuste de tipografía para dislexia y exportación de datos.'
  }
];

const HowToUseModal = ({ isOpen, onClose, onStartModeration }) => {
  const { t } = useTranslation();

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-to-use-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--panel-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          width: '840px',
          maxWidth: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.4)',
          color: 'var(--text-color)',
          fontFamily: 'var(--font-family, Inter, system-ui, sans-serif)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.15rem 1.5rem',
            borderBottom: '1px solid var(--subborder-color)',
            backgroundColor: 'var(--card-header-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <HelpCircle size={20} style={{ color: 'var(--accent-color)' }} />
            <div>
              <h2
                id="how-to-use-title"
                style={{
                  margin: 0,
                  fontSize: '1.15rem',
                  fontWeight: '800',
                  letterSpacing: '-0.01em',
                  color: 'var(--text-color)',
                  textTransform: 'uppercase'
                }}
              >
                {t('home.howToUseOpenMun', '¿Cómo usar OpenMUN?')}
              </h2>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted-text)', marginTop: '2px' }}>
                {t('home.howToUseSubtitle', 'Flujo de trabajo para simulaciones y herramientas disponibles')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label={t('common.close', 'Cerrar')}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted-text)',
              padding: '0.4rem',
              borderRadius: 'var(--border-radius, 6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s ease, color 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--subborder-color)';
              e.currentTarget.style.color = 'var(--text-color)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--muted-text)';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: '1.5rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem'
          }}
        >
          {/* Sección 1: ¿Cómo iniciar una simulación? */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <h3
                style={{
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  margin: '0 0 0.25rem 0',
                  color: 'var(--text-color)'
                }}
              >
                {t('home.workflowTitle', '¿Cómo iniciar una simulación?')}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted-text)', margin: 0 }}>
                {t('home.workflowSubtitle', 'Pasos recomendados para comenzar a operar la Mesa de Presidencia.')}
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                gap: '1rem'
              }}
            >
              {stepsData.map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px solid var(--subborder-color)',
                    borderRadius: 'var(--border-radius, 6px)',
                    padding: '1.15rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        color: 'var(--accent-color)',
                        fontFamily: 'monospace',
                        padding: '0.15rem 0.45rem',
                        backgroundColor: 'var(--panel-color)',
                        border: '1px solid var(--subborder-color)',
                        borderRadius: '4px'
                      }}
                    >
                      PASO {step.badge}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted-text)', fontWeight: '600' }}>
                      {t(step.badgeLabelKey, step.labelDefault)}
                    </span>
                  </div>

                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', margin: 0, color: 'var(--text-color)' }}>
                    {t(step.titleKey, step.titleDefault)}
                  </h4>

                  <p style={{ fontSize: '0.84rem', color: 'var(--muted-text)', margin: 0, lineHeight: '1.5' }}>
                    {t(step.descKey, step.descDefault)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Sección 2: Herramientas del Sistema */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <h3
                style={{
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  margin: '0 0 0.25rem 0',
                  color: 'var(--text-color)'
                }}
              >
                {t('home.systemTools', 'Herramientas del Sistema')}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted-text)', margin: 0 }}>
                {t('home.systemToolsSubtitle', 'Módulos integrados para la moderación eficiente del debate parlamentario.')}
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                gap: '1rem'
              }}
            >
              {FEATURES.map((feat, index) => {
                const IconComponent = feat.icon;
                const title = t(feat.titleKey, feat.titleDefault);
                const desc = t(feat.descKey, feat.descDefault);
                return (
                  <div
                    key={index}
                    style={{
                      backgroundColor: 'var(--card-header-bg)',
                      border: '1px solid var(--subborder-color)',
                      borderRadius: 'var(--border-radius, 6px)',
                      padding: '1.15rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--border-radius, 6px)',
                          backgroundColor: 'var(--panel-color)',
                          border: '1px solid var(--subborder-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--accent-color)'
                        }}
                      >
                        <IconComponent size={16} />
                      </div>
                      <h4
                        style={{
                          fontSize: '0.92rem',
                          fontWeight: '700',
                          margin: 0,
                          color: 'var(--text-color)'
                        }}
                      >
                        {title}
                      </h4>
                    </div>

                    <p
                      style={{
                        fontSize: '0.84rem',
                        lineHeight: '1.5',
                        color: 'var(--muted-text)',
                        margin: 0
                      }}
                    >
                      {desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '0.85rem 1.5rem',
            borderTop: '1px solid var(--subborder-color)',
            backgroundColor: 'var(--card-header-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          {onStartModeration ? (
            <button
              onClick={() => {
                onClose();
                onStartModeration();
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1.15rem',
                borderRadius: 'var(--border-radius, 6px)',
                backgroundColor: 'var(--btn-bg)',
                color: 'var(--btn-text)',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'filter 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
            >
              <Play size={15} fill="currentColor" />
              <span>{t('home.startModerating', 'Iniciar Moderación')}</span>
            </button>
          ) : <div />}

          <button
            onClick={onClose}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: 'var(--border-radius, 6px)',
              backgroundColor: 'var(--panel-color)',
              color: 'var(--text-color)',
              border: '1px solid var(--border-color)',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--subborder-color)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--panel-color)'}
          >
            {t('common.close', 'Cerrar')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HowToUseModal;
