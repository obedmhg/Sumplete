"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { COLORS } from "./constants"

const COUNT = 160
const LIFE = 1.6

// One-shot particle explosion. Bump `fire` (e.g. a win counter) to replay it.
export function Burst({ fire, origin = [0, 0.5, 0] }: { fire: number; origin?: [number, number, number] }) {
  const points = useRef<THREE.Points>(null)
  const age = useRef(Infinity)
  const lastFire = useRef(fire)

  const positions = useMemo(() => new Float32Array(COUNT * 3), [])
  const velocities = useMemo(() => {
    const v = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const speed = 2 + Math.random() * 4
      v[i * 3] = Math.sin(phi) * Math.cos(theta) * speed
      v[i * 3 + 1] = Math.abs(Math.cos(phi)) * speed + 1
      v[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed
    }
    return v
  }, [])

  useFrame((_, delta) => {
    if (!points.current) return
    if (fire !== lastFire.current) {
      lastFire.current = fire
      age.current = 0
      positions.fill(0)
    }
    const mat = points.current.material as THREE.PointsMaterial
    if (age.current < LIFE) {
      const d = Math.min(delta, 0.05)
      age.current += d
      for (let i = 0; i < COUNT; i++) {
        positions[i * 3] += velocities[i * 3] * d
        positions[i * 3 + 1] += (velocities[i * 3 + 1] - age.current * 5) * d
        positions[i * 3 + 2] += velocities[i * 3 + 2] * d
      }
      points.current.geometry.attributes.position.needsUpdate = true
      mat.opacity = Math.max(0, 1 - age.current / LIFE)
      points.current.visible = true
    } else {
      points.current.visible = false
    }
  })

  return (
    <points ref={points} visible={false} position={origin}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={COLORS.green} size={0.18} transparent toneMapped={false} depthWrite={false} />
    </points>
  )
}
