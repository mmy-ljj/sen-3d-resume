import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useReducedMotion } from 'framer-motion'
import * as THREE from 'three'
import { useStore } from '../store'

const cyan = '#67dce9'
const blue = '#427fcb'

// Camera-relative laboratory props remain in the margins as the resume camera travels.
export default function SimulationEnvironment() {
  const root = useRef<THREE.Group>(null)
  const left = useRef<THREE.Group>(null)
  const right = useRef<THREE.Group>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const reducedMotion = useReducedMotion()
  const visible = useStore((s) => s.simulationVisible)
  const aim = useStore((s) => s.gestureAim)
  const { camera, size } = useThree()

  useEffect(() => {
    const move = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = 1 - (event.clientY / window.innerHeight) * 2
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])

  useFrame(({ clock }, delta) => {
    if (!root.current || !left.current || !right.current) return
    root.current.position.copy(camera.position)
    root.current.quaternion.copy(camera.quaternion)
    const margin = size.width < 700 ? 3.4 : 6.1
    left.current.position.x = -margin
    right.current.position.x = margin
    if (reducedMotion) return
    const x = Math.abs(aim.x) > 0.03 ? aim.x : pointer.current.x
    const y = Math.abs(aim.y) > 0.03 ? aim.y : pointer.current.y
    const damping = 1 - Math.exp(-delta * 2.8)
    left.current.rotation.y += ((-0.18 + x * 0.2) - left.current.rotation.y) * damping
    right.current.rotation.y += ((0.2 + x * 0.2) - right.current.rotation.y) * damping
    left.current.rotation.x += ((-0.22 - y * 0.13) - left.current.rotation.x) * damping
    right.current.rotation.x += ((0.16 - y * 0.13) - right.current.rotation.x) * damping
    const pulse = Math.sin(clock.elapsedTime * 0.8) * 0.12
    left.current.position.y = 0.5 + pulse
    right.current.position.y = -0.3 - pulse
  })

  if (!visible) return null

  return (
    <group ref={root}>
      {/* Digital twin: a translucent machine core within measurement orbits. */}
      <group ref={left} position={[-6.1, 0.5, -19]}>
        <mesh rotation={[0.4, 0.2, 0]}>
          <icosahedronGeometry args={[1.12, 1]} />
          <meshBasicMaterial color={cyan} wireframe transparent opacity={0.32} depthWrite={false} />
        </mesh>
        <mesh scale={0.72}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={blue} transparent opacity={0.19} depthWrite={false} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[i * 0.55, i * 0.7, i * 0.35]}>
            <torusGeometry args={[1.6 + i * 0.27, 0.012, 6, 72]} />
            <meshBasicMaterial color={i === 1 ? blue : cyan} transparent opacity={0.38 - i * 0.05} depthWrite={false} />
          </mesh>
        ))}
        <mesh position={[0, -1.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.23, 72]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.34} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>

      {/* Calibration volume: stacked coordinate frames and a projected scan cone. */}
      <group ref={right} position={[6.1, -0.3, -19]}>
        <mesh>
          <boxGeometry args={[2.2, 2.2, 2.2]} />
          <meshBasicMaterial color={cyan} wireframe transparent opacity={0.3} depthWrite={false} />
        </mesh>
        <mesh rotation={[0.35, 0.65, 0.2]}>
          <boxGeometry args={[1.42, 1.42, 1.42]} />
          <meshBasicMaterial color={blue} wireframe transparent opacity={0.5} depthWrite={false} />
        </mesh>
        <mesh position={[0, -1.76, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.7, 64]} />
          <meshBasicMaterial color={cyan} wireframe transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[(i % 2 ? 1 : -1) * 1.35, (i < 2 ? 1 : -1) * 1.35, 0]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshBasicMaterial color={cyan} transparent opacity={0.75} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
