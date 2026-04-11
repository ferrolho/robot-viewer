import { scene, renderer, camera, orbitControls, stats, grid, axis, shadowPlane, applySceneTheme, frameCameraOn } from './scene.ts'
import { initGallery, setupCategoryChips, showBrandGrid } from './gallery.ts'
import { IkSolverEnum, Robot, robotKinematicsFromURDF } from './robotics/index.ts'
import { ModelLoader } from './ModelLoader.ts'
import { getLocale, setLocale, t, applyTranslations, LOCALES } from './i18n.ts'

import FileSaver from 'file-saver'
import * as THREE from 'three'
import { Tween, Easing, Group } from '@tweenjs/tween.js'
const tweenGroup = new Group()

import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { STLExporter } from 'three/addons/exporters/STLExporter.js'
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js'

const modelLoader = new ModelLoader()

// ── DOM helpers ──

function $<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T
}

function checkbox(id: string): HTMLInputElement {
  return $(id) as HTMLInputElement
}

// ── Global state ──

let castShadows = false
let robot: Robot
let rawPointChunks: Float32Array[][] = []
let showCenterOfMass = false
let showVelocityEllipsoid = false
let showForceEllipsoid = false
let showAccelerationEllipsoid = false
let showForcePolytope = false
let ikSolver = IkSolverEnum.OFF as typeof IkSolverEnum[keyof typeof IkSolverEnum]
let ikGoals: THREE.Mesh[] = []
let ikGoalControls: InstanceType<typeof TransformControls>[] = []
let ikGoalControlHelpers: THREE.Object3D[] = []

// ── Gizmo Toolbar ──

const gizmoToolbar = $('gizmo-toolbar')
const gizmoTranslateBtn = $<HTMLButtonElement>('gizmo-translate')
const gizmoRotateBtn = $<HTMLButtonElement>('gizmo-rotate')
const gizmoSpaceBtn = $<HTMLButtonElement>('gizmo-space')
const gizmoSpaceLabel = $('gizmo-space-label')

function syncGizmoToolbar() {
  const mode = ikGoalControls[0]?.mode ?? 'translate'
  const space = ikGoalControls[0]?.space ?? 'local'
  gizmoTranslateBtn.classList.toggle('active', mode === 'translate')
  gizmoRotateBtn.classList.toggle('active', mode === 'rotate')
  gizmoSpaceBtn.classList.toggle('active', space === 'world')
  gizmoSpaceLabel.textContent = t(space === 'local' ? 'gizmo.local' : 'gizmo.world')
}

function showGizmoToolbar(visible: boolean) {
  gizmoToolbar.classList.toggle('hidden', !visible)
}

gizmoTranslateBtn.addEventListener('click', () => {
  for (const ctrl of ikGoalControls) ctrl.setMode('translate')
  syncGizmoToolbar()
})

gizmoRotateBtn.addEventListener('click', () => {
  for (const ctrl of ikGoalControls) ctrl.setMode('rotate')
  syncGizmoToolbar()
})

gizmoSpaceBtn.addEventListener('click', () => {
  const newSpace = (ikGoalControls[0]?.space === 'local') ? 'world' : 'local'
  for (const ctrl of ikGoalControls) ctrl.setSpace(newSpace)
  syncGizmoToolbar()
})

// ── Theme ──

function getTheme(): 'dark' | 'light' {
  return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
}

function applyTheme(theme: 'dark' | 'light') {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
  applySceneTheme(theme)
}

applyTheme(getTheme())

$('theme-toggle').addEventListener('click', () => {
  applyTheme(getTheme() === 'dark' ? 'light' : 'dark')
})

// ── Language ──

const langToggle = $('lang-toggle')
const langMenu = $('lang-menu')
langToggle.textContent = LOCALES.find(l => l.code === getLocale())!.label
applyTranslations()

