import * as THREE from 'three'
import Stats from 'stats.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'

import WebGL from 'three/addons/capabilities/WebGL.js'
if (!WebGL.isWebGL2Available()) document.body.appendChild(WebGL.getWebGL2ErrorMessage())

// ── Stats ──

export const stats = new Stats()
stats.dom.id = 'statsjs'
document.getElementById('canvas-container')!.appendChild(stats.dom)

// ── Renderer (sized by container via ResizeObserver) ──

const canvasContainer = document.getElementById('canvas-container')!

export const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
renderer.setPixelRatio(window.devicePixelRatio)
renderer.domElement.style.display = 'block'
canvasContainer.appendChild(renderer.domElement)

const initRect = canvasContainer.getBoundingClientRect()
renderer.setSize(initRect.width, initRect.height)

// ── Camera ──

const cameraTarget = new THREE.Vector3(0, 0.4, 0)
export const camera = new THREE.PerspectiveCamera(45, initRect.width / initRect.height, 0.01, 1000)
camera.position.set(1, 1, 1)
camera.lookAt(cameraTarget)

// ── Orbit Controls ──

export const orbitControls = new OrbitControls(camera, renderer.domElement)
orbitControls.target = cameraTarget
orbitControls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.DOLLY }
orbitControls.screenSpacePanning = true
orbitControls.zoomSpeed = 0.8
orbitControls.update()

// ── Scene ──

export const scene = new THREE.Scene()

// ── Resize: driven by container, not window math ──

new ResizeObserver((entries) => {
  for (const entry of entries) {
    const { width, height } = entry.contentRect
    if (width > 0 && height > 0) {
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
  }
}).observe(canvasContainer)

// ── Axis helper ──

export const axis = new THREE.AxesHelper(1)
;(axis.material as THREE.LineBasicMaterial).depthTest = false
axis.renderOrder = 1

// ── Grid ──

export const grid = (() => {
  const size = 10
  const divisions = 10
  const step = size / divisions
  const half = size / 2
  const positions: number[] = []
  for (let i = 0; i <= divisions; i++) {
    const pos = -half + i * step
    positions.push(-half, 0, pos, half, 0, pos)
    positions.push(pos, 0, -half, pos, 0, half)
  }
  const geo = new LineSegmentsGeometry()
  geo.setPositions(positions)
  const mat = new LineMaterial({ color: 0x3a3f48, linewidth: 0.008, worldUnits: true })
  return new LineSegments2(geo, mat)
})()

// ── Lights ──

scene.add(new THREE.AmbientLight(0xffffff, 2.0))

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5)
directionalLight.castShadow = true
directionalLight.position.set(5, 10, 7)
const shadowCameraSize = 2
directionalLight.shadow.camera.far = 50
directionalLight.shadow.camera.bottom = -shadowCameraSize
directionalLight.shadow.camera.left = -shadowCameraSize
directionalLight.shadow.camera.right = shadowCameraSize
directionalLight.shadow.camera.top = shadowCameraSize
scene.add(directionalLight)

const fillLight = new THREE.DirectionalLight(0xffffff, 1.0)
fillLight.position.set(-5, 5, -5)
scene.add(fillLight)

// ── Shadow plane ──

export const shadowPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.ShadowMaterial({ opacity: 0.4 }),
)
shadowPlane.receiveShadow = true
shadowPlane.rotateX(-90 * THREE.MathUtils.DEG2RAD)
scene.add(shadowPlane)

// ── Theme ──

export function applySceneTheme(theme: 'dark' | 'light') {
  const isDark = theme === 'dark'
  renderer.setClearColor(isDark ? 0x0f1114 : 0xe8eaed)
  ;(grid.material as LineMaterial).color.set(isDark ? 0x3a3f48 : 0xb0b4bc)
}
