import { IkSolverEnum, type IkSolverType } from './IkSolver.ts'
import { Robot, type ColladaResult } from './Robot.ts'

import WebGL from 'three/addons/capabilities/WebGL.js'
if (!WebGL.isWebGL2Available()) document.body.appendChild(WebGL.getWebGL2ErrorMessage())

import FileSaver from 'file-saver'
import JSZip from 'jszip'
import JSZipUtils from 'jszip-utils'
import * as THREE from 'three'
import { Tween, Easing, Group } from '@tweenjs/tween.js'
const tweenGroup = new Group()
import Stats from 'stats.js'

import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { STLExporter } from 'three/addons/exporters/STLExporter.js'
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js'
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js'

import colladaRobotsList from './ColladaRobotsList.ts'
import type { RobotModel } from './ColladaRobotsList.ts'

// ── DOM helpers ──

function $<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T
}

function checkbox(id: string): HTMLInputElement {
  return $(id) as HTMLInputElement
}

// ── Stats ──

const stats = new Stats()
stats.dom.id = 'statsjs'
document.body.appendChild(stats.dom)

// ── Renderer (sized by container via ResizeObserver) ──

const canvasContainer = $('canvas-container')

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
renderer.setClearColor(0x0f1114)
renderer.setPixelRatio(window.devicePixelRatio)
canvasContainer.appendChild(renderer.domElement)

// Initial size sync before ResizeObserver kicks in
const initRect = canvasContainer.getBoundingClientRect()
renderer.setSize(initRect.width, initRect.height)

// Camera
const cameraTarget = new THREE.Vector3(0, 0.4, 0)
const camera = new THREE.PerspectiveCamera(75, initRect.width / initRect.height, 0.01, 1000)
camera.position.set(1, 1, 1)
camera.lookAt(cameraTarget)

// Orbit Controls
const orbitControls = new OrbitControls(camera, renderer.domElement)
orbitControls.target = cameraTarget
orbitControls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.DOLLY }
orbitControls.screenSpacePanning = true
orbitControls.zoomSpeed = 0.8

// Scene
const scene = new THREE.Scene()

// ── Resize: driven by container, not window math ──

function handleResize(width: number, height: number) {
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const { width, height } = entry.contentRect
    if (width > 0 && height > 0) {
      handleResize(width, height)
    }
  }
})
resizeObserver.observe(canvasContainer)

// ── Global state ──

let castShadows = false
let robot: Robot
let rawPoints: THREE.Vector3[][] = [[], [], [], []]
let showEllipsoids = false
let ikSolver: IkSolverType = IkSolverEnum.OFF
let ikGoal: THREE.Mesh
let ikGoalControl: InstanceType<typeof TransformControls>
let ikGoalControlHelper: THREE.Object3D

// ── Sidebar ──

const sidebar = $('sidebar')
const menuToggle = $('menu-toggle')
const sidebarOverlay = $('sidebar-overlay')
const sidebarCollapse = $('sidebar-collapse')

menuToggle.addEventListener('click', () => {
  if (document.body.classList.contains('sidebar-collapsed')) {
    document.body.classList.remove('sidebar-collapsed')
  } else {
    sidebar.classList.toggle('open')
    sidebarOverlay.classList.toggle('visible')
  }
})

sidebarOverlay.addEventListener('click', hideSidebar)

sidebarCollapse.addEventListener('click', () => {
  document.body.classList.toggle('sidebar-collapsed')
})

function hideSidebar() {
  sidebar.classList.remove('open')
  sidebarOverlay.classList.remove('visible')
}

// ── Modals ──

const loaderModal = $<HTMLDialogElement>('loader-modal')
const shortcutsModal = $<HTMLDialogElement>('shortcuts-modal')

loaderModal.addEventListener('cancel', (e) => e.preventDefault())

$('shortcuts-close').addEventListener('click', () => shortcutsModal.close())
$('shortcuts-btn').addEventListener('click', () => shortcutsModal.showModal())

shortcutsModal.addEventListener('click', (e) => {
  if (e.target === shortcutsModal) shortcutsModal.close()
})

// ── View Options ──

const axis = new THREE.AxesHelper(1)
const axisSwitch = checkbox('axis-switch')
axisSwitch.addEventListener('change', () => {
  if (axisSwitch.checked) { scene.add(axis) } else { scene.remove(axis) }
})

const grid = new THREE.GridHelper(10)
grid.material.color.setHex(0x333840)
grid.material.opacity = 0.6
grid.material.transparent = true

const gridSwitch = checkbox('grid-switch')
gridSwitch.addEventListener('change', () => {
  if (gridSwitch.checked) { scene.add(grid) } else { scene.remove(grid) }
})
gridSwitch.checked = true
gridSwitch.dispatchEvent(new Event('change'))

