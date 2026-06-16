"use client"

import { useMemo, useRef, useState } from "react"
import { useFrame } from "@react-three/fiber"
import { RoundedBox } from "@react-three/drei"
import * as THREE from "three"
import type { CellState } from "@/lib/sumplete-engine"
import { COLORS, DEPTH, TILE } from "./constants"
import { makeGlyphTexture, makeXTexture } from "./textures"

const PUFF_COUNT = 12
const PUFF_LIFE = 0.5

type Target = { y: number; color: THREE.Color; intensity: number }

const C_CYAN = new THREE.Color(COLORS.cyan)
const C_GREEN = new THREE.Color(COLORS.green)
const C_RED = new THREE.Color(COLORS.red)
const C_BLUE = new THREE.Color(COLORS.blue)

export function Tile({
  cell,
  position,
  disabled,
  onClick,
}: {
  cell: CellState
  position: [number, number, number]
  disabled: boolean
  onClick: () => void
}) {
  const group = useRef<THREE.Group>(null)
  const material = useRef<THREE.MeshStandardMaterial>(null)
  const puff = useRef<THREE.Points>(null)
  const puffAge = useRef(Infinity)
  const prevDeleted = useRef(cell.deleted)
  const current = useRef(new THREE.Color(COLORS.cyan))
  const [hovered, setHovered] = useState(false)

  const glyph = useMemo(() => makeGlyphTexture(String(cell.value), COLORS.cyan), [cell.value])
  const xMark = useMemo(() => makeXTexture(COLORS.red), [])

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

    // Resolve the target pose/glow from cell state.
    const target: Target = { y: 0, color: C_CYAN, intensity: 0.55 }
    if (cell.deleted) {
      target.y = -0.34
      target.color = C_RED
      target.intensity = 0.22
    } else if (cell.circle) {
      target.y = 0.3
      target.color = C_GREEN
      target.intensity = 1.15
    } else if (hovered && !disabled) {
      target.intensity = 1.0
    }
    if (cell.mistake) {
      target.color = C_RED
      target.intensity = 0.6 + (Math.sin(t * 7) * 0.5 + 0.5) * 1.3
    } else if (cell.hint) {
      target.color = C_BLUE
      target.intensity = 0.6 + (Math.sin(t * 5) * 0.5 + 0.5) * 1.1
    }

    g.position.y = THREE.MathUtils.lerp(g.position.y, target.y, d * 10)
    mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, target.intensity, d * 10)
    current.current.lerp(target.color, d * 10)
    mat.emissive.copy(current.current)

    // Trigger a particle puff the moment the tile becomes deleted.
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
        args={[TILE, DEPTH, TILE]}
        radius={0.1}
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
          color={COLORS.base}
          emissive={COLORS.cyan}
          emissiveIntensity={0.55}
          metalness={0.3}
          roughness={0.35}
        />
      </RoundedBox>

      {/* Number on the top face. */}
      <mesh position={[0, DEPTH / 2 + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TILE * 0.85, TILE * 0.85]} />
        <meshBasicMaterial map={glyph} transparent toneMapped={false} opacity={cell.deleted ? 0.3 : 1} />
      </mesh>

      {/* Red X overlay when deleted. */}
      {cell.deleted && (
        <mesh position={[0, DEPTH / 2 + 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[TILE * 0.95, TILE * 0.95]} />
          <meshBasicMaterial map={xMark} transparent toneMapped={false} />
        </mesh>
      )}

      {/* Green keep-ring when circled. */}
      {cell.circle && (
        <mesh position={[0, DEPTH / 2 + 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[TILE * 0.42, 0.05, 12, 40]} />
          <meshBasicMaterial color={COLORS.green} toneMapped={false} />
        </mesh>
      )}

      {/* One-shot deletion particle puff. */}
      <points ref={puff} visible={false} position={[0, DEPTH / 2, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[puffPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color={COLORS.red} size={0.12} transparent toneMapped={false} depthWrite={false} />
      </points>
    </group>
  )
}
