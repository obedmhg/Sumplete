"use client"

import { useRef, type MutableRefObject } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera } from "@react-three/drei"
import * as THREE from "three"
import type { CellState, LineStatus } from "@/lib/sumplete-engine"
import { COLORS, PITCH, coord, type CharState } from "./constants"
import { NumberTile } from "./NumberTile"
import { SumLabel } from "./SumLabel"
import { Character } from "./Character"
import { Effects } from "./Effects"
import { Burst } from "./Burst"

// Pans the camera + orbit target to keep the character in frame as it walks,
// without disturbing the user's current orbit angle or zoom (both shift by the
// same vector, so the view just slides).
function FollowCamera({
  charRef,
  initial,
}: {
  charRef: MutableRefObject<CharState>
  initial: [number, number, number]
}) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as { target: THREE.Vector3; update: () => void } | null
  const inited = useRef(false)

  useFrame((_, delta) => {
    if (!controls) return

    // Set the starting pose once (not via a prop, which would reset on every
    // game-state re-render). `key={size}` remounts this to reframe on resize.
    if (!inited.current) {
      camera.position.set(initial[0] + charRef.current.x, initial[1], initial[2] + charRef.current.z)
      controls.target.set(charRef.current.x, 0, charRef.current.z)
      controls.update()
      inited.current = true
      return
    }

    const k = Math.min(delta, 0.05) * 5
    const tx = THREE.MathUtils.lerp(controls.target.x, charRef.current.x, k)
    const tz = THREE.MathUtils.lerp(controls.target.z, charRef.current.z, k)
    const dx = tx - controls.target.x
    const dz = tz - controls.target.z
    controls.target.x = tx
    controls.target.z = tz
    camera.position.x += dx
    camera.position.z += dz
    controls.update()
  })

  return null
}

export type GameSceneProps = {
  size: number
  grid: CellState[][]
  rowSums: number[]
  colSums: number[]
  rowStatus: LineStatus[]
  colStatus: LineStatus[]
  charRef: MutableRefObject<CharState>
  heldRef: MutableRefObject<Set<string>>
  disabled: boolean
  jumpKey: number
  winCount: number
}

export default function GameScene(props: GameSceneProps) {
  const { size, grid, rowSums, colSums, rowStatus, colStatus, charRef, heldRef, disabled, jumpKey, winCount } = props

  const span = (size + 1) * PITCH
  // On narrow / portrait screens the board is wider than the view, so pull the
  // camera back to fit more of it; the follow-camera handles the rest.
  const aspect = typeof window !== "undefined" ? window.innerWidth / window.innerHeight : 1.6
  const portraitMul = aspect < 1 ? Math.min(1.9, 1 / aspect) : 1
  const dist = span * 0.95 * portraitMul
  const initialCam: [number, number, number] = [0, dist, dist]
  const labelEnd = coord(size, size)

  return (
    <Canvas dpr={[1, 2]} gl={{ antialias: true }}>
      <color attach="background" args={[COLORS.bg]} />
      <fog attach="fog" args={[COLORS.bg, span * 1.4, span * 3.2]} />

      <PerspectiveCamera makeDefault fov={45} />
      <OrbitControls
        makeDefault
        target={[0, 0, 0]}
        enablePan={false}
        minPolarAngle={0.2}
        maxPolarAngle={1.25}
        minDistance={span * 0.45}
        maxDistance={span * 3}
      />
      <FollowCamera charRef={charRef} initial={initialCam} />

      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 9, 6]} intensity={0.9} />
      <pointLight position={[-4, 5, 4]} intensity={22} distance={40} color={COLORS.cyan} />
      <pointLight position={[5, 5, -4]} intensity={16} distance={40} color={COLORS.blue} />

      {grid.map((row, i) =>
        row.map((cell, j) => (
          <NumberTile
            key={`${i}-${j}`}
            cell={cell}
            position={[coord(j, size), 0, coord(i, size)]}
            row={i}
            col={j}
            charRef={charRef}
          />
        )),
      )}

      {rowSums.map((value, i) => (
        <SumLabel key={`r-${i}`} value={value} status={rowStatus[i]} position={[labelEnd, 0, coord(i, size)]} />
      ))}
      {colSums.map((value, j) => (
        <SumLabel key={`c-${j}`} value={value} status={colStatus[j]} position={[coord(j, size), 0, labelEnd]} />
      ))}

      <Character charRef={charRef} heldRef={heldRef} size={size} disabled={disabled} jumpKey={jumpKey} />

      <Burst fire={winCount} origin={[0, 0.5, 0]} />
      <Effects />
    </Canvas>
  )
}