for (const locale of LOCALES) {
  const item = document.createElement('button')
  item.className = 'lang-menu-item'
  item.textContent = locale.label
  item.dataset.locale = locale.code
  if (locale.code === getLocale()) item.classList.add('active')
  item.addEventListener('click', () => {
    setLocale(locale.code)
    langToggle.textContent = locale.label
    langMenu.querySelectorAll('.lang-menu-item').forEach(el => el.classList.toggle('active', (el as HTMLElement).dataset.locale === locale.code))
    langMenu.classList.remove('open')
    setupCategoryChips()
    showBrandGrid()
    renderMath(capabilityModal)
  })
  langMenu.appendChild(item)
}

langToggle.addEventListener('click', (e) => {
  e.stopPropagation()
  langMenu.classList.toggle('open')
})

document.addEventListener('click', () => langMenu.classList.remove('open'))

// ── Sidebars ──

const sidebarLeft = $('sidebar-left')
const menuToggle = $('menu-toggle')
const sidebarOverlay = $('sidebar-overlay')
const sidebarLeftCollapse = $('sidebar-left-collapse')
const sidebarRightCollapse = $('sidebar-right-collapse')

menuToggle.addEventListener('click', () => {
  if (document.body.classList.contains('sidebar-left-collapsed')) {
    document.body.classList.remove('sidebar-left-collapsed')
  } else {
    sidebarRight.classList.remove('open')
    sidebarLeft.classList.toggle('open')
    sidebarOverlay.classList.toggle('visible')
  }
})

sidebarOverlay.addEventListener('click', hideSidebar)

sidebarLeftCollapse.addEventListener('click', () => {
  document.body.classList.toggle('sidebar-left-collapsed')
})

sidebarRightCollapse.addEventListener('click', () => {
  document.body.classList.toggle('sidebar-right-collapsed')
})

const sidebarRight = $('sidebar-right')

$('settings-toggle').addEventListener('click', () => {
  if (window.innerWidth <= 768) {
    sidebarLeft.classList.remove('open')
    sidebarRight.classList.toggle('open')
    sidebarOverlay.classList.toggle('visible')
  } else {
    document.body.classList.remove('sidebar-right-collapsed')
  }
})

function hideSidebar() {
  sidebarLeft.classList.remove('open')
  sidebarRight.classList.remove('open')
  sidebarOverlay.classList.remove('visible')
}

// ── Collapsible panel sections ──

document.querySelectorAll('#sidebar-right .panel-section .section-label').forEach(label => {
  label.addEventListener('click', () => {
    label.closest('.panel-section')!.classList.toggle('collapsed')
  })
})

// ── Modals ──

const loaderModal = $<HTMLDialogElement>('loader-modal')
const shortcutsModal = $<HTMLDialogElement>('shortcuts-modal')
const capabilityModal = $<HTMLDialogElement>('capability-modal')

loaderModal.addEventListener('cancel', (e) => e.preventDefault())

// ── Donate toast ──

const donateToast = $('donate-toast')
const DONATE_DISMISSED_KEY = 'robot-explorer-donate-dismissed'

if (!localStorage.getItem(DONATE_DISMISSED_KEY)) {
  setTimeout(() => { donateToast.hidden = false }, 10_000)
}

$('donate-close').addEventListener('click', () => {
  donateToast.hidden = true
  localStorage.setItem(DONATE_DISMISSED_KEY, '1')
})

$('shortcuts-close').addEventListener('click', () => shortcutsModal.close())
$('shortcuts-btn').addEventListener('click', () => shortcutsModal.showModal())
$('capability-close').addEventListener('click', () => capabilityModal.close())
$('capability-info-btn').addEventListener('click', () => {
  capabilityModal.showModal()
  renderMath(capabilityModal)
})

shortcutsModal.addEventListener('click', (e) => {
  if (e.target === shortcutsModal) shortcutsModal.close()
})

capabilityModal.addEventListener('click', (e) => {
  if (e.target === capabilityModal) capabilityModal.close()
})

