import React, { useState, useEffect } from 'react';
import { Cookie, ShieldCheck, X, Check, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { navigateTo } from '../../utils/router';

const LEGAL_STORAGE_KEY = 'openmun_legal_accepted_v1';

export default function LegalBanner({ isLight = false }) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState(null);

  useEffect(() => {
    try {
      const accepted = localStorage.getItem(LEGAL_STORAGE_KEY);
      if (!accepted) {
        setIsVisible(true);
      }
    } catch (e) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(LEGAL_STORAGE_KEY, 'true');
    } catch (e) {
      // Ignore localstorage error
    }
    setIsVisible(false);
  };

  const handleOpenPrivacy = () => {
    navigateTo('/privacy');
  };

  const handleOpenTerms = () => {
    navigateTo('/terms');
  };

  if (!isVisible) return null;

  // Visual Theme Colors
  const containerBg = isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(15, 23, 42, 0.96)';
  const borderColor = isLight ? 'rgba(203, 213, 225, 0.9)' : 'rgba(51, 65, 85, 0.8)';
  const shadowColor = isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.7)';
  const titleColor = isLight ? '#0f172a' : '#f8fafc';
  const descColor = isLight ? '#475569' : '#cbd5e1';
  const subBorderColor = isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.12)';
  const btnSecondaryBg = isLight ? '#f1f5f9' : '#1e293b';
  const btnSecondaryBorder = isLight ? '#cbd5e1' : '#334155';
  const btnSecondaryText = isLight ? '#334155' : '#e2e8f0';

  return (
    <div
      role="dialog"
      aria-label="Aviso Legal y Privacidad"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        left: '20px',
        maxWidth: '580px',
        margin: '0 auto',
        zIndex: 99999,
        animation: 'slideUp 0.35s ease-out'
      }}
    >
      <div
        style={{
          padding: '1.25rem 1.5rem',
          borderRadius: '16px',
          backgroundColor: containerBg,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${borderColor}`,
          boxShadow: `0 20px 40px -10px ${shadowColor}`,
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}
      >
        {/* Glow ambient accent */}
        <div
          style={{
            position: 'absolute',
            top: '-30px',
            left: '-30px',
            width: '120px',
            height: '120px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            borderRadius: '50%',
            filter: 'blur(30px)',
            pointerEvents: 'none'
          }}
        />

        {/* Header Row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                padding: '0.5rem',
                borderRadius: '12px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Cookie size={20} />
            </div>

            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  fontSize: '0.68rem',
                  fontWeight: '800',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  marginBottom: '0.25rem'
                }}
              >
                <Check size={12} strokeWidth={3} />
                <span>{t('legalBanner.noCookiesBadge', '¡SIN COOKIES!')}</span>
              </div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: titleColor, letterSpacing: '-0.01em' }}>
                {t('legalBanner.title', 'Aviso de Privacidad y Transparencia')}
              </h4>
            </div>
          </div>

          <button
            onClick={handleAccept}
            title={t('common.close', 'Cerrar')}
            style={{
              background: 'none',
              border: 'none',
              color: isLight ? '#64748b' : '#94a3b8',
              cursor: 'pointer',
              padding: '0.35rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isLight ? '#e2e8f0' : '#334155'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Description */}
        <p
          style={{
            margin: '0 0 1rem 0',
            fontSize: '0.85rem',
            lineHeight: '1.55',
            color: descColor,
            position: 'relative',
            zIndex: 1
          }}
        >
          {t(
            'legalBanner.description',
            'En OpenMUN priorizamos tu privacidad: esta web NO utiliza cookies de seguimiento ni de terceros. Solamente almacenamos la sesión de tu Modelo de Naciones Unidas de forma local en tu propio navegador (LocalStorage).'
          )}
        </p>

        {/* Action Buttons Row */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            paddingTop: '0.85rem',
            borderTop: `1px solid ${subBorderColor}`,
            position: 'relative',
            zIndex: 1
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleOpenPrivacy}
              onMouseEnter={() => setHoveredBtn('privacy')}
              onMouseLeave={() => setHoveredBtn(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                border: `1px solid ${btnSecondaryBorder}`,
                backgroundColor: hoveredBtn === 'privacy' ? (isLight ? '#e2e8f0' : '#334155') : btnSecondaryBg,
                color: btnSecondaryText,
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <ShieldCheck size={14} style={{ color: '#10b981' }} />
              <span>{t('legalBanner.privacyLink', 'Política de Privacidad')}</span>
            </button>

            <button
              onClick={handleOpenTerms}
              onMouseEnter={() => setHoveredBtn('terms')}
              onMouseLeave={() => setHoveredBtn(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                border: `1px solid ${btnSecondaryBorder}`,
                backgroundColor: hoveredBtn === 'terms' ? (isLight ? '#e2e8f0' : '#334155') : btnSecondaryBg,
                color: btnSecondaryText,
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <FileText size={14} style={{ color: '#3b82f6' }} />
              <span>{t('legalBanner.termsLink', 'Términos y Condiciones')}</span>
            </button>
          </div>

          <button
            onClick={handleAccept}
            onMouseEnter={() => setHoveredBtn('accept')}
            onMouseLeave={() => setHoveredBtn(null)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              padding: '0.5rem 1.25rem',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: hoveredBtn === 'accept' ? '#059669' : '#10b981',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
              transform: hoveredBtn === 'accept' ? 'translateY(-1px)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Check size={16} strokeWidth={2.5} />
            <span>{t('legalBanner.accept', 'Entendido')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
