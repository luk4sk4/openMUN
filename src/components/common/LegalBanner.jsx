import React, { useState, useEffect } from 'react';
import { Cookie, ShieldCheck, X, Check, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { navigateTo, getNormalizedRoute } from '../../utils/router';
import './LegalBanner.css';

const LEGAL_STORAGE_KEY = 'openmun_legal_accepted_v1';

export default function LegalBanner({ isLight = false }) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

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

  const currentRoute = getNormalizedRoute();
  if (currentRoute === 'privacy' || currentRoute === 'terms') return null;
  if (!isVisible) return null;

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-labelledby="legal-banner-title"
      aria-describedby="legal-banner-desc"
      className="openmun-legal-banner"
    >
      <div className="openmun-legal-card">
        {/* Header Row */}
        <div className="openmun-legal-header">
          <div className="openmun-legal-title-group">
            <div className="openmun-legal-icon-box" aria-hidden="true">
              <Cookie size={18} />
            </div>

            <div>
              <div className="openmun-legal-badge">
                <Check size={12} strokeWidth={2.5} aria-hidden="true" />
                <span>{t('legalBanner.noCookiesBadge', '¡SIN COOKIES!')}</span>
              </div>
              <h4 id="legal-banner-title" className="openmun-legal-title">
                {t('legalBanner.title', 'Aviso de Privacidad y Transparencia')}
              </h4>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAccept}
            title={t('common.close', 'Cerrar')}
            aria-label={t('common.close', 'Cerrar')}
            className="openmun-legal-close-btn"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Description */}
        <p id="legal-banner-desc" className="openmun-legal-desc">
          {t(
            'legalBanner.description',
            'En OpenMUN priorizamos tu privacidad: esta web NO utiliza cookies de seguimiento ni de terceros. Solamente almacenamos la sesión de tu Modelo de Naciones Unidas de forma local en tu propio navegador (LocalStorage).'
          )}
        </p>

        {/* Action Buttons Row */}
        <div className="openmun-legal-footer">
          <div className="openmun-legal-links">
            <a
              href="/privacy"
              onClick={(e) => {
                e.preventDefault();
                handleOpenPrivacy();
              }}
              className="openmun-legal-link-btn"
            >
              <ShieldCheck size={14} className="openmun-legal-link-icon" aria-hidden="true" />
              <span>{t('legalBanner.privacyLink', 'Política de Privacidad')}</span>
            </a>

            <a
              href="/terms"
              onClick={(e) => {
                e.preventDefault();
                handleOpenTerms();
              }}
              className="openmun-legal-link-btn"
            >
              <FileText size={14} className="openmun-legal-link-icon" aria-hidden="true" />
              <span>{t('legalBanner.termsLink', 'Términos y Condiciones')}</span>
            </a>
          </div>

          <button
            type="button"
            onClick={handleAccept}
            className="openmun-legal-accept-btn"
          >
            <Check size={15} strokeWidth={2.5} aria-hidden="true" />
            <span>{t('legalBanner.accept', 'Entendido')}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
