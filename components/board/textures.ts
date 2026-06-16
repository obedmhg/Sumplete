import * as THREE from "three"

// Canvas-drawn textures keep digits crisp and bloom-friendly without shipping a
// font file or fetching one at runtime (troika's default font is networked).

function baseCanvas(size = 256): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!
  return { canvas, ctx }
}

function toTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas)
  tex.anisotropy = 4
  tex.needsUpdate = true
  return tex
}

/** Glowing digit (or any short string) centered on a transparent square. */
export function makeGlyphTexture(text: string, color: string): THREE.CanvasTexture {
  const { canvas, ctx } = baseCanvas()
  const fontSize = text.length >= 3 ? 110 : text.length === 2 ? 140 : 160
  ctx.font = `bold ${fontSize}px ui-sans-serif, system-ui, -apple-system, sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.shadowColor = color
  ctx.shadowBlur = 26
  ctx.fillStyle = color
  ctx.fillText(text, 128, 138)
  // Second pass tightens the core so bloom has a bright center.
  ctx.shadowBlur = 0
  ctx.fillStyle = "#ffffff"
  ctx.globalAlpha = 0.9
  ctx.fillText(text, 128, 138)
  return toTexture(canvas)
}

/** Glowing diagonal cross used to mark a deleted cell. */
export function makeXTexture(color: string): THREE.CanvasTexture {
  const { canvas, ctx } = baseCanvas()
  ctx.strokeStyle = color
  ctx.lineCap = "round"
  ctx.lineWidth = 30
  ctx.shadowColor = color
  ctx.shadowBlur = 22
  const p = 70
  ctx.beginPath()
  ctx.moveTo(p, p)
  ctx.lineTo(256 - p, 256 - p)
  ctx.moveTo(256 - p, p)
  ctx.lineTo(p, 256 - p)
  ctx.stroke()
  return toTexture(canvas)
}
