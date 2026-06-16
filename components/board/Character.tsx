"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { COLORS, DEPTH } from "./constants"

const RADIUS = 0.18
const LENGTH = 0.34
const STAND_Y = DEPTH / 2 + LENGTH / 2 + RADIUS // bottom of capsule rests on tile top
const JUMP_HEIGHT = 0.6
const JUMP_DUR = 0.42

// The little glowing hopper. `target` is the world XZ of the current tile;
// bumping `jumpKey` plays a hop arc. The body squashes on takeoff/landing and
// turns to face its travel direction.
export function Character({ target, jumpKey }: { target: [number, number]; jumpKey: number }) {
  const group = useRef<THREE.Group>(null)
  const lastJump = useRef(jumpKey)
  const jumpStart = useRef(-Infinity)
  const facing = useRef(0)

  useFrame((state, delta) => {
    const g = group.current
    if (!g) return
    const d = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime

    const [tx, tz] = target

    // Face the direction of travel before easing toward the target.
    const dx = tx - g.position.x
    const dz = tz - g.position.z
    if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
      facing.current = Math.atan2(dx, dz)
    }
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, facing.current, d * 12)

    g.position.x = THREE.MathUtils.lerp(g.position.x, tx, d * 12)
    g.position.z = THREE.MathUtils.lerp(g.position.z, tz, d * 12)

    if (jumpKey !== lastJump.current) {
      lastJump.current = jumpKey
      jumpStart.current = t
    }

    const p = (t - jumpStart.current) / JUMP_DUR
    let y = STAND_Y
    let squash = 1
    if (p >= 0 && p <= 1) {
      y += Math.sin(p * Math.PI) * JUMP_HEIGHT
      squash = 1 + Math.sin(p * Math.PI) * 0.12 // stretch in the air
    }
    g.position.y = y
    g.scale.set(1 / squash, squash, 1 / squash)
  })

  return (
    <group ref={group} position={[target[0], STAND_Y, target[1]]}>
      <mesh castShadow>
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
