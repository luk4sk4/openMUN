import React from 'react';
import { Heart, X, Coffee, Code2, ExternalLink } from 'lucide-react';

const DonationBanner = ({ showDonationBanner, setShowDonationBanner, isLight, t }) => {
  if (!showDonationBanner) return null;
  const bannerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1.25rem',
    padding: '1rem 1.25rem',
    borderRadius: '14px',
    background: isLight
      ? 'linear-gradient(135deg, rgba(254, 243, 199, 0.95) 0%, rgba(253, 230, 138, 0.75) 100%)'
      : 'linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(180, 83, 9, 0.1) 100%)',
    border: isLight
      ? '1px solid rgba(245, 158, 11, 0.4)'
      : '1px solid rgba(245, 158, 11, 0.3)',
    boxShadow: isLight
      ? '0 4px 16px rgba(245, 158, 11, 0.12)'
      : '0 4px 20px rgba(0, 0, 0, 0.25)',
    backdropFilter: 'blur(10px)',
    position: 'relative',
    flexWrap: 'wrap',
  };

  const leftStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    flex: '1 1 320px',
  };

  const iconWrapper = {
    width: '42px',
    height: '42px',
    minWidth: '42px',
    borderRadius: '10px',
    backgroundColor: isLight ? '#f59e0b' : 'rgba(245, 158, 11, 0.25)',
    color: isLight ? '#ffffff' : '#fbbf24',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: isLight ? '0 2px 8px rgba(245, 158, 11, 0.3)' : 'none',
  };

  const textContainer = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
  };

  const titleStyle = {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: isLight ? '#92400e' : '#fef3c7',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  };

  const descStyle = {
    fontSize: '0.84rem',
    color: isLight ? '#78350f' : '#d1d5db',
    lineHeight: '1.4',
  };

  const buttonStyle = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: isLight ? '#92400e' : '#9ca3af',
    padding: '0.35rem',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.75,
    transition: 'all 0.15s ease',
  };

  return (
    <div style={bannerStyle}>
      <div style={leftStyle}>
        <div style={iconWrapper}>
          <Heart size={20} fill={isLight ? '#ffffff' : '#fbbf24'} />
        </div>
        <div style={textContainer}>
          <div style={titleStyle}>
            {t('home.donationBannerTitle', '¡Apoya el mantenimiento de OpenMUN!')}
          </div>
          <div style={descStyle}>
            {t(
              'home.donationBannerDesc',
              'OpenMUN es 100% gratuito, libre y sin publicidad. Tu donación nos ayuda a costear los servidores y mantener la plataforma activa para todas las delegaciones.'
            )}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto' }}>
        <a
          href="https://buymeacoffee.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 1.15rem',
            borderRadius: '8px',
            backgroundColor: '#ffdd00',
            color: '#000000',
            fontSize: '0.85rem',
            fontWeight: '800',
            textDecoration: 'none',
            boxShadow: '0 3px 10px rgba(255, 221, 0, 0.3)',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 5px 14px rgba(255, 221, 0, 0.45)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 3px 10px rgba(255, 221, 0, 0.3)';
          }}
        >
          <Coffee size={16} /> {t('home.coffee', 'Invítanos a un café')}
        </a>
        <button
          onClick={() => setShowDonationBanner(false)}
          title="Cerrar banner"
          style={buttonStyle}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.75')}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default DonationBanner;
