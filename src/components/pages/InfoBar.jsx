import React from 'react';

const InfoBar = ({ textPrimary, t }) => (
  <div>
    <div>
      OpenMUN © {new Date().getFullYear()} — {t('home.footerDesc', 'Software Libre para Modelos de Naciones Unidas')}
    </div>
    <div>{t('home.footerTagline', 'Por una cultura accesible para todos')}</div>
  </div>
);

export default InfoBar;
