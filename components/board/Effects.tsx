"use client"

import { EffectComposer, Bloom } from "@react-three/postprocessing"
import type { BoardStyle } from "./styles"

// Bloom turns emissive tiles into a neon glow. Styles that don't want it
// (minimal, playful) render no composer at all.
export function Effects({ style }: { style: BoardStyle }) {
  if (!style.bloom.enabled) return null
  return (
    <EffectComposer>
      <Bloom
        intensity={style.bloom.intensity}
        luminanceThreshold={style.bloom.threshold}
        luminanceSmoothing={style.bloom.smoothing}
        mipmapBlur
        radius={style.bloom.radius}
      />
    </EffectComposer>
  )
}
