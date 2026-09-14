import React, { useEffect } from 'react';
import { FileText, ArrowLeft, Scale, Award, Heart, CheckCircle2, ShieldAlert, Mail, AlertTriangle, RefreshCw, Database, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import OpenMunLogo from '../common/OpenMunLogo';

export default function TermsConditionsPage({ isLight = false, onBack }) {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t('terms.pageTitle', 'OpenMUN - Términos y Condiciones de Uso');
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
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '1200px', height: '350px', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none', borderRadius: '50%' }} />

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
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.85rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', marginBottom: '1rem' }}>
            <Scale size={14} />
            <span>{t('terms.badge', 'Condiciones de Uso y Licencia Libre')}</span>
          </div>

          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-0.03em', marginBottom: '0.75rem', background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #93c5fd 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {t('terms.title', 'Términos y Condiciones de Uso')}
          </h1>

          <p style={{ fontSize: '1.05rem', lineHeight: '1.6', color: textMuted, maxWidth: '700px', margin: '0 auto' }}>
            {t(
              'terms.subtitle',
              'Bienvenido a OpenMUN, una plataforma web libre y gratuita diseñada para optimizar la gestión y el debate en Modelos de Naciones Unidas.'
            )}
          </p>
        </div>

        {/* Detailed Terms Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Section 1: Carácter Gratuito y Educativo */}
          <div style={{ padding: '1.75rem', borderRadius: '16px', backgroundColor: cardBg, border: `1px solid ${cardBorder}`, backdropFilter: 'blur(12px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div style={{ padding: '0.6rem', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                <Heart size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: textPrimary }}>
                {t('terms.sec1Title', '1. Carácter Gratuito y Educativo')}
              </h3>
            </div>
            <p style={{ fontSize: '0.92rem', lineHeight: '1.6', color: textMuted, margin: 0 }}>
              {t(
                'terms.sec1Desc',
                'OpenMUN se ofrece libremente y sin coste para conferencias, instituciones educativas, mesas presidenciales y delegados. Su objetivo principal es enriquecer la cultura académica, el debate constructivo y la diplomacia escolar y universitaria.'
              )}
            </p>
          </div>

          {/* Section 2: Propiedad Intelectual y Licencia Libre */}
          <div style={{ padding: '1.75rem', borderRadius: '16px', backgroundColor: cardBg, border: `1px solid ${cardBorder}`, backdropFilter: 'blur(12px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div style={{ padding: '0.6rem', borderRadius: '12px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                <Award size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: textPrimary }}>
                {t('terms.sec2Title', '2. Propiedad Intelectual y Licencia Libre')}
              </h3>
            </div>
            <p style={{ fontSize: '0.92rem', lineHeight: '1.6', color: textMuted, margin: 0 }}>
              {t(
                'terms.sec2Desc',
                'OpenMUN es un proyecto desarrollado originalmente por Lucas R. Kowalski y distribuido como Software Libre. Tienes total libertad para utilizarlo, modificarlo y compartirlo, siempre bajo el respeto a los derechos morales de autoría y los términos de la licencia de código abierto disponible en su repositorio oficial en GitHub.'
              )}
            </p>
          </div>

          {/* Section 3: Gestión de Datos, Sincronización y Copias de Seguridad */}
          <div style={{ padding: '1.75rem', borderRadius: '16px', backgroundColor: cardBg, border: `1px solid ${cardBorder}`, backdropFilter: 'blur(12px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div style={{ padding: '0.6rem', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                <FileText size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: textPrimary }}>
                {t('terms.sec3Title', '3. Gestión de Datos, Sincronización y Copias de Seguridad')}
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.5rem' }}>
              <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: innerCardBg, border: `1px solid ${cardBorder}` }}>
                <strong style={{ display: 'block', fontSize: '0.92rem', color: textPrimary, marginBottom: '0.35rem' }}>
                  {t('terms.sec3LocalTitle', 'Sesiones Locales:')}
                </strong>
                <p style={{ fontSize: '0.88rem', lineHeight: '1.55', color: textMuted, margin: 0 }}>
                  {t('terms.sec3LocalDesc', 'El usuario es el único responsable de la custodia de los datos alojados en LocalStorage o en su cuenta personal de Google Drive. La limpieza de caché o datos del navegador eliminará las sesiones no exportadas previamente.')}
                </p>
              </div>

              <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: innerCardBg, border: `1px solid ${cardBorder}` }}>
                <strong style={{ display: 'block', fontSize: '0.92rem', color: textPrimary, marginBottom: '0.35rem' }}>
                  {t('terms.sec3ConfTitle', 'Conferencias en Servidor:')}
                </strong>
                <p style={{ fontSize: '0.88rem', lineHeight: '1.55', color: textMuted, margin: 0 }}>
                  {t('terms.sec3ConfDesc', 'En las conferencias sincronizadas a través del servidor, OpenMUN facilita la concurrencia entre comités y proporciona mecanismos de exportación (incluido el envío del archivo por correo electrónico). No obstante, OpenMUN es una herramienta de soporte al debate en vivo y no constituye un servicio de almacenamiento en la nube indefinido, por lo que se recomienda exportar el archivo de la sesión (.json) al término de cada jornada o debate.')}
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Uso Aceptable */}
          <div style={{ padding: '1.75rem', borderRadius: '16px', backgroundColor: cardBg, border: `1px solid ${cardBorder}`, backdropFilter: 'blur(12px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div style={{ padding: '0.6rem', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                <ShieldAlert size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: textPrimary }}>
                {t('terms.sec4Title', '4. Uso Aceptable')}
              </h3>
            </div>
            <p style={{ fontSize: '0.92rem', lineHeight: '1.6', color: textMuted, margin: 0 }}>
              {t(
                'terms.sec4Desc',
                'El usuario se compromete a no utilizar la infraestructura del servidor, los WebSockets ni la base de datos de conferencias para realizar ataques de denegación de servicio, saturación no autorizada, inyección de código malicioso o cualquier actividad contraria a la ley o que perjudique la disponibilidad del servicio para otros comités.'
              )}
            </p>
          </div>

          {/* Section 5: Exención de Garantías y Responsabilidad */}
          <div style={{ padding: '1.75rem', borderRadius: '16px', backgroundColor: cardBg, border: `1px solid ${cardBorder}`, backdropFilter: 'blur(12px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div style={{ padding: '0.6rem', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                <AlertTriangle size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: textPrimary }}>
                {t('terms.sec5Title', '5. Exención de Garantías y Responsabilidad')}
              </h3>
            </div>
            <p style={{ fontSize: '0.92rem', lineHeight: '1.6', color: textMuted, margin: 0 }}>
              {t(
                'terms.sec5Desc',
                'El software se entrega «tal cual» (AS IS), sin garantías de ningún tipo respecto a disponibilidad ininterrumpida, ausencia de errores o idoneidad para un fin determinado. OpenMUN no será responsable de posibles pérdidas de datos derivadas de fallos de red local, problemas de conectividad de los usuarios o interrupciones de infraestructura de terceros.'
              )}
            </p>
          </div>

          {/* Section 6: Modificaciones de los Términos */}
          <div style={{ padding: '1.75rem', borderRadius: '16px', backgroundColor: cardBg, border: `1px solid ${cardBorder}`, backdropFilter: 'blur(12px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div style={{ padding: '0.6rem', borderRadius: '12px', backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                <RefreshCw size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: textPrimary }}>
                {t('terms.sec6Title', '6. Modificaciones de los Términos')}
              </h3>
            </div>
            <p style={{ fontSize: '0.92rem', lineHeight: '1.6', color: textMuted, margin: 0 }}>
              {t(
                'terms.sec6Desc',
                'Nos reservamos el derecho de actualizar estos términos para reflejar mejoras técnicas o cambios normativos. La versión vigente estará siempre accesible públicamente en la plataforma.'
              )}
            </p>
          </div>

          {/* Section 7: Contacto */}
          <div style={{ padding: '1.75rem', borderRadius: '16px', backgroundColor: cardBg, border: `1px solid ${cardBorder}`, backdropFilter: 'blur(12px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div style={{ padding: '0.6rem', borderRadius: '12px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                <Mail size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: textPrimary }}>
                {t('terms.sec7Title', '7. Contacto')}
              </h3>
            </div>
            <p style={{ fontSize: '0.92rem', lineHeight: '1.6', color: textMuted, margin: 0 }}>
              {t(
                'terms.sec7Desc',
                'Para resolver dudas o realizar consultas relacionadas con estas condiciones, puedes escribir a contacto@openmun.app.'
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
