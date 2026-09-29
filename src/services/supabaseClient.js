import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://przhpubwzwgulaoprnda.supabase.co';

export const getSupabaseUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) {
    return import.meta.env.VITE_SUPABASE_URL;
  }
  return DEFAULT_SUPABASE_URL;
};

export const getSupabaseAnonKey = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) {
    return import.meta.env.VITE_SUPABASE_ANON_KEY;
  }
  if (typeof window !== 'undefined') {
    return localStorage.getItem('openmun_supabase_anon_key') || '';
  }
  return '';
};

export const setSupabaseAnonKey = (key) => {
  if (typeof window !== 'undefined') {
    if (key && key.trim()) {
      localStorage.setItem('openmun_supabase_anon_key', key.trim());
    } else {
      localStorage.removeItem('openmun_supabase_anon_key');
    }
  }
  // Reset cached client
  cachedClient = null;
};

export const isSupabaseConfigured = () => {
  const key = getSupabaseAnonKey();
  return Boolean(key && key.length > 10);
};

let cachedClient = null;

export const getSupabaseClient = () => {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!key) {
    return null;
  }

  if (cachedClient) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    });
    return cachedClient;
  } catch (err) {
    console.error('Error inicializando Supabase Client:', err);
    return null;
  }
};

// Export proxy for backwards-compatible supabase.from(...) calls
export const supabase = new Proxy({}, {
  get(target, prop) {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error(
        'Supabase no está configurado. Por favor ingresa tu Supabase Anon Key en el menú o define VITE_SUPABASE_ANON_KEY.'
      );
    }
    return client[prop];
  }
});
