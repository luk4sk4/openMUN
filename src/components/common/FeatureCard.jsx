import React from 'react';

const FeatureCard = ({
  icon: IconComponent,
  title,
  desc,
  surfaceBg,
  borderColor,
  textPrimary,
  accentColor,
  isLight,
}) => (
  <div
    style={{
      backgroundColor: surfaceBg,
      border: `1px solid ${borderColor}`,
      borderRadius: '12px',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.65rem',
    }}
  >
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '38px',
        height: '38px',
        borderRadius: '8px',
        backgroundColor: isLight ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.15)',
        color: accentColor,
      }}
    >
      <IconComponent size={20} />
    </div>
    <h3
      style={{
        fontSize: '1rem',
        fontWeight: '700',
        margin: 0,
        color: textPrimary,
      }}
    >
      {title}
    </h3>
    <p
      style={{
        fontSize: '0.86rem',
        lineHeight: '1.5',
        color: textPrimary,
        margin: 0,
      }}
    >
      {desc}
    </p>
  </div>
);

export default FeatureCard;
