import i18n from '../languages/index.js';
import { getSupabaseClient } from './supabaseClient';

const STORAGE_ACCOUNT_KEY = 'openmun_cloud_account';

/**
 * Convierte "MUN Madrid 2026!" en "mun-madrid-2026@internal.app"
 */
export const formatEmail = (conferenceName) => {
  const clean = (conferenceName || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita tildes
    .replace(/[^a-z0-9]/g, '-')     // reemplaza caracteres especiales por guiones
    .replace(/-+/g, '-')             // colapsa guiones repetidos
    .replace(/^-|-$/g, '');          // recorta guiones en bordes
  return `${clean || 'conferencia'}@internal.app`;
};

/**
 * Genera el hash criptográfico SHA-256 de una contraseña en el cliente
 */
export const hashPassword = async (password) => {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback si crypto.subtle no está disponible
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
};

/**
 * Guarda la cuenta activa localmente
 */
export const guardarCuentaLocal = (account) => {
  if (typeof window !== 'undefined') {
    if (account) {
      localStorage.setItem(STORAGE_ACCOUNT_KEY, JSON.stringify(account));
    } else {
      localStorage.removeItem(STORAGE_ACCOUNT_KEY);
    }
  }
};

/**
 * Recupera la cuenta activa guardada
 */
export const obtenerCuentaActiva = () => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_ACCOUNT_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }
  return null;
};

/**
 * Formatea errores de Supabase y traduce errores de red o autenticación a mensajes claros
 */
export const formatSupabaseError = (err) => {
  if (!err) return i18n.t('ui.unknownErrorConnectingToSupabase');
  const str = String(err?.message || err?.error_description || err?.msg || err || '');
  const code = String(err?.code || err?.error_code || '');

  if (
    code === 'user_already_exists' ||
    str.toLowerCase().includes('user already registered') ||
    str.toLowerCase().includes('already exists') ||
    str.toLowerCase().includes('already registered') ||
    code === '23505'
  ) {
    return i18n.t('ui.aConferenceWithThisNameIsAlreadyRegistered');
  }

  if (
    code === 'invalid_credentials' ||
    str.toLowerCase().includes('invalid login credentials') ||
    str.toLowerCase().includes('invalid credentials')
  ) {
    return 'Nombre de conferencia o contraseña incorrectos.';
  }

  if (
    str.toLowerCase().includes('content security policy') ||
    str.toLowerCase().includes('violates the document\'s content security policy') ||
    str.toLowerCase().includes('csp')
  ) {
    return i18n.t('ui.theSiteContentSecurityPolicyCspBlocksTheConnectionTo');
  }

  if (
    str.toLowerCase().includes('networkerror') ||
    str.toLowerCase().includes('failed to fetch') ||
    str.toLowerCase().includes('fetch failed')
  ) {
    return i18n.t('ui.networkErrorConnectingToSupabaseCheckYourConnectionAndWhether');
  }

  return str;
};

/**
 * 1. Crear nueva conferencia / cuenta
 * Soporta tanto Supabase Auth (conferences) como tabla manual (accounts)
 */
export async function registrarConferencia(nombre, password) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(i18n.t('ui.supabaseIsNotConfiguredPleaseEnterTheSupabaseAnonKey'));
  }

  const cleanName = (nombre || '').trim();
  if (!cleanName) throw new Error(i18n.t('ui.conferenceNameIsRequired'));
  if (!password || password.length < 4) throw new Error(i18n.t('ui.passwordMustContainAtLeast4Characters'));

  const email = formatEmail(cleanName);

  // 1. Registrar usuario en Supabase Auth
  const { data: authData, error: authError } = await client.auth.signUp({
    email,
    password
  });

  if (authError) {
    throw new Error(formatSupabaseError(authError));
  }

  const user = authData?.user;
  if (!user) {
    throw new Error(i18n.t('ui.couldNotCreateTheUserInSupabase'));
  }

  // Si signUp no devolvió sesión automática, iniciar sesión explícitamente para tener token de auth
  if (!authData?.session) {
    try {
      await client.auth.signInWithPassword({ email, password });
    } catch (loginErr) {
      console.warn('[Supabase auto-login tras signUp warning]:', loginErr);
    }
  }

  // 2. Registrar en tabla public.conferences
  const { error: confError } = await client.from('conferences').upsert({
    id: user.id,
    name: cleanName
  });

  if (confError) {
    console.error('[Error al registrar conferencia en tabla conferences]:', confError);
    // Si falla el upsert de conferencias no lanzar error de red confuso
    throw new Error(formatSupabaseError(confError));
  }

  const registeredAccount = {
    id: user.id,
    name: cleanName,
    email,
    mode: 'auth'
  };

  guardarCuentaLocal(registeredAccount);
  return registeredAccount;
}

