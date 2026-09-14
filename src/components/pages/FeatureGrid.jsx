import React from 'react';
import FeatureCard from '../common/FeatureCard';

const FeatureGrid = ({
  FEATURES,
  isLight,
  t,
  surfaceBg,
  borderColor,
  textPrimary,
  accentColor,
  headerBg,
  subBorderColor,
}) => (
  <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <h2
        style={{
          fontSize: '1.35rem',
          fontWeight: '800',
          margin: 0,
          color: textPrimary,
          letterSpacing: '-0.01em',
        }}
      >
        {t('home.systemTools', 'Herramientas del Sistema')}
      </h2>
      <p style={{ fontSize: '0.9rem', color: textPrimary, margin: 0 }}>
        {t('home.systemToolsSubtitle', 'Módulos integrados para la moderación eficiente del debate parlamentario.')}
      </p>
    </div>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1rem',
      }}
    >
      {FEATURES.map((feat, index) => {
        const IconComponent = feat.icon;
        const title = t(`home.features.${index}.title`, feat.title);
        const desc = t(`home.features.${index}.desc`, feat.desc);
        return (
          <FeatureCard
            key={index}
            icon={IconComponent}
            title={title}
            desc={desc}
            surfaceBg={surfaceBg}
            borderColor={borderColor}
            textPrimary={textPrimary}
            accentColor={accentColor}
            isLight={isLight}
          />
        );
      })}
    </div>
  </section>
);

export default FeatureGrid;
