// Client-side image compression — phones produce 5–15 MB photos; uploading
// them raw eats the free storage tier and makes every feed load slow.
// Downscale to a sane size and re-encode as JPEG before upload. On any
// failure (odd formats, old browsers) fall back to the original file.

const MAX_DIM = 1600
const QUALITY = 0.82

// Small feed thumbnail (~360px) uploaded alongside the full photo — the browse
// grid loads these instead of the 1600px originals, cutting data use ~5×.
const THUMB_DIM = 360
export async function makeThumb(file: File): Promise<File | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, THUMB_DIM / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.7))
    return blob ? new File([blob], 'thumb.jpg', { type: 'image/jpeg' }) : null
  } catch {
    return null
  }
}

export async function compressImage(file: File): Promise<File> {
  // GIFs would lose animation; tiny files aren't worth re-encoding
  if (file.type === 'image/gif' || file.size < 150_000) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
    if (!blob || blob.size >= file.size) return file // compression didn't help
    const base = file.name.replace(/\.[^.]+$/, '') || 'photo'
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' })
  } catch {
    return file
  }
}
