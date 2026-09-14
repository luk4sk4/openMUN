/**
 * Utilidades de Compresión y Descompresión ultraligera para envíos de red en openMUN.
 * Utiliza Streams de compresión nativos del navegador (CompressionStream / DecompressionStream con Gzip).
 */

/**
 * Comprime cualquier objeto JavaScript serializable a un paquete optimizado Base64.
 * Si el payload es muy pequeño (<120 caracteres) o no hay soporte, devuelve el objeto original intacto.
 * 
 * @param {any} data - Objeto o dato a comprimir
 * @returns {Promise<any>} Objeto comprimido `{ _c: true, data: string }` o data original
 */
export async function compressData(data) {
  if (data === null || data === undefined) return data;

  // Si ya viene marcado como comprimido, no volver a comprimir
  if (typeof data === 'object' && data._c && typeof data.data === 'string') {
    return data;
  }

  try {
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Si el payload es minúsculo, la cabecera de compresión no aporta ahorro
    if (jsonStr.length < 120) {
      return data;
    }

    if (typeof CompressionStream !== 'undefined') {
      const encoder = new TextEncoder();
      const encoded = encoder.encode(jsonStr);
      
      const stream = new Response(
        new Blob([encoded]).stream().pipeThrough(new CompressionStream('gzip'))
      );
      const buffer = await stream.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      
      let binary = '';
      const len = bytes.byteLength;
      const chunkSize = 8192;
      for (let i = 0; i < len; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, len)));
      }
      
      const base64 = btoa(binary);
      return {
        _c: true,
        data: base64
      };
    }
  } catch (err) {
    console.warn('[openMUN Network] Compresión omitida o fallida:', err);
  }

  return data;
}

/**
 * Descomprime un payload si viene en formato comprimido `{ _c: true, data: string }`.
 * Si el payload no está comprimido, lo retorna directamente sin modificar.
 * 
 * @param {any} payload - Datos recibidos por WebSocket o canal de red
 * @returns {Promise<any>} Objeto o dato original descomprimido
 */
export async function decompressData(payload) {
  if (!payload) return payload;

  if (typeof payload === 'object' && payload._c === true && typeof payload.data === 'string') {
    try {
      if (typeof DecompressionStream !== 'undefined') {
        const binary = atob(payload.data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        const stream = new Response(
          new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
        );
        const text = await stream.text();
        return JSON.parse(text);
      }
    } catch (err) {
      console.error('[openMUN Network] Error descomprimiendo payload:', err);
      return payload;
    }
  }

  return payload;
}
