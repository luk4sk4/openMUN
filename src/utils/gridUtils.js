// Constantes de configuración de cuadrícula de widgets
export const COLS = 12;
export const MIN_ROWS = 8;
export const ROW_HEIGHT = 105; // Altura en px por celda de fila
export const GAP = 12;         // Separación en px entre celdas

/**
 * Calcula el tamaño de celda en función del ancho del contenedor disponible
 * @param {number} containerWidth 
 * @returns {{ cellW: number, cellH: number }}
 */
export function getCellSize(containerWidth) {
  const totalGap = GAP * (COLS + 1);
  const cellW = Math.max(20, (containerWidth - totalGap) / COLS);
  const cellH = ROW_HEIGHT;
  return { cellW, cellH };
}
