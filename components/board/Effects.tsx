"use client"

import { EffectComposer, Bloom } from "@react-three/postprocessing"

// Bloom is what turns the emissive tiles into a neon glow.
export function Effects() {
  return (
    <EffectComposer>
      <Bloom intensity={0.9} luminanceThreshold={0.25} luminanceSmoothing={0.4} mipmapBlur radius={0.7} />
    </EffectComposer>
  )
}
