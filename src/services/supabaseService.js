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
  if (!err) return 'Error desconocido al conectar con Supabase';
  const str = String(err?.message || err?.error_description || err || '');
  if (
    str.toLowerCase().includes('networkerror') ||
    str.toLowerCase().includes('failed to fetch') ||
    str.toLowerCase().includes('fetch failed')
  ) {
    return 'Error de red al conectar con Supabase. Tu navegador, un bloqueador de publicidad (uBlock Origin, AdBlock, Brave Shields) o la protección contra rastreo estricta de Firefox pueden estar bloqueando la conexión con Supabase.';
  }
  if (str.toLowerCase().includes('invalid login credentials')) {
    return 'Nombre de conferencia o contraseña incorrectos.';
  }
  if (
    str.toLowerCase().includes('user already registered') ||
    str.toLowerCase().includes('already exists') ||
    err?.code === '23505'
  ) {
    return 'Ya existe una conferencia registrada con este nombre.';
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
    throw new Error('Supabase no está configurado. Por favor ingresa la Anon Key de Supabase.');
  }

  const cleanName = (nombre || '').trim();
  if (!cleanName) throw new Error('El nombre de la conferencia es obligatorio.');
  if (!password || password.length < 4) throw new Error('La contraseña debe tener al menos 4 caracteres.');

  const email = formatEmail(cleanName);
  const passwordHash = await hashPassword(password);

  let registeredAccount = null;

  // Intento 1: Supabase Auth + tabla public.conferences
  try {
    const { data: authData, error: authError } = await client.auth.signUp({
      email,
      password
    });

    if (authError) {
      throw new Error(formatSupabaseError(authError));
    }

    if (authData?.user) {
      // Registrar en public.conferences
      const { error: confError } = await client.from('conferences').upsert({
        id: authData.user.id,
        name: cleanName
      });

      if (!confError) {
        registeredAccount = {
          id: authData.user.id,
          name: cleanName,
          email,
          mode: 'auth'
        };
      } else {
        throw new Error(formatSupabaseError(confError));
      }
    }
  } catch (err) {
    const formatted = formatSupabaseError(err);
    // Si es error de red o usuario ya registrado, propagar de inmediato
    if (
      formatted.includes('Error de red') ||
      formatted.includes('Ya existe una conferencia')
    ) {
      throw new Error(formatted);
    }
    console.warn('[Supabase Auth Register warning, evaluando tabla accounts]:', err);
  }

  // Intento 2: Tabla public.accounts (si Auth falló o se usa esquema directo)
  if (!registeredAccount) {
    const { data: accData, error: accError } = await client
      .from('accounts')
      .insert({
        name: cleanName,
        password_hash: passwordHash
      })
      .select('id, name')
      .single();

    if (accError) {
      if (accError.code === '23505' || accError.message?.includes('duplicate key')) {
        throw new Error('Ya existe una conferencia registrada con este nombre.');
      }
      throw new Error(formatSupabaseError(accError));
    }

    registeredAccount = {
      id: accData.id,
      name: accData.name,
      mode: 'accounts'
    };
  }

  guardarCuentaLocal(registeredAccount);
  return registeredAccount;
}

/**
 * 2. Iniciar sesión en conferencia existente
 */
