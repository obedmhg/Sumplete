"use client"

import { useRef, type MutableRefObject } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { CHAR_SPEED, DEPTH, PITCH, type CharState } from "./constants"
import { characterById, type CharacterDef } from "./characters"
import { play } from "@/lib/sound"

// Limb segment lengths (world units; a tile is 1 unit wide).
const LEG_H = 0.22
const TORSO_H = 0.3
const STAND_Y = DEPTH / 2 // root sits at the character's feet, on the tile top
const JUMP_HEIGHT = 0.6
const JUMP_DUR = 0.42
const STEP_INTERVAL = 0.3

// Spikes for the "hedgehog/echidna" characters: a few cones fanned up and back.
function Spikes({ color, accent }: { color: string; accent?: string }) {
  const tip = accent ?? color
  const spikes: { pos: [number, number, number]; rot: [number, number, number]; len: number }[] = [
    { pos: [0, 0.34, -0.12], rot: [-0.9, 0, 0], len: 0.34 },
    { pos: [-0.13, 0.32, -0.1], rot: [-0.8, 0, 0.4], len: 0.3 },
    { pos: [0.13, 0.32, -0.1], rot: [-0.8, 0, -0.4], len: 0.3 },
    { pos: [0, 0.28, -0.18], rot: [-1.3, 0, 0], len: 0.26 },
  ]
  return (
    <>
      {spikes.map((s, i) => (
        <mesh key={i} position={s.pos} rotation={s.rot}>
          <coneGeometry args={[0.07, s.len, 5]} />
          <meshStandardMaterial color={i % 2 ? tip : color} emissive={color} emissiveIntensity={0.3} roughness={0.5} />
        </mesh>
      ))}
    </>
  )
}

