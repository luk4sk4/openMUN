/**
 * Servicio de sincronización con Google Drive API v3
 * Utiliza Google Identity Services (GIS) para autenticación sin backend
 */

export const GOOGLE_CLIENT_ID = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID)
  ? import.meta.env.VITE_GOOGLE_CLIENT_ID
  : '917213180364-2jktmr4s9etrajiai697bfk8410u424r.apps.googleusercontent.com';
export const OPENMUN_FOLDER_NAME = 'openMUN';
export const DEFAULT_DRIVE_FILE_NAME = 'openmun_sesion_activa.json';
const SCOPES = 'https://www.googleapis.com/auth/drive';

class GoogleDriveService {
  constructor() {
    this.tokenClient = null;
    this.accessToken = null;
    this.tokenExpiresAt = null;
    this.userProfile = null;
    this.openMunFolderId = null;
  }

  /**
   * Carga dinámicamente el script de Google Identity Services
   */
  loadGisScript() {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.oauth2) {
        return resolve();
      }
      const existingScript = document.getElementById('google-gis-sdk');
      if (existingScript) {
        existingScript.addEventListener('load', resolve);
        existingScript.addEventListener('error', reject);
        return;
      }
      const script = document.createElement('script');
      script.id = 'google-gis-sdk';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = (err) => reject(new Error('No se pudo cargar el SDK de Google Identity Services: ' + err));
      document.body.appendChild(script);
    });
  }

  /**
   * Inicializa el cliente de tokens OAuth2 de Google
   */
  async init(clientId = GOOGLE_CLIENT_ID) {
    await this.loadGisScript();
    if (!window.google?.accounts?.oauth2) {
      throw new Error('Google Identity Services no está disponible');
    }

    return new Promise((resolve) => {
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            console.error('Error de autenticación Google:', tokenResponse);
            return;
          }
          this.accessToken = tokenResponse.access_token;
          if (tokenResponse.expires_in) {
            this.tokenExpiresAt = Date.now() + tokenResponse.expires_in * 1000;
          }
        },
      });
      resolve(this.tokenClient);
    });
  }

  /**
   * Solicita el inicio de sesión y consentimiento al usuario
   */
  async conectar(clientId = GOOGLE_CLIENT_ID) {
    if (!this.tokenClient) {
      await this.init(clientId);
    }

    return new Promise((resolve, reject) => {
      this.tokenClient.callback = async (tokenResponse) => {
        if (tokenResponse.error) {
          return reject(new Error(tokenResponse.error_description || tokenResponse.error || 'Autenticación cancelada'));
        }
        this.accessToken = tokenResponse.access_token;
        if (tokenResponse.expires_in) {
          this.tokenExpiresAt = Date.now() + tokenResponse.expires_in * 1000;
        }

        // Obtener datos básicos de usuario si es posible
        try {
          const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${this.accessToken}` }
          });
          if (userRes.ok) {
            this.userProfile = await userRes.json();
          }
        } catch (e) {
          console.warn('No se pudo obtener información del perfil de Google:', e);
        }

        // Buscar o crear la carpeta openMUN
        try {
          const folder = await this.obtenerOCrearCarpetaOpenMUN();
          this.openMunFolderId = folder.id;
        } catch (e) {
          console.warn('Error al verificar carpeta openMUN:', e);
        }

        resolve({
          accessToken: this.accessToken,
          user: this.userProfile,
          folderId: this.openMunFolderId
        });
      };

      // Abre el selector de cuenta de Google
      this.tokenClient.requestAccessToken({ prompt: '' });
    });
  }

  /**
   * Cierra la sesión revocando el token
   */
  desconectar() {
    if (this.accessToken && window.google?.accounts?.oauth2?.revoke) {
      try {
        window.google.accounts.oauth2.revoke(this.accessToken, () => {});
      } catch (e) {
        console.warn('Error al revocar token:', e);
      }
    }
    this.accessToken = null;
    this.tokenExpiresAt = null;
    this.userProfile = null;
    this.openMunFolderId = null;
  }

  /**
   * Comprueba si el token está activo
   */
  isAuthenticated() {
    return !!this.accessToken && (!this.tokenExpiresAt || Date.now() < this.tokenExpiresAt);
  }

  /**
   * Obtiene o crea automáticamente la carpeta 'openMUN' en Google Drive
   */
  async obtenerOCrearCarpetaOpenMUN() {
    if (!this.isAuthenticated()) throw new Error('No autenticado en Google Drive');

    if (this.openMunFolderId) {
      return { id: this.openMunFolderId, name: OPENMUN_FOLDER_NAME };
    }

    // 1. Buscar si ya existe la carpeta
    const q = encodeURIComponent(`mimeType = 'application/vnd.google-apps.folder' and name = '${OPENMUN_FOLDER_NAME}' and trashed = false`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&orderBy=createdTime desc`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        this.openMunFolderId = data.files[0].id;
        return data.files[0];
      }
    }

    // 2. Si no existe, crear la carpeta
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: OPENMUN_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Carpeta de sesiones y copias de seguridad de openMUN'
      })
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `Error al crear carpeta openMUN en Drive (Status: ${createRes.status})`);
    }

    const folderData = await createRes.json();
    this.openMunFolderId = folderData.id;
    return folderData;
  }

  /**
   * Lista todos los archivos de sesión guardados en la carpeta openMUN
   */
  async listarArchivosSesion(folderId = null) {
    if (!this.isAuthenticated()) throw new Error('No autenticado en Google Drive');

    const targetFolderId = folderId || this.openMunFolderId || (await this.obtenerOCrearCarpetaOpenMUN()).id;
    
    // Buscar archivos .json en la carpeta openMUN
    const q = encodeURIComponent(`'${targetFolderId}' in parents and trashed = false`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime,size,webViewLink,description)&orderBy=modifiedTime desc`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Error al listar sesiones en Drive (Status: ${res.status})`);
    }

    const data = await res.json();
    return data.files || [];
  }

  /**
   * Busca un archivo por nombre exacto dentro de la carpeta openMUN
   */
  async buscarArchivoSesion(nombreArchivo = DEFAULT_DRIVE_FILE_NAME, folderId = null) {
    if (!this.isAuthenticated()) throw new Error('No autenticado en Google Drive');

    const targetFolderId = folderId || this.openMunFolderId || (await this.obtenerOCrearCarpetaOpenMUN()).id;
    const q = encodeURIComponent(`'${targetFolderId}' in parents and name = '${nombreArchivo}' and trashed = false`);
    
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime,size,webViewLink)&orderBy=modifiedTime desc`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Error al buscar archivo en Drive (Status: ${res.status})`);
    }

    const data = await res.json();
    return data.files && data.files.length > 0 ? data.files[0] : null;
  }

  /**
   * Descarga el contenido JSON del archivo desde Google Drive
   */
  async descargarSesion(fileId) {
    if (!this.isAuthenticated()) throw new Error('No autenticado en Google Drive');

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Error al descargar sesión de Drive (Status: ${res.status})`);
    }

    return await res.json();
  }

  /**
   * Crea un nuevo archivo en Google Drive dentro de la carpeta openMUN
   */
  async crearArchivoSesion(sesionData, nombreArchivo = DEFAULT_DRIVE_FILE_NAME, folderId = null) {
    if (!this.isAuthenticated()) throw new Error('No autenticado en Google Drive');

    const targetFolderId = folderId || this.openMunFolderId || (await this.obtenerOCrearCarpetaOpenMUN()).id;

    // Asegurar que el nombre termine en .json
    const cleanFileName = nombreArchivo.endsWith('.json') ? nombreArchivo : `${nombreArchivo}.json`;

    const metadata = {
      name: cleanFileName,
      description: `Sesión de openMUN - Comité: ${sesionData.comision || sesionData.nombreComite || 'General'}`,
      mimeType: 'application/json',
      parents: [targetFolderId]
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(sesionData, null, 2) +
      closeDelimiter;

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,size,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Error al crear archivo en Drive (Status: ${res.status})`);
    }

    return await res.json();
  }

  /**
   * Actualiza el contenido del archivo en Google Drive (Auto-guardado)
   */
  async actualizarArchivoSesion(fileId, sesionData) {
    if (!this.isAuthenticated()) throw new Error('No autenticado en Google Drive');

    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id,name,modifiedTime,size`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sesionData, null, 2)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Error al actualizar archivo en Drive (Status: ${res.status})`);
    }

    return await res.json();
  }

  /**
   * Elimina un archivo de Google Drive
   */
  async eliminarArchivo(fileId) {
    if (!this.isAuthenticated()) throw new Error('No autenticado en Google Drive');

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });

    if (!res.ok && res.status !== 204 && res.status !== 404) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Error al eliminar archivo en Drive (Status: ${res.status})`);
    }

    return true;
  }
}

export const googleDriveService = new GoogleDriveService();