/** Render all data-math attributes inside a container using KaTeX. */
function renderMath(root: HTMLElement) {
  if (typeof katex === 'undefined') return
  root.querySelectorAll<HTMLElement>('[data-math]').forEach(el => {
    if (el.dataset.mathRendered) return
    const tex = el.dataset.math!
    const displayMode = el.classList.contains('math-block')
    katex.render(tex, el, { displayMode, throwOnError: false })
    el.dataset.mathRendered = '1'
  })
}

// ── View Options ──

const axisSwitch = checkbox('axis-switch')
axisSwitch.addEventListener('change', () => {
  if (axisSwitch.checked) { scene.add(axis) } else { scene.remove(axis) }
})

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
let pointsMaterials: THREE.PointsMaterial[] = []

/** Generate evenly-spaced, visually distinct point cloud materials for n tip links. */
function buildPointsMaterials(n: number): THREE.PointsMaterial[] {
  const materials: THREE.PointsMaterial[] = []
  for (let i = 0; i < n; i++) {
    const hue = (i / n) * 360
    const color = new THREE.Color(`hsl(${hue}, 90%, 60%)`)
    materials.push(new THREE.PointsMaterial({ color, transparent: true, opacity: 0.5, size: 0.01 }))
  }
  return materials
}

function clearPointClouds() {
  const had = pointCloudsInScene.length > 0
  while (pointCloudsInScene.length) { scene.remove(pointCloudsInScene.shift()!) }
  rawPointChunks = robot ? robot.tipLinks.map(() => []) : []
  if (had) console.log('The cloud now has 0 particles.')
}

$('reachability-button').addEventListener('click', () => {
  while (pointCloudsInScene.length) { scene.remove(pointCloudsInScene.shift()!) }

  const nTips = robot.tipLinks.length
  if (pointsMaterials.length !== nTips) {
    pointsMaterials = buildPointsMaterials(nTips)
  }
  if (rawPointChunks.length !== nTips) {
    rawPointChunks = robot.tipLinks.map(() => [])
  }

  const start = performance.now()
  const newChunks = robot.computeReachability(1e5)
  console.log(`Reachability FK: ${(performance.now() - start).toFixed(1)} ms`)

  let totalPoints = 0
  for (let j = 0; j < robot.tipLinks.length; j++) {
    rawPointChunks[j].push(newChunks[j])

    // Concat all accumulated chunks into a single buffer
    const totalLen = rawPointChunks[j].reduce((s, c) => s + c.length, 0)
    const buf = new Float32Array(totalLen)
    let offset = 0
    for (const chunk of rawPointChunks[j]) { buf.set(chunk, offset); offset += chunk.length }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(buf, 3))
    const pointCloud = new THREE.Points(geometry, pointsMaterials[j])

    scene.add(pointCloud)
    pointCloudsInScene.push(pointCloud)

    totalPoints += totalLen / 3
  }

  console.log(`The cloud now has ${totalPoints} particles.`)
})

$('clear-clouds-button').addEventListener('click', clearPointClouds)

// ── Inverse Kinematics ──

const pseudoInverseSwitch = checkbox('pseudo-inverse-switch')
pseudoInverseSwitch.addEventListener('change', () => {
  ikSolver = pseudoInverseSwitch.checked ? IkSolverEnum.PSEUDO_INVERSE : IkSolverEnum.OFF
  if (ikSolver !== IkSolverEnum.OFF && robot) {
    setupIkGoals()
    for (let i = 0; i < ikGoals.length; i++) {
      const pose = robot.getLinkPose(robot.tipLinks[i])
      ikGoals[i].position.setFromMatrixPosition(pose)
      ikGoals[i].quaternion.setFromRotationMatrix(pose)
      ikGoalControls[i].setMode('translate')
      ikGoalControls[i].setSpace('local')
    }
    syncGizmoToolbar()
  }
  showGizmoToolbar(ikSolver !== IkSolverEnum.OFF)
})

