"use client"

import { useMemo, useRef, useState } from "react"
import { useFrame } from "@react-three/fiber"
import { RoundedBox } from "@react-three/drei"
import * as THREE from "three"
import type { CellState } from "@/lib/sumplete-engine"
import { TILE } from "./constants"
import { makeGlyphTexture, makeXTexture } from "./textures"
import { type BoardStyle, color, resolveTile } from "./styles"

const PUFF_COUNT = 12
const PUFF_LIFE = 0.5

export function Tile({
  cell,
  position,
  disabled,
  style,
  onClick,
}: {
  cell: CellState
  position: [number, number, number]
  disabled: boolean
  style: BoardStyle
  onClick: () => void
}) {
  const group = useRef<THREE.Group>(null)
  const material = useRef<THREE.MeshStandardMaterial>(null)
  const puff = useRef<THREE.Points>(null)
  const puffAge = useRef(Infinity)
  const prevDeleted = useRef(cell.deleted)
  const vel = useRef(0)
  const curSurface = useRef(color(style.surface.normal).clone())
  const curEmissive = useRef(color(style.colors.normal).clone())
  const [hovered, setHovered] = useState(false)

  const glyph = useMemo(() => makeGlyphTexture(String(cell.value), style.colors.digit), [cell.value, style.colors.digit])
  const xMark = useMemo(() => makeXTexture(style.colors.x), [style.colors.x])

  const depth = style.tile.depth
  const topY = depth / 2

  const puffPositions = useMemo(() => new Float32Array(PUFF_COUNT * 3), [])
  const puffVel = useMemo(() => {
    const v = new Float32Array(PUFF_COUNT * 3)
    for (let i = 0; i < PUFF_COUNT; i++) {
      const a = Math.random() * Math.PI * 2
      const speed = 0.8 + Math.random() * 1.2
      v[i * 3] = Math.cos(a) * speed
      v[i * 3 + 1] = 0.6 + Math.random() * 1.4
      v[i * 3 + 2] = Math.sin(a) * speed
    }
    return v
  }, [])

  useFrame((state, delta) => {
    const g = group.current
    const mat = material.current
    if (!g || !mat) return
    const t = state.clock.elapsedTime
    const d = Math.min(delta, 0.05)

    const target = resolveTile(style, cell, hovered && !disabled, t)

    // Vertical motion: a springy overshoot for "playful", a smooth lerp otherwise.
    if (style.tile.bounce) {
      const force = (target.y - g.position.y) * 220 - vel.current * 16
      vel.current += force * d
      g.position.y += vel.current * d
    } else {
      g.position.y = THREE.MathUtils.lerp(g.position.y, target.y, d * style.tile.stiffness)
    }

    const k = d * style.tile.stiffness
    curSurface.current.lerp(color(target.surface), k)
    curEmissive.current.lerp(color(target.emissive), k)
    mat.color.copy(curSurface.current)
    mat.emissive.copy(curEmissive.current)
    mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, target.intensity, k)

    // Particle puff the moment the tile becomes deleted.
    if (cell.deleted && !prevDeleted.current) {
      puffAge.current = 0
      puffPositions.fill(0)
    }
    prevDeleted.current = cell.deleted

    if (puff.current) {
      const pmat = puff.current.material as THREE.PointsMaterial
      if (puffAge.current < PUFF_LIFE) {
        puffAge.current += d
        for (let i = 0; i < PUFF_COUNT; i++) {
          puffPositions[i * 3] += puffVel[i * 3] * d
          puffPositions[i * 3 + 1] += (puffVel[i * 3 + 1] - puffAge.current * 3) * d
          puffPositions[i * 3 + 2] += puffVel[i * 3 + 2] * d
        }
        puff.current.geometry.attributes.position.needsUpdate = true
        pmat.opacity = Math.max(0, 1 - puffAge.current / PUFF_LIFE)
        puff.current.visible = true
      } else {
        puff.current.visible = false
      }
    }
  })

  return (
    <group ref={group} position={position}>
      <RoundedBox
        args={[TILE, depth, TILE]}
        radius={style.tile.radius}
        smoothness={3}
        onClick={(e) => {
          e.stopPropagation()
          if (!disabled) onClick()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          if (!disabled) {
            setHovered(true)
            document.body.style.cursor = "pointer"
          }
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = "auto"
        }}
      >
        <meshStandardMaterial
          ref={material}
          color={style.surface.normal}
          emissive={style.colors.normal}
          emissiveIntensity={style.tile.baseIntensity}
          metalness={style.tile.metalness}
          roughness={style.tile.roughness}
        />
      </RoundedBox>

      {/* Number on the top face. */}
      <mesh position={[0, topY + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TILE * 0.85, TILE * 0.85]} />
        <meshBasicMaterial map={glyph} transparent toneMapped={!style.glow} opacity={cell.deleted ? 0.35 : 1} />
      </mesh>

      {/* Red X overlay when deleted. */}
      {cell.deleted && (
        <mesh position={[0, topY + 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[TILE * 0.95, TILE * 0.95]} />
          <meshBasicMaterial map={xMark} transparent toneMapped={!style.glow} />
        </mesh>
      )}

      {/* Keep-ring when circled. */}
      {cell.circle && (
        <mesh position={[0, topY + 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[TILE * 0.42, 0.05, 12, 40]} />
          <meshBasicMaterial color={style.colors.ring} toneMapped={!style.glow} />
        </mesh>
      )}

      {/* One-shot deletion particle puff. */}
      <points ref={puff} visible={false} position={[0, topY, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[puffPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color={style.colors.deleted} size={0.12} transparent toneMapped={!style.glow} depthWrite={false} />
      </points>
    </group>
  )
}