export async function loginConferencia(nombre, password) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase no está configurado. Por favor ingresa la Anon Key de Supabase.');
  }

  const cleanName = (nombre || '').trim();
  if (!cleanName) throw new Error('El nombre de la conferencia es obligatorio.');
  if (!password) throw new Error('Ingresa la contraseña de la conferencia.');

  const email = formatEmail(cleanName);
  const passwordHash = await hashPassword(password);

  let loggedAccount = null;

  // Intento 1: Supabase Auth
  try {
    const { data: authData, error: authError } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      const formatted = formatSupabaseError(authError);
      // Si es error de red o credenciales inválidas, propagar directamente
      if (formatted.includes('Error de red') || formatted.includes('incorrectos')) {
        throw new Error(formatted);
      }
      throw authError;
    }

    if (authData?.user) {
      // Obtener nombre desde conferences si está disponible
      let visibleName = cleanName;
      try {
        const { data: conf } = await client
          .from('conferences')
          .select('name')
          .eq('id', authData.user.id)
          .single();
        if (conf?.name) visibleName = conf.name;
      } catch {}

      loggedAccount = {
        id: authData.user.id,
        name: visibleName,
        email,
        mode: 'auth'
      };
    }
  } catch (err) {
    const formatted = formatSupabaseError(err);
    if (formatted.includes('Error de red') || formatted.includes('incorrectos')) {
      throw new Error(formatted);
    }
    console.warn('[Supabase Auth Login warning, intentando con tabla accounts]:', err);
  }

  // Intento 2: Tabla public.accounts
  if (!loggedAccount) {
    const { data: accData, error: accError } = await client
      .from('accounts')
      .select('id, name')
      .eq('name', cleanName)
      .eq('password_hash', passwordHash)
      .single();

    if (accError || !accData) {
      if (accError) {
        const formatted = formatSupabaseError(accError);
        if (formatted.includes('Error de red')) {
          throw new Error(formatted);
        }
      }
      throw new Error('Nombre de conferencia o contraseña incorrectos.');
    }

    loggedAccount = {
      id: accData.id,
      name: accData.name,
      mode: 'accounts'
    };
  }

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
  if (!client) throw new Error('Supabase no está configurado.');

  const account = obtenerCuentaActiva();
  if (!account) throw new Error('No hay una conferencia autenticada.');

  const cleanName = (nombreComite || 'Comité').trim();
  const timestamp = new Date().toISOString();

  // Si la cuenta usa modo 'accounts' o tabla 'backups'
  if (account.mode === 'accounts') {
    const { data, error } = await client
      .from('backups')
      .upsert(
        {
          account_id: account.id,
          name: cleanName,
          data: payloadJSON,
          updated_at: timestamp
        },
        { onConflict: 'account_id, name' }
      )
      .select();

    if (error) throw new Error(formatSupabaseError(error));
    return data;
  }

  // Si la cuenta usa modo 'auth' / tabla 'committees'
  try {
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
  } catch (err) {
    // Si la tabla committees no existe o da error, probar con backups
    const { data: backupData, error: backupErr } = await client
      .from('backups')
      .upsert(
        {
          account_id: account.id,
          name: cleanName,
          data: payloadJSON,
          updated_at: timestamp
        },
        { onConflict: 'account_id, name' }
      )
      .select();

    if (backupErr) throw new Error(formatSupabaseError(backupErr));
    return backupData;
  }
}

/**
 * 4. Obtener la lista de todos los comités guardados para la cuenta
 */
export async function listarComites() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase no está configurado.');

  const account = obtenerCuentaActiva();
  if (!account) throw new Error('No hay una conferencia autenticada.');

  if (account.mode === 'accounts') {
    const { data, error } = await client
      .from('backups')
      .select('id, name, updated_at')
      .eq('account_id', account.id)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(formatSupabaseError(error));
    return data || [];
  }

  // Intentar tabla committees
  try {
    const { data, error } = await client
      .from('committees')
      .select('id, name, updated_at')
      .order('updated_at', { ascending: false });

    if (error) throw new Error(formatSupabaseError(error));
    return data || [];
  } catch (err) {
    // Fallback a backups
    const { data: backupData, error: backupErr } = await client
      .from('backups')
      .select('id, name, updated_at')
      .eq('account_id', account.id)
      .order('updated_at', { ascending: false });

    if (backupErr) throw new Error(formatSupabaseError(backupErr));
    return backupData || [];
  }
}

/**
 * 5. Cargar el JSON de un comité específico
 */
export async function cargarComite(comiteId) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase no está configurado.');

  // Intentar tabla committees
  try {
    const { data, error } = await client
      .from('committees')
      .select('data')
      .eq('id', comiteId)
      .single();

    if (!error && data?.data) {
      return data.data;
    }
  } catch {}

  // Fallback tabla backups
  const { data: backupData, error: backupErr } = await client
    .from('backups')
    .select('data')
    .eq('id', comiteId)
    .single();

  if (backupErr) throw new Error(formatSupabaseError(backupErr));
  return backupData?.data;
}

/**
 * 6. Eliminar un comité de la nube
 */
export async function eliminarComite(comiteId) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase no está configurado.');

  // Intentar tabla committees
  try {
    const { error } = await client
      .from('committees')
      .delete()
      .eq('id', comiteId);
    if (!error) return true;
  } catch {}

  // Fallback tabla backups
  const { error: backupErr } = await client
    .from('backups')
    .delete()
    .eq('id', comiteId);

  if (backupErr) throw new Error(formatSupabaseError(backupErr));
  return true;
}
