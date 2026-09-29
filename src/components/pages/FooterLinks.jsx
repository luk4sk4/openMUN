import React from 'react';

const FooterLinks = ({ navigateTo, accentColor, textPrimary }) => (
  <>
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <a
        href="/privacy"
        onClick={(e) => {
          e.preventDefault();
          navigateTo('/privacy');
        }}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          color: accentColor,
          cursor: 'pointer',
          fontSize: '0.82rem',
          fontWeight: '600',
          textDecoration: 'underline',
        }}
      >
        {/* i18n key placeholder */}Privacy Policy
      </a>
      <span>•</span>
      <a
        href="/terms"
        onClick={(e) => {
          e.preventDefault();
          navigateTo('/terms');
        }}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          color: accentColor,
          cursor: 'pointer',
          fontSize: '0.82rem',
          fontWeight: '600',
          textDecoration: 'underline',
        }}
      >
        {/* i18n key placeholder */}Terms &amp; Conditions
      </a>
      <span>•</span>
      <span style={{ color: '#10b981', fontWeight: '700', fontSize: '0.8rem' }}>
        🍪 0 Cookies / 100% LocalStorage
      </span>
    </div>
  </>
);

export default FooterLinks;