// A chunky, boxy BrickHeadz-ish hopper. Geometry is fixed; colours + headgear
// come from the selected `character` def. Position is integrated from held arrow
// keys each frame (refs, no React re-render); limbs animate per state.
export function Character({
  charRef,
  heldRef,
  size,
  disabled,
  jumpKey,
  characterId,
}: {
  charRef: MutableRefObject<CharState>
  heldRef: MutableRefObject<Set<string>>
  size: number
  disabled: boolean
  jumpKey: number
  characterId?: string
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
  const fwd = useRef(new THREE.Vector3())

  const ch: CharacterDef = characterById(characterId)
  const hand = ch.hand ?? ch.skin
  const eye = ch.eye ?? "#1a1014"

  useFrame((state, delta) => {
    const g = root.current
    if (!g || !legL.current || !legR.current || !armL.current || !armR.current) return
    const d = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    const c = charRef.current

    // --- Movement from held keys, relative to the camera's facing ---
    // Up = away from the camera, Right = camera-right, so the controls stay
    // intuitive after the user orbits the view.
    let f = 0 // forward / back input
    let r = 0 // strafe input
    if (!disabled) {
      const held = heldRef.current
      if (held.has("ArrowLeft")) r -= 1
      if (held.has("ArrowRight")) r += 1
      if (held.has("ArrowUp")) f += 1
      if (held.has("ArrowDown")) f -= 1
    }

    // Camera forward + right projected onto the ground (XZ) plane.
    state.camera.getWorldDirection(fwd.current)
    fwd.current.y = 0
    fwd.current.normalize()
    const fx = fwd.current.x
    const fz = fwd.current.z
    // right = forward × up  =>  (-fz, 0, fx)
    let vx = fx * f - fz * r
    let vz = fz * f + fx * r
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
          <meshStandardMaterial color={ch.bib} emissive={ch.bib} emissiveIntensity={0.25} roughness={0.6} />
        </mesh>
        <mesh position={[0, -LEG_H + 0.02, 0.02]}>
          <boxGeometry args={[0.14, 0.07, 0.2]} />
          <meshStandardMaterial color={ch.shoe} roughness={0.7} />
        </mesh>
      </group>
      <group ref={legR} position={[0.08, LEG_H, 0]}>
        <mesh position={[0, -LEG_H / 2, 0]}>
          <boxGeometry args={[0.12, LEG_H, 0.14]} />
          <meshStandardMaterial color={ch.bib} emissive={ch.bib} emissiveIntensity={0.25} roughness={0.6} />
        </mesh>
        <mesh position={[0, -LEG_H + 0.02, 0.02]}>
          <boxGeometry args={[0.14, 0.07, 0.2]} />
          <meshStandardMaterial color={ch.shoe} roughness={0.7} />
        </mesh>
      </group>

      {/* Torso. */}
      <mesh position={[0, LEG_H + TORSO_H / 2, 0]}>
        <boxGeometry args={[0.34, TORSO_H, 0.22]} />
        <meshStandardMaterial color={ch.shirt} emissive={ch.shirt} emissiveIntensity={0.3} roughness={0.5} />
      </mesh>
      {/* Chest panel / bib. */}
      <mesh position={[0, LEG_H + TORSO_H / 2 - 0.04, 0.115]}>
        <boxGeometry args={[0.2, 0.18, 0.02]} />
        <meshStandardMaterial color={ch.bib} emissive={ch.bib} emissiveIntensity={0.25} roughness={0.6} />
      </mesh>

      {/* Arms (pivot at the shoulder). */}
      <group ref={armL} position={[-0.21, LEG_H + TORSO_H - 0.03, 0]}>
        <mesh position={[0, -0.11, 0]}>
          <boxGeometry args={[0.1, 0.22, 0.12]} />
          <meshStandardMaterial color={ch.shirt} emissive={ch.shirt} emissiveIntensity={0.3} roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.23, 0]}>
          <boxGeometry args={[0.11, 0.08, 0.13]} />
          <meshStandardMaterial color={hand} roughness={0.6} />
        </mesh>
      </group>
      <group ref={armR} position={[0.21, LEG_H + TORSO_H - 0.03, 0]}>
        <mesh position={[0, -0.11, 0]}>
          <boxGeometry args={[0.1, 0.22, 0.12]} />
          <meshStandardMaterial color={ch.shirt} emissive={ch.shirt} emissiveIntensity={0.3} roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.23, 0]}>
          <boxGeometry args={[0.11, 0.08, 0.13]} />
          <meshStandardMaterial color={hand} roughness={0.6} />
        </mesh>
      </group>

      {/* Head + headgear + face (front faces +Z). */}
      <group position={[0, LEG_H + TORSO_H, 0]}>
        <mesh position={[0, 0.13, 0]}>
          <boxGeometry args={[0.28, 0.26, 0.26]} />
          <meshStandardMaterial color={ch.skin} emissive={ch.skin} emissiveIntensity={0.15} roughness={0.6} />
        </mesh>

        {/* Lighter muzzle patch on the lower front of the face (animal looks). */}
        {ch.muzzle && (
          <mesh position={[0, 0.07, 0.12]}>
            <boxGeometry args={[0.22, 0.12, 0.06]} />
            <meshStandardMaterial color={ch.muzzle} emissive={ch.muzzle} emissiveIntensity={0.15} roughness={0.6} />
          </mesh>
        )}

        {/* Headgear. */}
        {ch.capType === "cap" && (
          <>
            <mesh position={[0, 0.29, 0]}>
              <boxGeometry args={[0.32, 0.12, 0.3]} />
              <meshStandardMaterial color={ch.cap} emissive={ch.cap} emissiveIntensity={0.35} roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.25, 0.18]}>
              <boxGeometry args={[0.3, 0.05, 0.14]} />
              <meshStandardMaterial color={ch.cap} emissive={ch.cap} emissiveIntensity={0.35} roughness={0.5} />
            </mesh>
          </>
        )}
        {ch.capType === "straw" && (
          <>
            {/* Low dome + wide flat brim. */}
            <mesh position={[0, 0.31, 0]}>
              <boxGeometry args={[0.3, 0.1, 0.3]} />
              <meshStandardMaterial color={ch.cap} emissive={ch.cap} emissiveIntensity={0.25} roughness={0.7} />
            </mesh>
            {ch.capAccent && (
              <mesh position={[0, 0.28, 0]}>
                <boxGeometry args={[0.31, 0.03, 0.31]} />
                <meshStandardMaterial color={ch.capAccent} roughness={0.7} />
              </mesh>
            )}
            <mesh position={[0, 0.27, 0]}>
              <boxGeometry args={[0.56, 0.04, 0.56]} />
              <meshStandardMaterial color={ch.cap} emissive={ch.cap} emissiveIntensity={0.2} roughness={0.7} />
            </mesh>
          </>
        )}
        {ch.capType === "spikes" && <Spikes color={ch.cap} accent={ch.capAccent} />}

        {/* Eyes. */}
        <mesh position={[0.06, 0.15, 0.135]}>
          <boxGeometry args={[0.04, 0.06, 0.02]} />
          <meshBasicMaterial color={eye} toneMapped={false} />
        </mesh>
        <mesh position={[-0.06, 0.15, 0.135]}>
          <boxGeometry args={[0.04, 0.06, 0.02]} />
          <meshBasicMaterial color={eye} toneMapped={false} />
        </mesh>

        {/* Mustache. */}
        {ch.mustache && (
          <mesh position={[0, 0.07, 0.135]}>
            <boxGeometry args={[0.18, 0.04, 0.03]} />
            <meshBasicMaterial color="#1a1014" toneMapped={false} />
          </mesh>
        )}

        {/* Round clown nose. */}
        {ch.nose && (
          <mesh position={[0, 0.1, 0.16]}>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshStandardMaterial color={ch.nose} emissive={ch.nose} emissiveIntensity={0.4} roughness={0.4} />
          </mesh>
        )}
      </group>

      <pointLight position={[0, 0.6, 0.3]} intensity={6} distance={3.5} color="#fff2e0" />
    </group>
  )
}
