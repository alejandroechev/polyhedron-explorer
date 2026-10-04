import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import type { Polyhedron } from '../../domain/geometry/polyhedron'
import {
  buildPolyhedronObjects,
  type RenderOptions,
} from '../../render/polyhedronMesh'

interface ViewerProps {
  readonly polyhedron: Polyhedron | null
  readonly options: RenderOptions
  readonly autoRotate: boolean
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
  onResetRef,
}: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const modelRef = useRef<{ group: THREE.Group; dispose(): void } | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0b1020)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 100)
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
    const tick = () => {
      frame = requestAnimationFrame(tick)
      controls.update()
      renderer.render(scene, camera)
    }
    tick()

    onResetRef?.(() => {
      camera.position.set(2.6, 1.9, 2.9)
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
    }
  }, [onResetRef])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    if (modelRef.current) {
      scene.remove(modelRef.current.group)
      modelRef.current.dispose()
      modelRef.current = null
    }
    if (!polyhedron) return
    const objects = buildPolyhedronObjects(polyhedron, options)
    scene.add(objects.group)
    modelRef.current = objects
  }, [polyhedron, options])

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    controls.autoRotate = autoRotate
    controls.autoRotateSpeed = 1.6
  }, [autoRotate])

  return <div ref={containerRef} className="relative h-full w-full overflow-hidden" />
}