const shadowsSwitch = checkbox('shadows-switch')
shadowsSwitch.addEventListener('change', () => {
  castShadows = shadowsSwitch.checked
  updateShadowsState()
})

const statsEl = $('statsjs')
statsEl.style.display = 'none'
const statsSwitch = checkbox('stats-switch')
statsSwitch.addEventListener('change', () => {
  statsEl.style.display = statsSwitch.checked ? '' : 'none'
})

// ── Commands ──

$('reset-button').addEventListener('click', () => {
  console.log(`Moving robot to 'home' position...`)
  moveFromTo(robot.configuration, robot.zeroConfiguration, 1000, Easing.Quadratic.Out).start()
})

$('random-button').addEventListener('click', () => {
  console.log('Moving robot to random position...')
  moveFromTo(robot.configuration, robot.randomConfiguration, 1000, Easing.Quadratic.Out).start()
})

const pointCloudsInScene: THREE.Points[] = []

const pointsMaterials = [
  new THREE.PointsMaterial({ color: 0xff0000, transparent: true, opacity: 0.5, size: 0.01 }),
  new THREE.PointsMaterial({ color: 0xff00ff, transparent: true, opacity: 0.5, size: 0.01 }),
  new THREE.PointsMaterial({ color: 0xffff00, transparent: true, opacity: 0.5, size: 0.01 }),
  new THREE.PointsMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5, size: 0.01 })
]

$('reachability-button').addEventListener('click', () => {
  while (pointCloudsInScene.length) { scene.remove(pointCloudsInScene.shift()!) }

  const q_backup = robot.configuration

  for (let i = 0; i < 1e4; i++) {
    robot.configuration = robot.randomConfiguration

    for (let j = 0; j < robot.tipLinks.length; j++) {
      const point = new THREE.Vector3()
      point.setFromMatrixPosition(robot.getLinkPose(robot.tipLinks[j]))
      rawPoints[j].push(point)
    }
  }

  robot.configuration = q_backup

  let totalPoints = 0
  for (let j = 0; j < robot.tipLinks.length; j++) {
    totalPoints += rawPoints[j].length

    const geometry = new THREE.BufferGeometry().setFromPoints(rawPoints[j])
    const pointCloud = new THREE.Points(geometry, pointsMaterials[j])

    scene.add(pointCloud)
    pointCloudsInScene.push(pointCloud)
  }

  console.log(`The cloud now has ${totalPoints} particles.`)
})

$('clear-clouds-button').addEventListener('click', () => {
  rawPoints = [[], [], [], []]
  while (pointCloudsInScene.length) { scene.remove(pointCloudsInScene.shift()!) }

  let totalPoints = 0
  for (let j = 0; j < robot.tipLinks.length; j++) {
    totalPoints += rawPoints[j].length
  }

  console.log(`The cloud now has ${totalPoints} particles.`)
})

// ── Inverse Kinematics ──

const pseudoInverseSwitch = checkbox('pseudo-inverse-switch')
pseudoInverseSwitch.addEventListener('change', () => {
  ikSolver = pseudoInverseSwitch.checked ? IkSolverEnum.PSEUDO_INVERSE : IkSolverEnum.OFF
  if (ikSolver !== IkSolverEnum.OFF && robot) {
    const pose = robot.getLinkPose(robot.tipLinks[0])
    ikGoal.position.setFromMatrixPosition(pose)
    ikGoal.quaternion.setFromRotationMatrix(pose)
    ikGoalControl.setMode('translate')
    ikGoalControl.setSpace('local')
  }
})

const ellipsoidsSwitch = checkbox('vel-force-ellipsoids-switch')
ellipsoidsSwitch.addEventListener('change', () => {
  showEllipsoids = ellipsoidsSwitch.checked
  if (robot) {
    robot.showEllipsoids = showEllipsoids
    if (showEllipsoids) {
      robot.updateForceEllipsoid()
      robot.updateVelocityEllipsoid()
    } else {
      const fe = scene.getObjectByName('force-ellipsoid'); if (fe) scene.remove(fe)
      const ve = scene.getObjectByName('velocity-ellipsoid'); if (ve) scene.remove(ve)
      const ae = scene.getObjectByName('acceleration-ellipsoid'); if (ae) scene.remove(ae)
    }
  }
})

// ── Scene setup ──

function updateShadowsState () {
  plane.visible = castShadows
  robot.updateShadowsState(castShadows)
}

// Lights
const ambientLight = new THREE.AmbientLight(0xcccccc, 0.6)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
directionalLight.castShadow = true
directionalLight.position.set(20, 20, 0)
const shadowCameraSize = 2
directionalLight.shadow.camera.far = 50
directionalLight.shadow.camera.bottom = -shadowCameraSize
directionalLight.shadow.camera.left = -shadowCameraSize
directionalLight.shadow.camera.right = shadowCameraSize
directionalLight.shadow.camera.top = shadowCameraSize
scene.add(directionalLight)

