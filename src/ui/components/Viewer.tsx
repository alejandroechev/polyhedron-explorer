import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import type { Polyhedron } from '../../domain/geometry/polyhedron'
import { passagePosition, type RupertPassage } from '../../domain/geometry/rupert'
import { buildRupertObjects } from '../../render/rupertMesh'
import {
  buildPolyhedronObjects,
  type RenderOptions,
} from '../../render/polyhedronMesh'

interface ViewerProps {
  readonly polyhedron: Polyhedron | null
  readonly options: RenderOptions
  readonly autoRotate: boolean
  readonly passage?: RupertPassage
  readonly passagePaused: boolean
  readonly onResetRef?: (reset: () => void) => void
}

/**
 * The 3D view. The scene, renderer and controls live for the lifetime of the
 * component; only the model group is rebuilt when the polyhedron or the
 * render options change, so switching models stays instant.
 */
export default function Viewer({
  polyhedron,
  options,
  autoRotate,
  passage,
  passagePaused,
  onResetRef,
}: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const travellerRef = useRef<THREE.Group | null>(null)
  const elapsedRef = useRef(0)
  const pausedRef = useRef(passagePaused)
  const modelRef = useRef<{ group: THREE.Group; dispose(): void } | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0b1020)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 100)
    cameraRef.current = camera
    camera.position.set(2.6, 1.9, 2.9)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.rotateSpeed = 0.9
    controls.minDistance = 1.2
    controls.maxDistance = 14
    controls.enablePan = false
    controlsRef.current = controls

    scene.add(new THREE.AmbientLight(0xffffff, 0.55))
    const key = new THREE.DirectionalLight(0xffffff, 1.6)
    key.position.set(4, 6, 5)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0x9db9ff, 0.7)
    fill.position.set(-5, -3, -4)
    scene.add(fill)
    const rim = new THREE.DirectionalLight(0xffd9a0, 0.5)
    rim.position.set(0, -6, 3)
    scene.add(rim)

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container
      if (w === 0 || h === 0) return
      // updateStyle must stay on, otherwise the canvas keeps its intrinsic
      // size and overflows the container.
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)

    let frame = 0
    let previous = performance.now()
    const tick = (now = performance.now()) => {
      frame = requestAnimationFrame(tick)
      const delta = Math.min((now - previous) / 1000, 0.1)
      previous = now
      if (!pausedRef.current) elapsedRef.current += delta
      if (travellerRef.current) travellerRef.current.position.z = passagePosition(elapsedRef.current)
      controls.update()
      renderer.render(scene, camera)
    }
    tick()

    onResetRef?.(() => {
      camera.position.set(2.6, 1.9, 2.9)
      if (travellerRef.current) {
        const halfFov = Math.atan(Math.tan(Math.PI / 8) * Math.min(1, camera.aspect))
        camera.position.setLength(3.7 / Math.sin(halfFov) * 1.1)
      }
      controls.target.set(0, 0, 0)
      controls.update()
    })

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()
      modelRef.current?.dispose()
      modelRef.current = null
      renderer.dispose()
      container.removeChild(renderer.domElement)
      sceneRef.current = null
      controlsRef.current = null
      cameraRef.current = null
      travellerRef.current = null
    }
  }, [onResetRef])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    travellerRef.current = null
    if (modelRef.current) {
      scene.remove(modelRef.current.group)
      modelRef.current.dispose()
      modelRef.current = null
    }
    if (!polyhedron) return
    const rupertObjects = passage ? buildRupertObjects(passage, options) : null
    const objects = rupertObjects ?? buildPolyhedronObjects(polyhedron, options)
    if (rupertObjects) {
      travellerRef.current = rupertObjects.traveller
      rupertObjects.traveller.position.z = passagePosition(elapsedRef.current)
    }
    scene.add(objects.group)
    modelRef.current = objects
  }, [polyhedron, options, passage])

  useEffect(() => {
    elapsedRef.current = 0
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return
    const halfFov = Math.atan(Math.tan(Math.PI / 8) * Math.min(1, camera.aspect))
    controls.maxDistance = passage ? 40 : 14
    camera.position.setLength(passage ? 3.7 / Math.sin(halfFov) * 1.1 : Math.hypot(2.6, 1.9, 2.9))
    controls.update()
  }, [passage])

  useEffect(() => {
    pausedRef.current = passagePaused
  }, [passagePaused])

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    controls.autoRotate = autoRotate
    controls.autoRotateSpeed = 1.6
  }, [autoRotate])

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={containerRef} className="h-full w-full" />
      {passage && (
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-lg bg-slate-950/85 px-3 py-2 text-xs text-slate-300">
          <span className="text-sky-300">Blue: pierced original</span>
          {' / '}
          <span className="text-sky-200/70">Translucent: uncarved original</span>
          {' / '}
          <span className="text-amber-300">Amber: equal-sized copy</span>
          <p className="mt-1">Drag to orbit; scroll or pinch to zoom. {passagePaused ? 'Passage paused.' : 'Passage repeats in both directions.'}</p>
        </div>
      )}
    </div>
  )
}
