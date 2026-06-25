"use client"

import { useMemo, useRef, type MutableRefObject } from "react"
import { useFrame } from "@react-three/fiber"
import { RoundedBox } from "@react-three/drei"
import * as THREE from "three"
import type { CellState } from "@/lib/sumplete-engine"
import { COLORS, DEPTH, TILE, type CharState } from "./constants"
import { makeGlyphTexture, makeXTexture } from "./textures"

const C_CYAN = new THREE.Color(COLORS.cyan)
const C_RED = new THREE.Color(COLORS.red)
const C_BLUE = new THREE.Color(COLORS.blue)
const C_AMBER = new THREE.Color(COLORS.amber)

// A flat number pad the character can stand on. Deleted = dim + red X. The tile
// under the character glows amber. Tiles never move vertically, so the
// character keeps a constant standing height.
export function NumberTile({
  cell,
  position,
  row,
  col,
  charRef,
  clickable = false,
  onClick,
}: {
  cell: CellState
  position: [number, number, number]
  row: number
  col: number
  charRef: MutableRefObject<CharState>
  clickable?: boolean
  onClick?: (row: number, col: number) => void
}) {
  const material = useRef<THREE.MeshStandardMaterial>(null)
  const current = useRef(new THREE.Color(COLORS.cyan))

  const glyph = useMemo(() => makeGlyphTexture(String(cell.value), COLORS.cyan), [cell.value])
  const xMark = useMemo(() => makeXTexture(COLORS.red), [])

  useFrame((state, delta) => {
    const mat = material.current
    if (!mat) return
    const t = state.clock.elapsedTime
    const d = Math.min(delta, 0.05) * 10

    const c = charRef.current
    const occupied = c.valid && c.row === row && c.col === col

    let color = C_CYAN
    let intensity = 0.5
    if (cell.deleted) {
      color = C_RED
      intensity = 0.28
    }
    if (occupied) {
      color = C_AMBER
      intensity = 1.3
    }
    if (cell.mistake) {
      color = C_RED
      intensity = 0.6 + (Math.sin(t * 7) * 0.5 + 0.5) * 1.3
    } else if (cell.hint) {
      color = C_BLUE
      intensity = 0.6 + (Math.sin(t * 5) * 0.5 + 0.5) * 1.1
    }

    current.current.lerp(color, d)
    mat.emissive.copy(current.current)
    mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, intensity, d)
  })

  return (
    <group
      position={position}
      onClick={
        clickable
          ? (e) => {
              e.stopPropagation()
              onClick?.(row, col)
            }
          : undefined
      }
      onPointerOver={
        clickable
          ? (e) => {
              e.stopPropagation()
              document.body.style.cursor = "pointer"
            }
          : undefined
      }
      onPointerOut={clickable ? () => (document.body.style.cursor = "auto") : undefined}
    >
      <RoundedBox args={[TILE, DEPTH, TILE]} radius={0.1} smoothness={3}>
        <meshStandardMaterial
          ref={material}
          color={COLORS.base}
          emissive={COLORS.cyan}
          emissiveIntensity={0.5}
          metalness={0.3}
          roughness={0.35}
        />
      </RoundedBox>

      <mesh position={[0, DEPTH / 2 + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TILE * 0.85, TILE * 0.85]} />
        <meshBasicMaterial map={glyph} transparent toneMapped={false} opacity={cell.deleted ? 0.35 : 1} />
      </mesh>

      {cell.deleted && (
        <mesh position={[0, DEPTH / 2 + 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[TILE * 0.95, TILE * 0.95]} />
          <meshBasicMaterial map={xMark} transparent toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}
