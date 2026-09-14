import React from 'react';
import WorkflowStep from './WorkflowStep';

const stepsData = [
  {
    badge: 'PASO 01',
    badgeColor: '#10b981', // green
    badgeLabelKey: 'home.step1Badge',
    titleKey: 'home.step1Title',
    descKey: 'home.step1Desc',
  },
  {
    badge: 'PASO 02',
    badgeColor: '#10b981', // green
    badgeLabelKey: 'home.step2Badge',
    titleKey: 'home.step2Title',
    descKey: 'home.step2Desc',
  },
  {
    badge: 'PASO 03',
    badgeColor: '#8b5cf6', // purple
    badgeLabelKey: 'home.step3Badge',
    titleKey: 'home.step3Title',
    descKey: 'home.step3Desc',
  },
];

const WorkflowSection = ({ isLight, t, accentColor, borderColor, textPrimary, textMuted, surfaceBg, headerBg, subBorderColor }) => (
  <section
    style={{
      backgroundColor: headerBg,
      border: `1px solid ${subBorderColor}`,
      borderRadius: '16px',
      padding: '1.75rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
    }}
  >
    <div>
      <h2
        style={{
          fontSize: '1.25rem',
          fontWeight: '800',
          margin: '0 0 0.25rem 0',
          color: textPrimary,
        }}
      >
        {t('home.workflowTitle', '¿Cómo iniciar una simulación?')}
      </h2>
      <p style={{ fontSize: '0.88rem', color: textMuted, margin: 0 }}>
        {t('home.workflowSubtitle', 'Pasos recomendados para comenzar a operar la Mesa de Presidencia.')}
      </p>
    </div>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1rem',
      }}
    >
      {stepsData.map((step, idx) => (
        <WorkflowStep
          key={idx}
          step={step}
          t={t}
          textMuted={textMuted}
          textPrimary={textPrimary}
          surfaceBg={surfaceBg}
          borderColor={borderColor}
        />
      ))}
    </div>
  </section>
);

export default WorkflowSection;