// Shadow plane
const planeGeometry = new THREE.PlaneGeometry(10, 10)
const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.4 })
const plane = new THREE.Mesh(planeGeometry, planeMaterial)
plane.receiveShadow = true
plane.rotateX(-90 * THREE.MathUtils.DEG2RAD)
scene.add(plane)

// Sphere helpers
const sphereGeometry = new THREE.SphereGeometry(0.01)
const sphereMaterialRed = new THREE.MeshLambertMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 })
const sphereMaterialBlue = new THREE.MeshLambertMaterial({ color: 0x0000ff, transparent: true, opacity: 0.8 })

function _addSphereAtPose (pose: THREE.Matrix4) {
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterialRed)
  sphere.position.setFromMatrixPosition(pose)
  scene.add(sphere)
  console.log(`Added sphere at (${sphere.position.x}, ${sphere.position.y}, ${sphere.position.z})`)
}

function addSphereAtXYZ (x: number, y: number, z: number) {
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterialBlue)
  sphere.position.set(x, y, z)
  console.log(`Added sphere at (${x}, ${y}, ${z})`)
  return sphere
}

// ── Animation loop ──

requestAnimationFrame(animate)
function animate (time: number) {
  requestAnimationFrame(animate)

  if (ikSolver === IkSolverEnum.OFF) {
    if (scene.getObjectByName('ikGoal')) { scene.remove(ikGoal) }
    if (scene.getObjectByName('ikGoalControl')) {
      ikGoalControl.detach()
      scene.remove(ikGoalControlHelper)
    }
  } else {
    if (!scene.getObjectByName('ikGoal')) { scene.add(ikGoal) }
    if (!scene.getObjectByName('ikGoalControl')) {
      ikGoalControl.attach(ikGoal)
      scene.add(ikGoalControlHelper)
    }
  }

  pollGamepad()
  renderer.render(scene, camera)
  tweenGroup.update(time)
  stats.update()
}

// ── Model list ──

setupModelsList(colladaRobotsList)
function setupModelsList (models: RobotModel[]) {
  for (const model of models) {
    const brandSlug = model.brand.replace(/\s+/g, '-').toLowerCase()
    const container = document.querySelector(`#${brandSlug}-models`)!
    const li = document.createElement('li')
    li.id = model.id
    const a = document.createElement('a')
    a.href = '#!'
    a.textContent = model.name
    a.addEventListener('click', () => {
      loadModelZae(model.id)
      hideSidebar()
    })
    li.appendChild(a)
    container.appendChild(li)
  }
}

// ── Model loading ──

const loader = new ColladaLoader()
const modelsInScene: THREE.Group[] = []

async function addCollada (modelId: string, collada: ColladaResult) {
  const dae = collada.scene

  dae.traverse(function (child) {
    if (child instanceof THREE.Mesh) {
      ;(child.material as THREE.MeshStandardMaterial).flatShading = true
    }
  })

  dae.scale.x = dae.scale.y = dae.scale.z = 1.0
  dae.updateMatrix()

  while (modelsInScene.length) {
    scene.remove(modelsInScene.pop()!)
  }

  scene.add(dae)
  modelsInScene.push(dae)

  const tipLinks = colladaRobotsList.find(e => e.id === modelId)!.tipLinks

  robot = new Robot(scene, dae, collada, tipLinks)
  robot.id = modelId

  updateShadowsState()
}

function loadModelZae (modelId: string) {
  console.log(`Loading ${modelId}...`)

  document.querySelectorAll('#models-list li').forEach(el => el.classList.remove('active'))
  const activeEl = document.getElementById(modelId)
  if (activeEl) activeEl.classList.add('active')

  loaderModal.showModal()

  JSZipUtils.getBinaryContent(`${(import.meta as any).env.BASE_URL}collada-robots-collection/${modelId}.zae`, function (err: Error | null, data: ArrayBuffer) {
    if (err) throw err
    JSZip.loadAsync(data).then(function (zip) {
      zip.file(`${modelId}.dae`)!.async('string').then(function (content: string) {
        addCollada(modelId, loader.parse(content, '') as unknown as ColladaResult).then(function () {
          loaderModal.close()

          const model = colladaRobotsList.find(e => e.id === modelId)!

          $('hud-brand').textContent = model.brand ? model.brand : '--'
          $('hud-model').textContent = model.name ? model.name : '--'
          $('hud-reach').textContent = model.reach ? `${model.reach} m` : '--'
          $('hud-payload').textContent = model.payload ? `${model.payload} kg` : '--'
          $('hud-dof').textContent = model.dof ? String(model.dof) : '--'
        })
      })
    })
  })
}