const comSwitch = checkbox('com-switch')
comSwitch.addEventListener('change', () => {
  showCenterOfMass = comSwitch.checked
  if (robot) {
    robot.showCenterOfMass = showCenterOfMass
    if (showCenterOfMass) {
      robot.updateCenterOfMass()
    } else {
      const com = scene.getObjectByName('center-of-mass'); if (com) scene.remove(com)
    }
  }
})

const velocityEllipsoidSwitch = checkbox('velocity-ellipsoid-switch')
velocityEllipsoidSwitch.addEventListener('change', () => {
  showVelocityEllipsoid = velocityEllipsoidSwitch.checked
  if (robot) {
    robot.showVelocityEllipsoid = showVelocityEllipsoid
    if (showVelocityEllipsoid) {
      robot.updateVelocityEllipsoid()
    } else {
      const ve = scene.getObjectByName('velocity-ellipsoid'); if (ve) scene.remove(ve)
    }
  }
})

const forceEllipsoidSwitch = checkbox('force-ellipsoid-switch')
forceEllipsoidSwitch.addEventListener('change', () => {
  showForceEllipsoid = forceEllipsoidSwitch.checked
  if (robot) {
    robot.showForceEllipsoid = showForceEllipsoid
    if (showForceEllipsoid) {
      robot.updateForceEllipsoid()
    } else {
      const fe = scene.getObjectByName('force-ellipsoid'); if (fe) scene.remove(fe)
    }
  }
})

const accelEllipsoidSwitch = checkbox('accel-ellipsoid-switch')
accelEllipsoidSwitch.addEventListener('change', () => {
  showAccelerationEllipsoid = accelEllipsoidSwitch.checked
  if (robot) {
    robot.showAccelerationEllipsoid = showAccelerationEllipsoid
    if (showAccelerationEllipsoid) {
      robot.updateAccelerationEllipsoid()
    } else {
      const ae = scene.getObjectByName('acceleration-ellipsoid'); if (ae) scene.remove(ae)
    }
  }
})

const torqueWeightedSwitch = checkbox('torque-weighted-switch')
torqueWeightedSwitch.addEventListener('change', () => {
  if (robot) {
    robot.torqueWeightedEllipsoid = torqueWeightedSwitch.checked
    if (showForceEllipsoid) robot.updateForceEllipsoid()
  }
})

const forcePolytopeSwitch = checkbox('force-polytope-switch')
forcePolytopeSwitch.addEventListener('change', () => {
  showForcePolytope = forcePolytopeSwitch.checked
  if (robot) {
    robot.showForcePolytope = showForcePolytope
    if (showForcePolytope) {
      robot.updateForcePolytope()
    } else {
      const fp = scene.getObjectByName('force-polytope'); if (fp) scene.remove(fp)
    }
  }
})

// ── Shadows ──

function updateShadowsState() {
  shadowPlane.visible = castShadows
  robot.updateShadowsState(castShadows)
}

// ── Animation loop ──

requestAnimationFrame(animate)
function animate(time: number) {
  requestAnimationFrame(animate)

  if (ikSolver === IkSolverEnum.OFF) {
    for (let i = 0; i < ikGoals.length; i++) {
      if (scene.getObjectByName(`ikGoal-${i}`)) { scene.remove(ikGoals[i]) }
      if (scene.getObjectByName(`ikGoalControl-${i}`)) {
        ikGoalControls[i].detach()
        scene.remove(ikGoalControlHelpers[i])
      }
    }
  } else {
    for (let i = 0; i < ikGoals.length; i++) {
      if (!scene.getObjectByName(`ikGoal-${i}`)) { scene.add(ikGoals[i]) }
      if (!scene.getObjectByName(`ikGoalControl-${i}`)) {
        ikGoalControls[i].attach(ikGoals[i])
        scene.add(ikGoalControlHelpers[i])
      }
    }
  }

  pollGamepad()
  renderer.render(scene, camera)
  tweenGroup.update(time)
  stats.update()
}

