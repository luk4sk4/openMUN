import React, { useEffect } from 'react';
import { ShieldCheck, ArrowLeft, Cookie, HardDrive, Cpu, Cloud, Lock, CheckCircle2, Mail, BarChart3, UserCheck, Database } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import OpenMunLogo from '../common/OpenMunLogo';

export default function PrivacyPolicyPage({ isLight = false, onBack }) {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t('privacy.pageTitle', 'OpenMUN - Política de Privacidad');
    window.scrollTo(0, 0);
  }, [t]);

  // Color Tokens
  const pageBg = isLight ? '#f8fafc' : '#090d16';
  const textPrimary = isLight ? '#0f172a' : '#f8fafc';
  const textMuted = isLight ? '#475569' : '#94a3b8';
  const cardBg = isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(22, 27, 38, 0.85)';
  const cardBorder = isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)';
  const innerCardBg = isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.04)';
  const headerBg = isLight ? 'rgba(255, 255, 255, 0.85)' : 'rgba(15, 23, 42, 0.85)';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: pageBg, color: textPrimary, fontFamily: 'Inter, system-ui, -apple-system, sans-serif', position: 'relative', overflowX: 'hidden' }}>
      {/* Background ambient lighting */}
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '1200px', height: '350px', background: 'radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none', borderRadius: '50%' }} />

      {/* Header Bar */}
      <header style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: headerBg, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: `1px solid ${cardBorder}` }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <OpenMunLogo className="h-8 text-blue-500" style={{ height: '32px' }} />
            <span style={{ fontWeight: '800', fontSize: '1.2rem', letterSpacing: '-0.02em' }}>OpenMUN</span>
          </div>

          <button
            onClick={onBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1.1rem',
              borderRadius: '10px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontWeight: '600',
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            <ArrowLeft size={16} />
            <span>{t('common.backToApp', 'Volver a la App')}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '850px', margin: '0 auto', padding: '2.5rem 1.25rem 4rem 1.25rem', position: 'relative', zIndex: 10 }}>
        {/* Title Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.85rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', marginBottom: '1rem' }}>
            <ShieldCheck size={14} />
            <span>{t('privacy.badge', 'Compromiso Total con la Privacidad')}</span>
          </div>

          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-0.03em', marginBottom: '0.75rem', background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #93c5fd 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {t('privacy.title', 'Política de Privacidad')}
          </h1>

          <p style={{ fontSize: '1.05rem', lineHeight: '1.6', color: textMuted, maxWidth: '700px', margin: '0 auto' }}>
            {t(
              'privacy.subtitle',
              'OpenMUN ha sido diseñado desde su origen bajo el principio de Privacidad por Diseño y por Defecto. Nuestro compromiso es la transparencia absoluta y el tratamiento mínimo de datos imprescindible para el funcionamiento de la plataforma.'
            )}
          </p>
        </div>

        {/* PROMINENT ZERO COOKIES CARD */}
        <div
          style={{
            marginBottom: '2.5rem',
            padding: '2rem',
            borderRadius: '20px',
            background: isLight
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(14, 165, 233, 0.08) 100%)'
              : 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(15, 23, 42, 0.9) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div
              style={{
                padding: '1rem',
                borderRadius: '16px',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Cookie size={36} />
            </div>

            <div style={{ flex: 1, minWidth: '260px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontWeight: '800', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                <CheckCircle2 size={16} />
                <span>{t('privacy.noCookiesTitle', 'Garantía Libre de Cookies Publicitarias y de Rastreo')}</span>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.5rem 0', color: textPrimary }}>
                {t('privacy.noCookiesHeading', 'NO Utilizamos Cookies Publicitarias ni de Rastreo')}
              </h2>
              <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: isLight ? '#334155' : '#cbd5e1', margin: 0 }}>
                {t(
                  'privacy.noCookiesDescription',
                  'En OpenMUN NO utilizamos cookies de seguimiento, ni cookies de terceros, ni píxeles publicitarios. No creamos perfiles de usuario ni comercializamos tu información bajo ninguna circunstancia.'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Section 1: Almacenamiento y Tratamiento de Datos */}
          <div style={{ padding: '1.75rem', borderRadius: '16px', backgroundColor: cardBg, border: `1px solid ${cardBorder}`, backdropFilter: 'blur(12px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div style={{ padding: '0.6rem', borderRadius: '12px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                <HardDrive size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: textPrimary }}>
                {t('privacy.sec1Title', '1. Almacenamiento y Tratamiento de Datos')}
              </h3>
            </div>
            <p style={{ fontSize: '0.92rem', lineHeight: '1.6', color: textMuted, margin: '0 0 1rem 0' }}>
              {t('privacy.sec1Intro', 'OpenMUN funciona mediante dos modalidades según la función que utilices:')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: innerCardBg, border: `1px solid ${cardBorder}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <HardDrive size={16} style={{ color: '#3b82f6' }} />
                  <strong style={{ fontSize: '0.92rem', color: textPrimary }}>
                    {t('privacy.sec1LocalTitle', 'Sesiones Locales (Comité Individual):')}
                  </strong>
                </div>
                <p style={{ fontSize: '0.88rem', lineHeight: '1.55', color: textMuted, margin: 0 }}>
                  {t('privacy.sec1LocalDesc', 'Si gestionas un comité estándar sin sincronización central, los datos (nombres de comités, listas de delegados, mociones, cronómetros y preferencias de interfaz) se almacenan exclusivamente de forma local en tu navegador mediante LocalStorage. Estos datos nunca se envían a nuestros servidores y puedes eliminarlos limpiando el almacenamiento de tu navegador.')}
                </p>
              </div>

              <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: innerCardBg, border: `1px solid ${cardBorder}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <Database size={16} style={{ color: '#6366f1' }} />
                  <strong style={{ fontSize: '0.92rem', color: textPrimary }}>
                    {t('privacy.sec1ConfTitle', 'Conferencias Multi-Comité Sincronizadas:')}
                  </strong>
                </div>
                <p style={{ fontSize: '0.88rem', lineHeight: '1.55', color: textMuted, margin: 0 }}>
                  {t('privacy.sec1ConfDesc', 'Si creas o gestionas una conferencia sincronizada con múltiples comités, la estructura de la conferencia, los estados de los debates y las listas de participantes se procesan y almacenan en una base de datos segura en nuestro servidor para permitir la sincronización en tiempo real y la persistencia de las salas activas.')}
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Tratamiento de Correo Electrónico */}
          <div style={{ padding: '1.75rem', borderRadius: '16px', backgroundColor: cardBg, border: `1px solid ${cardBorder}`, backdropFilter: 'blur(12px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div style={{ padding: '0.6rem', borderRadius: '12px', backgroundColor: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', border: '1px solid rgba(236, 72, 153, 0.25)' }}>
                <Mail size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: textPrimary }}>
                {t('privacy.sec2Title', '2. Tratamiento de Correo Electrónico (Copia de Respaldo)')}
              </h3>
            </div>
            <p style={{ fontSize: '0.92rem', lineHeight: '1.6', color: textMuted, margin: '0 0 1rem 0' }}>
              {t('privacy.sec2Intro', 'Si decides voluntariamente proporcionar tu dirección de correo electrónico para recibir el archivo de respaldo de tu conferencia:')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: textMuted, lineHeight: '1.55' }}>
                <CheckCircle2 size={16} style={{ color: '#ec4899', marginTop: '3px', flexShrink: 0 }} />
                <span><strong style={{ color: textPrimary }}>Finalidad:</strong> {t('privacy.sec2Finalidad', 'Utilizaremos tu email únicamente para remitirte el archivo exportado de tu conferencia o comité.')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: textMuted, lineHeight: '1.55' }}>
                <CheckCircle2 size={16} style={{ color: '#ec4899', marginTop: '3px', flexShrink: 0 }} />
                <span><strong style={{ color: textPrimary }}>Base jurídica:</strong> {t('privacy.sec2BaseJuridica', 'El consentimiento explícito al solicitar el envío de dicho archivo.')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: textMuted, lineHeight: '1.55' }}>
                <CheckCircle2 size={16} style={{ color: '#ec4899', marginTop: '3px', flexShrink: 0 }} />
                <span><strong style={{ color: textPrimary }}>Conservación:</strong> {t('privacy.sec2Conservacion', 'Tu dirección de correo se utiliza de forma transitoria para procesar el envío y no se emplea para fines comerciales, boletines (newsletters) ni cesión a terceros.')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: textMuted, lineHeight: '1.55' }}>
                <CheckCircle2 size={16} style={{ color: '#ec4899', marginTop: '3px', flexShrink: 0 }} />
                <span><strong style={{ color: textPrimary }}>Terceros proveedores:</strong> {t('privacy.sec2Terceros', 'Para la entrega del correo electrónico podemos apoyarnos en servicios de infraestructura de correo transaccional que cumplen con las normativas europeas de protección de datos.')}</span>
              </div>
            </div>
          </div>

          {/* Section 3: WebSockets */}
          <div style={{ padding: '1.75rem', borderRadius: '16px', backgroundColor: cardBg, border: `1px solid ${cardBorder}`, backdropFilter: 'blur(12px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div style={{ padding: '0.6rem', borderRadius: '12px', backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                <Cpu size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: textPrimary }}>
                {t('privacy.sec3Title', '3. Conexiones en Tiempo Real (WebSockets Seguros)')}
              </h3>
            </div>
            <p style={{ fontSize: '0.92rem', lineHeight: '1.6', color: textMuted, margin: 0 }}>
              {t(
                'privacy.sec3Desc',
                'Las funciones de sincronización en vivo (como el modo Delegado, Secretaría o Backroom) utilizan WebSockets seguros (wss://). La comunicación de eventos de debate se transmite de forma cifrada en tránsito entre los clientes conectados y el servidor de sincronización.'
              )}
            </p>
          </div>

          {/* Section 4: Google Drive */}
          <div style={{ padding: '1.75rem', borderRadius: '16px', backgroundColor: cardBg, border: `1px solid ${cardBorder}`, backdropFilter: 'blur(12px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div style={{ padding: '0.6rem', borderRadius: '12px', backgroundColor: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9', border: '1px solid rgba(14, 165, 233, 0.25)' }}>
                <Cloud size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: textPrimary }}>
                {t('privacy.sec4Title', '4. Sincronización Opcional con Google Drive')}
              </h3>
            </div>
            <p style={{ fontSize: '0.92rem', lineHeight: '1.6', color: textMuted, margin: 0 }}>
              {t(
                'privacy.sec4Desc',
                'Si decides vincular voluntariamente tu cuenta de Google Drive para realizar copias de seguridad personales, el token de autorización se almacena de forma segura en tu navegador. Las copias se transfieren de forma directa entre tu navegador y tu almacenamiento en la nube de Google, sin intermediación de nuestros servidores.'
              )}
            </p>
          </div>

          {/* Section 5: Cloudflare Web Analytics */}
          <div style={{ padding: '1.75rem', borderRadius: '16px', backgroundColor: cardBg, border: `1px solid ${cardBorder}`, backdropFilter: 'blur(12px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div style={{ padding: '0.6rem', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                <BarChart3 size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: textPrimary }}>
                {t('privacy.sec5Title', '5. Métricas y Rendimiento (Cloudflare Web Analytics)')}
              </h3>
            </div>
            <p style={{ fontSize: '0.92rem', lineHeight: '1.6', color: textMuted, margin: 0 }}>
              {t(
                'privacy.sec5Desc',
                'Utilizamos Cloudflare Web Analytics con el único fin de monitorizar el rendimiento técnico y el volumen de tráfico general de la plataforma. Esta herramienta no utiliza cookies, no almacena identificadores persistentes ni rastrea tu navegación individual entre diferentes sitios web.'
              )}
            </p>
          </div>

          {/* Section 6: Tus Derechos */}
          <div style={{ padding: '1.75rem', borderRadius: '16px', backgroundColor: cardBg, border: `1px solid ${cardBorder}`, backdropFilter: 'blur(12px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div style={{ padding: '0.6rem', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                <UserCheck size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: textPrimary }}>
                {t('privacy.sec6Title', '6. Tus Derechos (RGPD / Normativa de Protección de Datos)')}
              </h3>
            </div>
            <p style={{ fontSize: '0.92rem', lineHeight: '1.6', color: textMuted, margin: 0 }}>
              {t(
                'privacy.sec6Desc',
                'Tienes derecho a acceder, rectificar, limitar o solicitar la supresión de los datos que conserves en nuestros servidores (incluida la eliminación de conferencias o el registro de correo). Para ejercer estos derechos, ponte en contacto en contacto@openmun.app.'
              )}
            </p>
          </div>

          {/* Section 7: Código Abierto y Transparencia */}
          <div style={{ padding: '1.75rem', borderRadius: '16px', backgroundColor: cardBg, border: `1px solid ${cardBorder}`, backdropFilter: 'blur(12px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div style={{ padding: '0.6rem', borderRadius: '12px', backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
                <Lock size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: textPrimary }}>
                {t('privacy.sec7Title', '7. Código Abierto y Transparencia')}
              </h3>
            </div>
            <p style={{ fontSize: '0.92rem', lineHeight: '1.6', color: textMuted, margin: 0 }}>
              {t(
                'privacy.sec7Desc',
                'OpenMUN es un proyecto de Software Libre e independiente. Cualquiera puede auditar el código fuente público en nuestro repositorio de GitHub para verificar el funcionamiento técnico y el respeto estricto a la privacidad.'
              )}
            </p>
          </div>

          {/* Section 8: Contacto */}
          <div style={{ padding: '1.75rem', borderRadius: '16px', backgroundColor: cardBg, border: `1px solid ${cardBorder}`, backdropFilter: 'blur(12px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div style={{ padding: '0.6rem', borderRadius: '12px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                <Mail size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: textPrimary }}>
                {t('privacy.sec8Title', '8. Contacto')}
              </h3>
            </div>
            <p style={{ fontSize: '0.92rem', lineHeight: '1.6', color: textMuted, margin: 0 }}>
              {t(
                'privacy.sec8Desc',
                'Si tienes dudas sobre esta política o sobre la gestión técnica de los datos, contáctanos en contacto@openmun.app.'
              )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '3.5rem', textAlign: 'center', fontSize: '0.85rem', color: textMuted }}>
          <p style={{ margin: '0 0 0.75rem 0' }}>Última actualización: Agosto {new Date().getFullYear()} — OpenMUN</p>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', textDecoration: 'underline' }}
          >
            ← Volver al panel principal de OpenMUN
          </button>
        </div>
      </main>
    </div>
  );
}