// ── Keyboard shortcuts ──

const robotTweens: Tween<Record<string, number>>[] = []

window.addEventListener('keydown', function (event) {
  switch (event.key) {
    case 'c':
      console.log(`Motion keypoints deleted.`)
      robot.clearMotionKeypoints()
      break
    case 'k':
      console.log(`Motion keypoint recorded. (total = ${robot.motionKeypoints.length})`)
      robot.saveMotionKeypoint()
      break
    case 'p': {
      console.log('Executing keypoints motion...')
      robotTweens.length = 0
      let prevQ = robot.configuration
      for (const q of robot.motionKeypoints) {
        const tween = moveFromTo(prevQ, q.slice())
        if (robotTweens.length !== 0) { robotTweens[robotTweens.length - 1].chain(tween) }
        robotTweens.push(tween)
        prevQ = q.slice()
      }
      if (robotTweens.length !== 0) { robotTweens[0].start() }
      break
    }
    case 'q':
      ikGoalControl.setSpace(ikGoalControl.space === 'local' ? 'world' : 'local')
      break
    case 'r':
      ikGoalControl.setMode('rotate')
      ikGoalControl.setSpace('local')
      break
    case 't':
      ikGoalControl.setMode('translate')
      break
    case 'x':
      doConvexHullStuff()
      break
    case '?':
      if (shortcutsModal.open) {
        shortcutsModal.close()
      } else {
        shortcutsModal.showModal()
      }
      break
  }
})

function doConvexHullStuff () {
  const exporter = new STLExporter()
  const material = new THREE.MeshBasicMaterial({color: 0x00ff00})

  let rawPointsIdx = 0
  for (const link of robot.tipLinks) {
    const geometry = new ConvexGeometry(rawPoints[rawPointsIdx++])

    const stlscene = new THREE.Scene()
    stlscene.add(new THREE.Mesh(geometry, material))

    FileSaver.saveAs(new Blob([ exporter.parse(stlscene) ], { type: 'text/plain' }), `${link}.stl`)
  }
}

// ── Motion ──

function moveFromTo (q_s: number[], q_t: number[], duration = 10, easing: (t: number) => number = Easing.Linear.None) {
  const tweenStart: Record<string, number> = {}
  const tweenFinal: Record<string, number> = {}

  for (const joint of robot._joints) {
    tweenStart[joint] = q_s.shift()!
    tweenFinal[joint] = q_t.shift()!
  }

  const tween = new Tween(tweenStart, tweenGroup).to(tweenFinal, duration).easing(easing)

  tween.onUpdate(function (obj) {
    for (const joint of robot._joints) { robot.setJointValue(joint, obj[joint]) }
    if (ikSolver !== IkSolverEnum.OFF) {
      const pose = robot.getLinkPose(robot.tipLinks[0])
      ikGoal.position.setFromMatrixPosition(pose)
      ikGoal.quaternion.setFromRotationMatrix(pose)
    }
    if (robot.showEllipsoids) {
      robot.updateForceEllipsoid()
      robot.updateVelocityEllipsoid()
    }
  })

  tween.onComplete(function () {
    console.log('Motion completed.')
  })

  return tween
}

// ── Gamepad ──

window.addEventListener('gamepadconnected', e => {
  console.log(`Controller ${e.gamepad.index} connected: ${e.gamepad.id}`)
})

window.addEventListener('gamepaddisconnected', e => {
  console.log(`Controller ${e.gamepad.index} disconnected: ${e.gamepad.id}`)
})

function pollGamepad () {
  const gamepads = navigator.getGamepads()
  for (const gp of gamepads) {
    if (!gp) continue
    const rx = gp.axes[2] || 0
    const ry = gp.axes[3] || 0
    const deadzone = 0.1
    if (Math.abs(rx) > deadzone || Math.abs(ry) > deadzone) {
      orbitControls.rotateLeft(rx * 0.05)
      orbitControls.rotateUp(ry * 0.03)
      orbitControls.update()
    }
  }
}

// ── Start ──

function main () {
  loadModelZae('abb_irb120_3_58')

  ikGoal = addSphereAtXYZ(0.4, 0.5, 0)
  ikGoal.name = 'ikGoal'

  ikGoalControl = new TransformControls(camera, renderer.domElement)
  ikGoalControlHelper = ikGoalControl.getHelper()
  ikGoalControlHelper.name = 'ikGoalControl'
  ikGoalControl.addEventListener('objectChange', function () {
    if (ikSolver !== IkSolverEnum.OFF) { robot.moveTipToPose(ikGoal, ikSolver) }
  })
  ikGoalControl.addEventListener('mouseDown', function () {
    orbitControls.enabled = false
  })
  ikGoalControl.addEventListener('mouseUp', function () {
    orbitControls.enabled = true
  })
}

main()