/**
 * 2. Iniciar sesión en conferencia existente
 */
export async function loginConferencia(nombre, password) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(i18n.t('ui.supabaseIsNotConfiguredPleaseEnterTheSupabaseAnonKey'));
  }

  const cleanName = (nombre || '').trim();
  if (!cleanName) throw new Error(i18n.t('ui.conferenceNameIsRequired'));
  if (!password) throw new Error(i18n.t('ui.enterTheConferencePassword'));

  const email = formatEmail(cleanName);

  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (authError) {
    throw new Error(formatSupabaseError(authError));
  }

  if (!authData?.user) {
    throw new Error(i18n.t('ui.incorrectConferenceNameOrPassword'));
  }

  // Obtener nombre real desde conferences si está disponible
  let visibleName = cleanName;
  try {
    const { data: conf } = await client
      .from('conferences')
      .select('name')
      .eq('id', authData.user.id)
      .single();
    if (conf?.name) visibleName = conf.name;
  } catch {}

  const loggedAccount = {
    id: authData.user.id,
    name: visibleName,
    email,
    mode: 'auth'
  };

  guardarCuentaLocal(loggedAccount);
  return loggedAccount;
}

/**
 * Cerrar sesión
 */
export async function cerrarSesionConferencia() {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.auth.signOut();
    } catch {}
  }
  guardarCuentaLocal(null);
}

/**
 * 3. Guardar o actualizar un comité con su JSON
 */
export async function guardarComite(nombreComite, payloadJSON) {
  const client = getSupabaseClient();
  if (!client) throw new Error(i18n.t('ui.supabaseIsNotConfigured'));

  const account = obtenerCuentaActiva();
  if (!account) throw new Error(i18n.t('ui.noConferenceIsSignedIn'));

  const cleanName = (nombreComite || 'Comité').trim();
  const timestamp = new Date().toISOString();

  const { data, error } = await client
    .from('committees')
    .upsert(
      {
        conference_id: account.id,
        name: cleanName,
        data: payloadJSON,
        updated_at: timestamp
      },
      { onConflict: 'conference_id, name' }
    )
    .select();

  if (error) throw new Error(formatSupabaseError(error));
  return data;
}

/**
 * 4. Obtener la lista de todos los comités guardados para la cuenta
 */
export async function listarComites() {
  const client = getSupabaseClient();
  if (!client) throw new Error(i18n.t('ui.supabaseIsNotConfigured'));

  const account = obtenerCuentaActiva();
  if (!account) throw new Error(i18n.t('ui.noConferenceIsSignedIn'));

  const { data, error } = await client
    .from('committees')
    .select('id, name, updated_at')
    .eq('conference_id', account.id)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(formatSupabaseError(error));
  return data || [];
}

/**
 * 5. Cargar el JSON de un comité específico
 */
export async function cargarComite(comiteId) {
  const client = getSupabaseClient();
  if (!client) throw new Error(i18n.t('ui.supabaseIsNotConfigured'));

  const { data, error } = await client
    .from('committees')
    .select('data')
    .eq('id', comiteId)
    .single();

  if (error) throw new Error(formatSupabaseError(error));
  return data?.data;
}

/**
 * 6. Eliminar un comité de la nube
 */
export async function eliminarComite(comiteId) {
  const client = getSupabaseClient();
  if (!client) throw new Error(i18n.t('ui.supabaseIsNotConfigured'));

  const { error } = await client
    .from('committees')
    .delete()
    .eq('id', comiteId);

  if (error) throw new Error(formatSupabaseError(error));
  return true;
}
