import React, { useEffect } from 'react';
import { ShieldCheck, ArrowLeft, Cookie, HardDrive, Cpu, Cloud, Lock, CheckCircle2, Mail, BarChart3, UserCheck, Database, ExternalLink, ShieldAlert, KeyRound, Ban } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import OpenMunLogo from '../common/OpenMunLogo';
import LanguageSelector from '../common/LanguageSelector';

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
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <OpenMunLogo className="h-8 text-blue-500" style={{ height: '32px' }} />
            <span style={{ fontWeight: '800', fontSize: '1.2rem', letterSpacing: '-0.02em' }}>OpenMUN</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <LanguageSelector isLight={isLight} />
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

          {/* Section 4: Google Drive & Google User Data */}
          <div style={{ padding: '1.75rem', borderRadius: '16px', backgroundColor: cardBg, border: `1px solid ${cardBorder}`, backdropFilter: 'blur(12px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div style={{ padding: '0.6rem', borderRadius: '12px', backgroundColor: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9', border: '1px solid rgba(14, 165, 233, 0.25)' }}>
                <Cloud size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: textPrimary }}>
                  {t('privacy.sec4Title', '4. Sincronización Opcional con Google Drive y Uso de Datos de Google')}
                </h3>
              </div>
            </div>
            <p style={{ fontSize: '0.92rem', lineHeight: '1.6', color: textMuted, margin: '0 0 1.25rem 0' }}>
              {t(
                'privacy.sec4Desc',
                'OpenMUN ofrece una integración opcional con Google Drive para permitir a los usuarios guardar y sincronizar copias de seguridad de sus comités sin tener que transferir archivos manualmente entre dispositivos.'
              )}
            </p>

            {/* Subsections Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* 4.1 Permisos / Scopes */}
              <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: innerCardBg, border: `1px solid ${cardBorder}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <KeyRound size={16} style={{ color: '#0ea5e9' }} />
                  <strong style={{ fontSize: '0.92rem', color: textPrimary }}>
                    {t('privacy.sec4ScopeTitle', '4.1 Permisos Solicitados (OAuth Scopes)')}
                  </strong>
                </div>
                <p style={{ fontSize: '0.88rem', lineHeight: '1.55', color: textMuted, margin: 0 }}>
                  {t('privacy.sec4ScopeDesc', 'Solicitamos el alcance https://www.googleapis.com/auth/drive estrictamente necesario para crear, leer y actualizar los archivos de sesión (.json) y la carpeta de trabajo "openMUN" en el Google Drive personal del usuario.')}
                </p>
              </div>

              {/* 4.2 Datos accedidos */}
              <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: innerCardBg, border: `1px solid ${cardBorder}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <Database size={16} style={{ color: '#3b82f6' }} />
                  <strong style={{ fontSize: '0.92rem', color: textPrimary }}>
                    {t('privacy.sec4DataTitle', '4.2 Datos Accedidos y Recopilados')}
                  </strong>
                </div>
                <p style={{ fontSize: '0.88rem', lineHeight: '1.55', color: textMuted, margin: 0 }}>
                  {t('privacy.sec4DataDesc', 'OpenMUN accede única y exclusivamente a los archivos de configuración y respaldo generados por la propia aplicación (archivos de formato JSON con agendas, listas de países, mociones, notas y cronómetros) y a la información básica de perfil (nombre y dirección de correo electrónico) proporcionada por Google Identity Services únicamente para indicar en la interfaz qué cuenta está conectada.')}
                </p>
              </div>

              {/* 4.3 Finalidad */}
              <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: innerCardBg, border: `1px solid ${cardBorder}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                  <strong style={{ fontSize: '0.92rem', color: textPrimary }}>
                    {t('privacy.sec4PurposeTitle', '4.3 Finalidad del Tratamiento de Datos de Google')}
                  </strong>
                </div>
                <p style={{ fontSize: '0.88rem', lineHeight: '1.55', color: textMuted, margin: 0 }}>
                  {t('privacy.sec4PurposeDesc', 'La finalidad exclusiva de acceder a los datos de Google es prestar el servicio solicitado por el usuario: guardar, respaldar, restaurar y sincronizar configuraciones de sesiones de debate MUN. OpenMUN no utiliza los datos de Google para ninguna otra finalidad secundaria.')}
                </p>
              </div>

              {/* 4.4 Seguridad y Client-Side */}
              <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: innerCardBg, border: `1px solid ${cardBorder}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <Lock size={16} style={{ color: '#8b5cf6' }} />
                  <strong style={{ fontSize: '0.92rem', color: textPrimary }}>
                    {t('privacy.sec4SecurityTitle', '4.4 Arquitectura del Lado del Cliente y Seguridad')}
                  </strong>
                </div>
                <p style={{ fontSize: '0.88rem', lineHeight: '1.55', color: textMuted, margin: 0 }}>
                  {t('privacy.sec4SecurityDesc', 'OpenMUN funciona íntegramente del lado del cliente (en el navegador web del usuario). El token de acceso OAuth se mantiene únicamente en la memoria de sesión del navegador (sessionStorage) y se comunica directamente mediante conexiones seguras cifradas (HTTPS/TLS) con las APIs oficiales de Google. En ningún momento tus credenciales, tokens ni archivos de Google Drive son enviados, registrados ni almacenados en servidores de OpenMUN ni en bases de datos externas.')}
                </p>
              </div>

              {/* 4.5 No venta, no publicidad, no IA */}
              <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: innerCardBg, border: `1px solid ${cardBorder}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <Ban size={16} style={{ color: '#ef4444' }} />
                  <strong style={{ fontSize: '0.92rem', color: textPrimary }}>
                    {t('privacy.sec4SharingTitle', '4.5 Prohibición de Venta, Publicidad y Entrenamiento de IA')}
                  </strong>
                </div>
                <p style={{ fontSize: '0.88rem', lineHeight: '1.55', color: textMuted, margin: 0 }}>
                  {t('privacy.sec4SharingDesc', 'OpenMUN NO comercializa, no vende, no transfiere ni cede datos de usuarios de Google a terceros, intermediarios de datos ni empresas de publicidad bajo ninguna circunstancia. Los datos de Google nunca se utilizan para mostrar anuncios personalizados, elaborar perfiles de usuario, evaluar solvencia ni para entrenar, optimizar o desarrollar modelos generalizados de Inteligencia Artificial (IA) o Aprendizaje Automático (Machine Learning).')}
                </p>
              </div>

              {/* 4.6 Conservación, eliminación y revocación */}
              <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: innerCardBg, border: `1px solid ${cardBorder}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <UserCheck size={16} style={{ color: '#f59e0b' }} />
                  <strong style={{ fontSize: '0.92rem', color: textPrimary }}>
                    {t('privacy.sec4RetentionTitle', '4.6 Conservación, Eliminación y Revocación de Permisos')}
                  </strong>
                </div>
                <p style={{ fontSize: '0.88rem', lineHeight: '1.55', color: textMuted, margin: 0 }}>
                  {t('privacy.sec4RetentionDesc', 'Los archivos guardados en Google Drive permanecen en el almacenamiento del usuario por el tiempo que este decida conservarlos y pueden ser eliminados en cualquier momento directamente desde Google Drive o desde OpenMUN. El usuario puede desvincular la cuenta en cualquier momento pulsando el botón "Desconectar" en el menú de sesión de la app (lo que borra inmediatamente el token local). Asimismo, el acceso puede revocarse en cualquier instante desde los ajustes de seguridad de Google en https://myaccount.google.com/permissions.')}
                </p>
              </div>

              {/* 4.7 Prominent Google Limited Use Disclosure Box */}
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: '14px',
                  background: isLight ? 'rgba(37, 99, 235, 0.08)' : 'rgba(37, 99, 235, 0.15)',
                  border: '1.5px solid rgba(59, 130, 246, 0.4)',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.1)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <ShieldCheck size={20} style={{ color: '#3b82f6', flexShrink: 0 }} />
                  <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '800', color: textPrimary }}>
                    {t('privacy.sec4LimitedUseTitle', '4.7 Declaración de Cumplimiento de la Política de Datos de Usuario de Google (Uso Limitado)')}
                  </h4>
                </div>
                <blockquote style={{ margin: '0 0 0.85rem 0', padding: '0.75rem 1rem', borderLeft: '3px solid #3b82f6', backgroundColor: isLight ? 'rgba(255,255,255,0.7)' : 'rgba(15, 23, 42, 0.6)', borderRadius: '0 8px 8px 0', fontSize: '0.9rem', lineHeight: '1.6', fontStyle: 'italic', color: textPrimary }}>
                  "{t('privacy.sec4LimitedUseDesc', 'El uso y la transferencia por parte de OpenMUN a cualquier otra aplicación de la información recibida de las API de Google cumplirán con la Política de datos de usuario de los servicios de las API de Google, incluidos los requisitos de uso limitado.')}"
                </blockquote>
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: '#3b82f6',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                >
                  <span>{t('privacy.sec4LimitedUseLinkText', 'Consultar la Política de Datos de Usuario de las API de Google')}</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
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
