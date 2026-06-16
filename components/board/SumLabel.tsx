"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { LineStatus } from "@/lib/sumplete-engine"
import { COLORS, TILE } from "./constants"
import { makeGlyphTexture } from "./textures"

// Flat target-sum label at the end of a row or column. Glows green and pulses
// when its line's running sum matches the target.
export function SumLabel({
  value,
  status,
  position,
}: {
  value: number
  status: LineStatus
  position: [number, number, number]
}) {
  const group = useRef<THREE.Group>(null)
  const correct = status === "correct"

  const cyanTex = useMemo(() => makeGlyphTexture(String(value), COLORS.cyan), [value])
  const greenTex = useMemo(() => makeGlyphTexture(String(value), COLORS.green), [value])

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
        <meshBasicMaterial map={correct ? greenTex : cyanTex} transparent toneMapped={false} />
      </mesh>
    </group>
  )
}
