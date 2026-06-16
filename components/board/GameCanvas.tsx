"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera } from "@react-three/drei"
import type { CellState, LineStatus } from "@/lib/sumplete-engine"
import { PITCH, coord } from "./constants"
import { Tile } from "./Tile"
import { SumLabel } from "./SumLabel"
import { Effects } from "./Effects"
import { Burst } from "./Burst"
import { getStyle, type BoardStyleId } from "./styles"

export type GameCanvasProps = {
  size: number
  grid: CellState[][]
  rowSums: number[]
  colSums: number[]
  rowStatus: LineStatus[]
  colStatus: LineStatus[]
  disabled: boolean
  winCount: number
  styleId: BoardStyleId
  onCellClick: (row: number, col: number) => void
}

export default function GameCanvas(props: GameCanvasProps) {
  const { size, grid, rowSums, colSums, rowStatus, colStatus, disabled, winCount, styleId, onCellClick } = props
  const style = getStyle(styleId)

  const span = (size + 1) * PITCH
  const camera: [number, number, number] = [0, span * 0.92, span * 0.82]
  const labelEnd = coord(size, size)

  return (
    <Canvas dpr={[1, 2]} gl={{ antialias: true }}>
      <color attach="background" args={[style.background]} />
      {style.fog && <fog attach="fog" args={[style.background, span * 1.2, span * 2.6]} />}

      <PerspectiveCamera makeDefault position={camera} fov={45} />
      <OrbitControls
        makeDefault
        target={[0, 0, 0]}
        enablePan={false}
        minPolarAngle={0.2}
        maxPolarAngle={1.25}
        minDistance={span * 0.55}
        maxDistance={span * 1.7}
      />

      <ambientLight intensity={style.lights.ambient} />
      <directionalLight position={style.lights.dirPos} intensity={style.lights.dir} />
      {style.lights.points.map((p, i) => (
        <pointLight key={i} position={p.position} intensity={p.intensity} distance={p.distance} color={p.color} />
      ))}

      {grid.map((row, i) =>
        row.map((cell, j) => (
          <Tile
            key={`${i}-${j}`}
            cell={cell}
            position={[coord(j, size), 0, coord(i, size)]}
            disabled={disabled}
            style={style}
            onClick={() => onCellClick(i, j)}
          />
        )),
      )}

      {/* Row targets at the +X end. */}
      {rowSums.map((value, i) => (
        <SumLabel key={`r-${i}`} value={value} status={rowStatus[i]} position={[labelEnd, 0, coord(i, size)]} style={style} />
      ))}

      {/* Column targets at the +Z end. */}
      {colSums.map((value, j) => (
        <SumLabel key={`c-${j}`} value={value} status={colStatus[j]} position={[coord(j, size), 0, labelEnd]} style={style} />
      ))}

      <Burst fire={winCount} color={style.colors.win} glow={style.glow} origin={[0, 0.5, 0]} />
      <Effects style={style} />
    </Canvas>
  )
}
