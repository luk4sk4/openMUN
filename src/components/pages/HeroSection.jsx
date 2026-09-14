import React from 'react';

const HeroSection = ({ isLight, t, onNavigateToComienzo, onNavigateToJoin, headerBg, surfaceBg, borderColor, subBorderColor, textPrimary, textMuted, accentColor }) => (
  <section
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      padding: '3rem 2rem 2.5rem 2rem',
      borderRadius: '16px',
      backgroundColor: isLight ? 'rgba(255, 255, 255, 0.9)' : 'rgba(22, 25, 34, 0.9)',
      backdropFilter: 'blur(12px)',
      border: `1px solid ${borderColor}`,
      boxShadow: isLight ? '0 4px 20px rgba(0, 0, 0, 0.04)' : '0 10px 30px rgba(0, 0, 0, 0.25)',
    }}
  >
    {/* Logo oficial */}
    <div style={{ marginBottom: '1.25rem' }}>
      {/* OpenMunLogo is imported in HomePage and forwarded as a child */}
      {/* Placeholder: render children if provided */}
      {/**/}
    </div>

    {/* Título principal */}
    <h1
      style={{
        fontSize: 'clamp(1.75rem, 3.5vw, 2.4rem)',
        fontWeight: '800',
        lineHeight: '1.25',
        maxWidth: '820px',
        margin: '0 0 0.85rem 0',
        letterSpacing: '-0.02em',
        color: textPrimary,
      }}
    >
      {t('home.heroTitle', 'La plataforma abierta y definitiva para Modelos de Naciones Unidas')}
    </h1>
    {/* Subtítulo */}
    <p
      style={{
        fontSize: '1.05rem',
        lineHeight: '1.6',
        maxWidth: '680px',
        color: textMuted,
        fontWeight: '400',
      }}
    >
      {t('home.heroSubtitle', 'Diseñada para Mesas de Presidencia, Delegados, Secretaría y Equipos de Crisis. Sincronización en tiempo real en sesiones en vivo, cronómetros de alta precisión, mapas dinámicos y cero configuraciones de servidor.')}
    </p>

    {/* Accesos Rápidos Principales */}
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem',
        width: '100%',
        maxWidth: '800px',
        marginBottom: '1.75rem',
      }}
    >
      {/* Card Mesa (Chair) */}
      <div
        style={{
          backgroundColor: headerBg,
          border: `1px solid ${subBorderColor}`,
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '1rem',
          textAlign: 'left',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <Play size={18} style={{ color: accentColor }} />
            <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0, color: textPrimary }}>
              {t('home.chairCardTitle', 'Mesa de Presidencia')}
            </h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: textMuted, margin: 0, lineHeight: '1.45' }}>
            {t('home.chairCardDesc', 'Panel de control completo para moderar debate, oradores, caucuses y votaciones.')}
          </p>
        </div>
        <button
          onClick={onNavigateToComienzo}
          style={{
            padding: '0.65rem 1rem',
            backgroundColor: accentColor,
            color: '#ffffff',
            fontWeight: '700',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2563eb')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = accentColor)}
        >
          <Play size={16} fill="#ffffff" /> {t('home.startModerating', 'Iniciar Moderación')}
        </button>
      </div>

      {/* Card Unirse a Sala (Delegados) */}
      <div
        style={{
          backgroundColor: headerBg,
          border: `1px solid ${subBorderColor}`,
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '1rem',
          textAlign: 'left',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <Radio size={18} style={{ color: '#10b981' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0, color: textPrimary }}>
              {t('home.joinCardTitle', 'Unirse a Sesión')}
            </h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: textMuted, margin: 0, lineHeight: '1.45' }}>
            {t('home.joinCardDesc', 'Conéctate en directo mediante código de sala o QR para seguir la sesión.')}
          </p>
        </div>
        <button
          onClick={onNavigateToJoin}
          style={{
            padding: '0.65rem 1rem',
            backgroundColor: isLight ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: isLight ? '#059669' : '#34d399',
            fontWeight: '700',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e =>
            (e.currentTarget.style.backgroundColor = isLight ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.25)')
          }
          onMouseLeave={e =>
            (e.currentTarget.style.backgroundColor = isLight ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.15)')
          }
        >
          <Radio size={16} /> {t('home.joinLive', 'Unirse a Sesión en Vivo')}
        </button>
      </div>
    </div>
  </section>
);

export default HeroSection;
