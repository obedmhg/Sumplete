"use client"

import type { MutableRefObject } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera } from "@react-three/drei"
import type { CellState, LineStatus } from "@/lib/sumplete-engine"
import { COLORS, PITCH, coord, type CharState } from "./constants"
import { NumberTile } from "./NumberTile"
import { SumLabel } from "./SumLabel"
import { Character } from "./Character"
import { Effects } from "./Effects"
import { Burst } from "./Burst"

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
  const camera: [number, number, number] = [0, span * 0.95, span * 0.95]
  const labelEnd = coord(size, size)

  return (
    <Canvas dpr={[1, 2]} gl={{ antialias: true }}>
      <color attach="background" args={[COLORS.bg]} />
      <fog attach="fog" args={[COLORS.bg, span * 1.4, span * 3.2]} />

      <PerspectiveCamera makeDefault position={camera} fov={45} />
      <OrbitControls
        makeDefault
        target={[0, 0, 0]}
        enablePan={false}
        minPolarAngle={0.2}
        maxPolarAngle={1.25}
        minDistance={span * 0.55}
        maxDistance={span * 2}
      />

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
