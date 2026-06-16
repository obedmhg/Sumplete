"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { LineStatus } from "@/lib/sumplete-engine"
import { TILE } from "./constants"
import { makeGlyphTexture } from "./textures"
import type { BoardStyle } from "./styles"

// Flat target-sum label at the end of a row or column. Recolors + pulses when
// its line's running sum matches the target.
export function SumLabel({
  value,
  status,
  position,
  style,
}: {
  value: number
  status: LineStatus
  position: [number, number, number]
  style: BoardStyle
}) {
  const group = useRef<THREE.Group>(null)
  const correct = status === "correct"

  const normalTex = useMemo(
    () => makeGlyphTexture(String(value), style.colors.labelNormal),
    [value, style.colors.labelNormal],
  )
  const correctTex = useMemo(
    () => makeGlyphTexture(String(value), style.colors.labelCorrect),
    [value, style.colors.labelCorrect],
  )

  useFrame((_, delta) => {
    if (!group.current) return
    const targetScale = correct ? 1.18 : 1
    const s = THREE.MathUtils.lerp(group.current.scale.x, targetScale, Math.min(delta, 0.05) * 8)
    group.current.scale.setScalar(s)
  })

  return (
    <group ref={group} position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TILE * 0.9, TILE * 0.9]} />
        <meshBasicMaterial map={correct ? correctTex : normalTex} transparent toneMapped={!style.glow} />
      </mesh>
    </group>
  )
}
