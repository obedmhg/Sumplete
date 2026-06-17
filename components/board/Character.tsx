"use client"

import { useRef, type MutableRefObject } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { CHAR_SPEED, DEPTH, PITCH, type CharState } from "./constants"
import { play } from "@/lib/sound"

// Limb segment lengths (world units; a tile is 1 unit wide).
const LEG_H = 0.22
const TORSO_H = 0.3
const STAND_Y = DEPTH / 2 // root sits at the character's feet, on the tile top
const JUMP_HEIGHT = 0.6
const JUMP_DUR = 0.42
const STEP_INTERVAL = 0.3

const CAP = "#e63946" // cap + shirt red
const OVERALL = "#2a4cd6" // blue legs / straps
const SKIN = "#f4c79a"
const SHOE = "#4a2c12"
const DARK = "#1a1014"

// A chunky, boxy Mario-ish hopper built from cubes. Position is integrated from
// held arrow keys each frame (refs, no React re-render). Limbs animate per
// state: a swing cycle while walking, a tucked-legs/arms-up pose while
// airborne, and a gentle idle otherwise.
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
  const root = useRef<THREE.Group>(null)
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)

  const lastJump = useRef(jumpKey)
  const jumpStart = useRef(-Infinity)
  const facing = useRef(0)
  const stepAcc = useRef(0)
  const walkPhase = useRef(0)

  useFrame((state, delta) => {
    const g = root.current
    if (!g || !legL.current || !legR.current || !armL.current || !armR.current) return
    const d = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    const c = charRef.current

    // --- Movement from held keys (diagonals normalized) ---
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
    const bound = (half + 2) * PITCH
    c.x = THREE.MathUtils.clamp(c.x + vx * CHAR_SPEED * d, -bound, bound)
    c.z = THREE.MathUtils.clamp(c.z + vz * CHAR_SPEED * d, -bound, bound)

    const col = Math.round(c.x / PITCH + half)
    const row = Math.round(c.z / PITCH + half)
    c.valid = row >= 0 && row < size && col >= 0 && col < size
    c.row = c.valid ? row : -1
    c.col = c.valid ? col : -1

    // --- Jump arc ---
    if (jumpKey !== lastJump.current) {
      lastJump.current = jumpKey
      jumpStart.current = t
    }
    const p = (t - jumpStart.current) / JUMP_DUR
    const airborne = p >= 0 && p <= 1
    const arc = airborne ? Math.sin(p * Math.PI) : 0

    // --- Facing + footsteps ---
    const moving = len > 0
    if (moving) {
      facing.current = Math.atan2(vx, vz)
      if (!airborne) {
        stepAcc.current += d
        if (stepAcc.current >= STEP_INTERVAL) {
          stepAcc.current = 0
          play("step")
        }
      }
    }
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, facing.current, d * 12)

    // --- Limb pose targets (walk cycle / jump / idle) ---
    let legLX = 0
    let legRX = 0
    let armLX = 0
    let armRX = 0
    let armLZ = 0.08
    let armRZ = -0.08
    if (airborne) {
      legLX = -0.5
      legRX = -0.5
      armLZ = 2.4 // arms up in a V
      armRZ = -2.4
    } else if (moving && !disabled) {
      walkPhase.current += d * 9
      const swing = Math.sin(walkPhase.current)
      legLX = swing * 0.6
      legRX = -swing * 0.6
      armLX = -swing * 0.5
      armRX = swing * 0.5
      armLZ = 0
      armRZ = 0
    }

    const k = d * 16
    legL.current.rotation.x = THREE.MathUtils.lerp(legL.current.rotation.x, legLX, k)
    legR.current.rotation.x = THREE.MathUtils.lerp(legR.current.rotation.x, legRX, k)
    armL.current.rotation.x = THREE.MathUtils.lerp(armL.current.rotation.x, armLX, k)
    armR.current.rotation.x = THREE.MathUtils.lerp(armR.current.rotation.x, armRX, k)
    armL.current.rotation.z = THREE.MathUtils.lerp(armL.current.rotation.z, armLZ, k)
    armR.current.rotation.z = THREE.MathUtils.lerp(armR.current.rotation.z, armRZ, k)

    // --- Body transform: jump height, walk bob, jump squash/stretch ---
    const walkBob = moving && !airborne ? Math.abs(Math.sin(walkPhase.current)) * 0.03 : 0
    g.position.set(c.x, STAND_Y + arc * JUMP_HEIGHT + walkBob, c.z)
    const squash = 1 + arc * 0.12
    g.scale.set(1 / squash, squash, 1 / squash)
  })

  return (
    <group ref={root} position={[charRef.current.x, STAND_Y, charRef.current.z]}>
      {/* Legs (pivot at the hip, box hangs below). */}
      <group ref={legL} position={[-0.08, LEG_H, 0]}>
        <mesh position={[0, -LEG_H / 2, 0]}>
          <boxGeometry args={[0.12, LEG_H, 0.14]} />
          <meshStandardMaterial color={OVERALL} emissive={OVERALL} emissiveIntensity={0.25} roughness={0.6} />
        </mesh>
        <mesh position={[0, -LEG_H + 0.02, 0.02]}>
          <boxGeometry args={[0.14, 0.07, 0.2]} />
          <meshStandardMaterial color={SHOE} roughness={0.7} />
        </mesh>
      </group>
      <group ref={legR} position={[0.08, LEG_H, 0]}>
        <mesh position={[0, -LEG_H / 2, 0]}>
          <boxGeometry args={[0.12, LEG_H, 0.14]} />
          <meshStandardMaterial color={OVERALL} emissive={OVERALL} emissiveIntensity={0.25} roughness={0.6} />
        </mesh>
        <mesh position={[0, -LEG_H + 0.02, 0.02]}>
          <boxGeometry args={[0.14, 0.07, 0.2]} />
          <meshStandardMaterial color={SHOE} roughness={0.7} />
        </mesh>
      </group>

      {/* Torso. */}
      <mesh position={[0, LEG_H + TORSO_H / 2, 0]}>
        <boxGeometry args={[0.34, TORSO_H, 0.22]} />
        <meshStandardMaterial color={CAP} emissive={CAP} emissiveIntensity={0.3} roughness={0.5} />
      </mesh>
      {/* Overall bib on the chest. */}
      <mesh position={[0, LEG_H + TORSO_H / 2 - 0.04, 0.115]}>
        <boxGeometry args={[0.2, 0.18, 0.02]} />
        <meshStandardMaterial color={OVERALL} emissive={OVERALL} emissiveIntensity={0.25} roughness={0.6} />
      </mesh>

      {/* Arms (pivot at the shoulder). */}
      <group ref={armL} position={[-0.21, LEG_H + TORSO_H - 0.03, 0]}>
        <mesh position={[0, -0.11, 0]}>
          <boxGeometry args={[0.1, 0.22, 0.12]} />
          <meshStandardMaterial color={CAP} emissive={CAP} emissiveIntensity={0.3} roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.23, 0]}>
          <boxGeometry args={[0.11, 0.08, 0.13]} />
          <meshStandardMaterial color={SKIN} roughness={0.6} />
        </mesh>
      </group>
      <group ref={armR} position={[0.21, LEG_H + TORSO_H - 0.03, 0]}>
        <mesh position={[0, -0.11, 0]}>
          <boxGeometry args={[0.1, 0.22, 0.12]} />
          <meshStandardMaterial color={CAP} emissive={CAP} emissiveIntensity={0.3} roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.23, 0]}>
          <boxGeometry args={[0.11, 0.08, 0.13]} />
          <meshStandardMaterial color={SKIN} roughness={0.6} />
        </mesh>
      </group>

      {/* Head + cap + face (front faces +Z). */}
      <group position={[0, LEG_H + TORSO_H, 0]}>
        <mesh position={[0, 0.13, 0]}>
          <boxGeometry args={[0.28, 0.26, 0.26]} />
          <meshStandardMaterial color={SKIN} emissive={SKIN} emissiveIntensity={0.15} roughness={0.6} />
        </mesh>
        {/* Cap dome + brim. */}
        <mesh position={[0, 0.29, 0]}>
          <boxGeometry args={[0.32, 0.12, 0.3]} />
          <meshStandardMaterial color={CAP} emissive={CAP} emissiveIntensity={0.35} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.25, 0.18]}>
          <boxGeometry args={[0.3, 0.05, 0.14]} />
          <meshStandardMaterial color={CAP} emissive={CAP} emissiveIntensity={0.35} roughness={0.5} />
        </mesh>
        {/* Eyes. */}
        <mesh position={[0.06, 0.15, 0.135]}>
          <boxGeometry args={[0.04, 0.06, 0.02]} />
          <meshBasicMaterial color={DARK} toneMapped={false} />
        </mesh>
        <mesh position={[-0.06, 0.15, 0.135]}>
          <boxGeometry args={[0.04, 0.06, 0.02]} />
          <meshBasicMaterial color={DARK} toneMapped={false} />
        </mesh>
        {/* Mustache. */}
        <mesh position={[0, 0.07, 0.135]}>
          <boxGeometry args={[0.18, 0.04, 0.03]} />
          <meshBasicMaterial color={DARK} toneMapped={false} />
        </mesh>
      </group>

      <pointLight position={[0, 0.6, 0.3]} intensity={6} distance={3.5} color="#fff2e0" />
    </group>
  )
}
