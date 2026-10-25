export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
export const RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIDE = 1600;

/**
 * Prepara un comprobante para subir: las fotos se achican a 1600px y se pasan a JPEG
 * (una foto de celular de 4 MB queda en ~300 KB); los PDF se suben tal cual.
 * @returns {Promise<{ blob: Blob, type: string, ext: string }>}
 */
export async function prepareReceipt(file) {
  if (file.type === 'application/pdf') {
    if (file.size > MAX_RECEIPT_BYTES) throw new Error('El PDF pesa más de 5 MB');
    return { blob: file, type: 'application/pdf', ext: 'pdf' };
  }
  if (!file.type.startsWith('image/')) throw new Error('Subí una foto o un PDF');

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.82));
    if (blob) return { blob, type: 'image/jpeg', ext: 'jpg' };
  } catch {
    /* formato que el navegador no puede decodificar: se intenta subir el original */
  }
  if (!RECEIPT_TYPES.includes(file.type)) throw new Error('Formato no soportado: usá JPG, PNG o PDF');
  if (file.size > MAX_RECEIPT_BYTES) throw new Error('La imagen pesa más de 5 MB');
  return { blob: file, type: file.type, ext: file.type.split('/')[1] };
}
