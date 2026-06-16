"use client"

import { useRef, type MutableRefObject } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { CHAR_SPEED, COLORS, DEPTH, PITCH, type CharState } from "./constants"
import { play } from "@/lib/sound"

const RADIUS = 0.18
const LENGTH = 0.34
const STAND_Y = DEPTH / 2 + LENGTH / 2 + RADIUS // bottom of capsule rests on tile top
const JUMP_HEIGHT = 0.6
const JUMP_DUR = 0.42
const STEP_INTERVAL = 0.3

// Free-roaming hopper. Position is integrated from held arrow keys every frame
// (no React state, no per-frame re-render) and written into `charRef` so tiles
// and the jump handler can read where it is. It can walk anywhere, including a
// couple of tiles past the board edge.
export function Character({
  charRef,
  heldRef,
  size,
  disabled,
  jumpKey,
}: {
  charRef: MutableRefObject<CharState>
  heldRef: MutableRefObject<Set<string>>
  size: number
  disabled: boolean
  jumpKey: number
}) {
  const group = useRef<THREE.Group>(null)
  const lastJump = useRef(jumpKey)
  const jumpStart = useRef(-Infinity)
  const facing = useRef(0)
  const stepAcc = useRef(0)

  useFrame((state, delta) => {
    const g = group.current
    if (!g) return
    const d = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    const c = charRef.current

    // Velocity from held keys (diagonals normalized).
    let vx = 0
    let vz = 0
    if (!disabled) {
      const held = heldRef.current
      if (held.has("ArrowLeft")) vx -= 1
      if (held.has("ArrowRight")) vx += 1
      if (held.has("ArrowUp")) vz -= 1
      if (held.has("ArrowDown")) vz += 1
    }
    const len = Math.hypot(vx, vz)
    if (len > 0) {
      vx /= len
      vz /= len
    }

    const half = (size - 1) / 2
    const bound = (half + 2) * PITCH // roam up to two tiles beyond the edge
    c.x = THREE.MathUtils.clamp(c.x + vx * CHAR_SPEED * d, -bound, bound)
    c.z = THREE.MathUtils.clamp(c.z + vz * CHAR_SPEED * d, -bound, bound)

    // Which tile (if any) is under the character.
    const col = Math.round(c.x / PITCH + half)
    const row = Math.round(c.z / PITCH + half)
    c.valid = row >= 0 && row < size && col >= 0 && col < size
    c.row = c.valid ? row : -1
    c.col = c.valid ? col : -1

    // Face the travel direction; footstep cadence while moving.
    if (len > 0) {
      facing.current = Math.atan2(vx, vz)
      stepAcc.current += d
      if (stepAcc.current >= STEP_INTERVAL) {
        stepAcc.current = 0
        play("step")
      }
    }
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, facing.current, d * 12)

    // Jump arc.
    if (jumpKey !== lastJump.current) {
      lastJump.current = jumpKey
      jumpStart.current = t
    }
    const p = (t - jumpStart.current) / JUMP_DUR
    let y = STAND_Y
    let squash = 1
    if (p >= 0 && p <= 1) {
      y += Math.sin(p * Math.PI) * JUMP_HEIGHT
      squash = 1 + Math.sin(p * Math.PI) * 0.12
    }
    g.position.set(c.x, y, c.z)
    g.scale.set(1 / squash, squash, 1 / squash)
  })

  return (
    <group ref={group} position={[charRef.current.x, STAND_Y, charRef.current.z]}>
      <mesh>
        <capsuleGeometry args={[RADIUS, LENGTH, 6, 16]} />
        <meshStandardMaterial color="#2a1a05" emissive={COLORS.amber} emissiveIntensity={1.1} roughness={0.4} />
      </mesh>
      {/* Eyes on the front face (+Z). */}
      <mesh position={[0.07, 0.12, 0.17]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshBasicMaterial color="#0a0a12" toneMapped={false} />
      </mesh>
      <mesh position={[-0.07, 0.12, 0.17]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshBasicMaterial color="#0a0a12" toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0.3, 0]} intensity={6} distance={3} color={COLORS.amber} />
    </group>
  )
}
