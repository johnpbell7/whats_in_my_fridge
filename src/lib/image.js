// Downscale a captured photo before sending it to the API.
//
// Why: phone cameras produce huge images. Claude resizes anything over ~1568px
// on its longest edge anyway, so sending bigger just wastes time, tokens and
// (on serverless hosts) can blow past the request body limit. Re-encoding to a
// modest JPEG keeps payloads small and the scan fast, while staying legible
// enough to read receipt text.

const MAX_EDGE = 1568
const QUALITY = 0.82

export function downscaleImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      const dataUrl = canvas.toDataURL('image/jpeg', QUALITY)
      const [, mediaType, base64] = dataUrl.match(/^data:(.+?);base64,(.*)$/) || []
      resolve({ dataUrl, mediaType: mediaType || 'image/jpeg', base64 })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image file.'))
    }
    img.src = url
  })
}
