import React from 'react';

const WorkflowStep = ({ step, t, textMuted, textPrimary, surfaceBg, borderColor }) => (
  <div
    style={{
      backgroundColor: surfaceBg,
      border: `1px solid ${borderColor}`,
      borderRadius: '10px',
      padding: '1.15rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '0.8rem', fontWeight: '800', color: step.badgeColor, fontFamily: 'monospace' }}>
        {step.badge}
      </span>
      <span style={{ fontSize: '0.72rem', color: textMuted, fontWeight: '600' }}>
        {t(step.badgeLabelKey, step.badgeLabelKey)}
      </span>
    </div>
    <h4 style={{ fontSize: '0.95rem', fontWeight: '700', margin: 0, color: textPrimary }}>
      {t(step.titleKey, step.titleKey)}
    </h4>
    <p style={{ fontSize: '0.84rem', color: textMuted, margin: 0, lineHeight: '1.45' }}>
      {t(step.descKey, step.descKey)}
    </p>
  </div>
);

export default WorkflowStep;