// ── Model list ──

async function setupModelsList() {
  const manifest = await modelLoader.fetchManifest()
  initGallery(manifest.models, (id) => { loadModel(id); hideSidebar() })
}

setupModelsList()

// ── Model loading ──

const modelsInScene: THREE.Object3D[] = []

async function loadModel(modelId: string) {
  console.log(`Loading ${modelId}...`)

  document.querySelectorAll('#models-list li').forEach(el => el.classList.remove('active'))
  const activeEl = document.getElementById(modelId)
  if (activeEl) activeEl.classList.add('active')

  loaderModal.showModal()

  try {
    const urdfRobot = await modelLoader.loadRobot(modelId)

    // URDF uses Z-up (ROS convention), Three.js uses Y-up
    urdfRobot.rotation.x = -Math.PI / 2
    urdfRobot.updateMatrix()

    while (modelsInScene.length) {
      scene.remove(modelsInScene.pop()!)
    }

    scene.add(urdfRobot)
    modelsInScene.push(urdfRobot)

    const model = modelLoader.getModel(modelId)!
    const kinematics = robotKinematicsFromURDF(urdfRobot)

    // Remove stale visualizations and point clouds from previous robot
    clearPointClouds()
    for (const name of ['velocity-ellipsoid', 'force-ellipsoid', 'acceleration-ellipsoid', 'force-polytope', 'center-of-mass']) {
      const obj = scene.getObjectByName(name)
      if (obj) scene.remove(obj)
    }

    robot = new Robot(scene, urdfRobot, kinematics, model.tipLinks)
    robot.id = modelId
    robot.category = model.category

    // Sync toggle state from UI to new robot
    robot.showCenterOfMass = showCenterOfMass
    robot.showVelocityEllipsoid = showVelocityEllipsoid
    robot.showForceEllipsoid = showForceEllipsoid
    robot.showAccelerationEllipsoid = showAccelerationEllipsoid
    robot.showForcePolytope = showForcePolytope
    robot.updateVisualizations()

    updateShadowsState()
    frameCameraOn(modelId)
    setupIkGoals()

    // If IK is active, position goals at the new robot's end-effectors
    if (ikSolver !== IkSolverEnum.OFF) {
      for (let i = 0; i < ikGoals.length; i++) {
        const pose = robot.getLinkPose(robot.tipLinks[i])
        ikGoals[i].position.setFromMatrixPosition(pose)
        ikGoals[i].quaternion.setFromRotationMatrix(pose)
        ikGoalControls[i].setMode('translate')
        ikGoalControls[i].setSpace('local')
      }
    }

    $('hud-brand').textContent = model.brand || '--'
    $('hud-model').textContent = model.name || '--'
    $('hud-reach').textContent = model.reach ? `${model.reach} m` : '--'
    $('hud-payload').textContent = model.payload ? `${model.payload} kg` : '--'
    $('hud-dof').textContent = model.dof ? String(model.dof) : '--'

    const url = new URL(window.location.href)
    url.searchParams.set('robot', modelId)
    history.replaceState(null, '', url)
  } catch (err) {
    console.error('Failed to load model:', err)
  } finally {
    loaderModal.close()
  }
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
      for (const ctrl of ikGoalControls) ctrl.setSpace(ctrl.space === 'local' ? 'world' : 'local')
      syncGizmoToolbar()
      break
    case 'r':
      for (const ctrl of ikGoalControls) ctrl.setMode('rotate')
      syncGizmoToolbar()
      break
    case 't':
      for (const ctrl of ikGoalControls) ctrl.setMode('translate')
      syncGizmoToolbar()
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

function doConvexHullStuff() {
  const exporter = new STLExporter()
  const material = new THREE.MeshBasicMaterial({color: 0x00ff00})

  let rawPointsIdx = 0
  for (const link of robot.tipLinks) {
    // Convert accumulated Float32Array chunks to Vector3[] for ConvexGeometry
    const points: THREE.Vector3[] = []
    for (const chunk of rawPointChunks[rawPointsIdx]) {
      for (let i = 0; i < chunk.length; i += 3) {
        points.push(new THREE.Vector3(chunk[i], chunk[i + 1], chunk[i + 2]))
      }
    }
    rawPointsIdx++
    const geometry = new ConvexGeometry(points)

    const stlscene = new THREE.Scene()
    stlscene.add(new THREE.Mesh(geometry, material))

    FileSaver.saveAs(new Blob([ exporter.parse(stlscene) ], { type: 'text/plain' }), `${link}.stl`)
  }
}

// ── Motion ──

function moveFromTo(q_s: number[], q_t: number[], duration = 10, easing: (t: number) => number = Easing.Linear.None) {
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
      for (let i = 0; i < ikGoals.length; i++) {
        const pose = robot.getLinkPose(robot.tipLinks[i])
        ikGoals[i].position.setFromMatrixPosition(pose)
        ikGoals[i].quaternion.setFromRotationMatrix(pose)
      }
    }
    robot.updateVisualizations()
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

function pollGamepad() {
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

// ── IK Goals ──

function cleanupIkGoals() {
  for (let i = 0; i < ikGoals.length; i++) {
    ikGoalControls[i].detach()
    scene.remove(ikGoals[i])
    scene.remove(ikGoalControlHelpers[i])
    ikGoalControls[i].dispose()
  }
  ikGoals = []
  ikGoalControls = []
  ikGoalControlHelpers = []
}

function setupIkGoals() {
  cleanupIkGoals()

  const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00]
  const n = robot.tipLinks.length

  // Precompute which tips are fully coupled to each tip (e.g. mimic fingers
  // on a 1-DOF gripper). coupledTips[i] lists tips whose joints are a subset
  // of tip i's joints — these gizmos should track FK when tip i is dragged.
  const coupledTips: number[][] = Array.from({ length: n }, () => [])
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (j !== i && robot.isTipSubsetOf(j, i)) coupledTips[i].push(j)
    }
  }

  for (let i = 0; i < n; i++) {
    const material = new THREE.MeshLambertMaterial({
      color: colors[i % colors.length],
      transparent: true,
      opacity: 0.8,
    })
    const goal = new THREE.Mesh(new THREE.SphereGeometry(0.01), material)
    goal.name = `ikGoal-${i}`

    const control = new TransformControls(camera, renderer.domElement)
    const helper = control.getHelper()
    helper.name = `ikGoalControl-${i}`

    const tipIndex = i
    control.addEventListener('objectChange', function () {
      if (ikSolver !== IkSolverEnum.OFF) {
        if (n > 1) {
          robot.moveTipsToPoses(ikGoals)
        } else {
          robot.moveTipToPose(goal, tipIndex)
        }
        // Sync coupled gizmos to actual FK (e.g. mimic fingers on a 1-DOF gripper)
        for (const j of coupledTips[tipIndex]) {
          const pose = robot.getLinkPose(robot.tipLinks[j])
          ikGoals[j].position.setFromMatrixPosition(pose)
          ikGoals[j].quaternion.setFromRotationMatrix(pose)
        }
        robot.updateVisualizations()
      }
    })
    control.addEventListener('mouseDown', () => { orbitControls.enabled = false })
    control.addEventListener('mouseUp', () => { orbitControls.enabled = true })

    ikGoals.push(goal)
    ikGoalControls.push(control)
    ikGoalControlHelpers.push(helper)
  }
}

// ── Start ──

async function main() {
  const manifest = await modelLoader.fetchManifest()
  const models = manifest.models

  const params = new URLSearchParams(window.location.search)
  const requested = params.get('robot')
  const modelId = (requested && models.some(m => m.id === requested))
    ? requested
    : models[Math.floor(Math.random() * models.length)].id

  await loadModel(modelId)
}

main()
