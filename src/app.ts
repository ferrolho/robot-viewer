import { IkSolverEnum, Robot, robotKinematicsFromURDF } from './robotics/index.ts'
import { ModelLoader, type ManifestModel } from './ModelLoader.ts'
import { getLocale, setLocale, t, applyTranslations, LOCALES } from './i18n.ts'

import WebGL from 'three/addons/capabilities/WebGL.js'
if (!WebGL.isWebGL2Available()) document.body.appendChild(WebGL.getWebGL2ErrorMessage())

import FileSaver from 'file-saver'
import * as THREE from 'three'
import { Tween, Easing, Group } from '@tweenjs/tween.js'
const tweenGroup = new Group()
import Stats from 'stats.js'

import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { STLExporter } from 'three/addons/exporters/STLExporter.js'
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'

const modelLoader = new ModelLoader()

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
$('canvas-container').appendChild(stats.dom)

// ── Renderer (sized by container via ResizeObserver) ──

const canvasContainer = $('canvas-container')

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
renderer.setPixelRatio(window.devicePixelRatio)
renderer.domElement.style.display = 'block'
canvasContainer.appendChild(renderer.domElement)

// Initial size sync before ResizeObserver kicks in
const initRect = canvasContainer.getBoundingClientRect()
renderer.setSize(initRect.width, initRect.height)

// Camera
const cameraTarget = new THREE.Vector3(0, 0.4, 0)
const camera = new THREE.PerspectiveCamera(45, initRect.width / initRect.height, 0.01, 1000)
camera.position.set(1, 1, 1)
camera.lookAt(cameraTarget)

// Orbit Controls
const orbitControls = new OrbitControls(camera, renderer.domElement)
orbitControls.target = cameraTarget
orbitControls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.DOLLY }
orbitControls.screenSpacePanning = true
orbitControls.zoomSpeed = 0.8
orbitControls.update()

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
let showVelocityEllipsoid = false
let showForceEllipsoid = false
let ikSolver = IkSolverEnum.OFF as typeof IkSolverEnum[keyof typeof IkSolverEnum]
let ikGoals: THREE.Mesh[] = []
let ikGoalControls: InstanceType<typeof TransformControls>[] = []
let ikGoalControlHelpers: THREE.Object3D[] = []

// ── Theme ──

function getTheme(): 'dark' | 'light' {
  return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
}

let sceneThemeReady = false

function applyTheme(theme: 'dark' | 'light') {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
  const isDark = theme === 'dark'
  renderer.setClearColor(isDark ? 0x0f1114 : 0xe8eaed)
  if (sceneThemeReady) {
    ;(grid.material as LineMaterial).color.set(isDark ? 0x3a3f48 : 0xb0b4bc)
  }
}

// Apply CSS theme immediately; scene objects update after they're created
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
;(axis.material as THREE.LineBasicMaterial).depthTest = false
axis.renderOrder = 1
const axisSwitch = checkbox('axis-switch')
axisSwitch.addEventListener('change', () => {
  if (axisSwitch.checked) { scene.add(axis) } else { scene.remove(axis) }
})

const grid = (() => {
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

const gridSwitch = checkbox('grid-switch')
gridSwitch.addEventListener('change', () => {
  if (gridSwitch.checked) { scene.add(grid) } else { scene.remove(grid) }
})
gridSwitch.checked = true
gridSwitch.dispatchEvent(new Event('change'))

// Grid is ready — sync its color with the current theme
sceneThemeReady = true
applyTheme(getTheme())

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
    setupIkGoals()
    for (let i = 0; i < ikGoals.length; i++) {
      const pose = robot.getLinkPose(robot.tipLinks[i])
      ikGoals[i].position.setFromMatrixPosition(pose)
      ikGoals[i].quaternion.setFromRotationMatrix(pose)
      ikGoalControls[i].setMode('translate')
      ikGoalControls[i].setSpace('local')
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

// ── Scene setup ──

function updateShadowsState () {
  plane.visible = castShadows
  robot.updateShadowsState(castShadows)
}

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 2.0)
scene.add(ambientLight)

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

function _addSphereAtXYZ (x: number, y: number, z: number) {
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

const modelsListContainer = document.getElementById('models-list')!
const searchInput = document.getElementById('model-search') as HTMLInputElement
const categoryChipsContainer = document.getElementById('category-chips')!
let brandMap = new Map<string, ManifestModel[]>()
let allModels: ManifestModel[] = []
let activeCategory: string | null = null

function getFilteredModels (): ManifestModel[] {
  const query = searchInput.value.trim().toLowerCase()
  return allModels.filter(m => {
    if (activeCategory && m.category !== activeCategory) return false
    if (query && !m.name.toLowerCase().includes(query) && !m.brand.toLowerCase().includes(query) && !m.id.toLowerCase().includes(query)) return false
    return true
  })
}

function buildBrandMap (models: ManifestModel[]): Map<string, ManifestModel[]> {
  const map = new Map<string, ManifestModel[]>()
  for (const model of models) {
    const list = map.get(model.brand) ?? []
    list.push(model)
    map.set(model.brand, list)
  }
  return map
}

function isFiltering (): boolean {
  return activeCategory !== null || searchInput.value.trim() !== ''
}

function showBrandGrid () {
  const filtered = getFilteredModels()
  const currentBrandMap = buildBrandMap(filtered)
  const sortedBrands = [...currentBrandMap.keys()].sort()

  // If filtering, show flat list instead of brand grid
  if (isFiltering()) {
    showFlatResults(filtered)
    return
  }

  const grid = document.createElement('div')
  grid.className = 'brand-grid models-view'

  for (const brand of sortedBrands) {
    const brandSlug = brand.replace(/\s+/g, '-').toLowerCase()
    const count = currentBrandMap.get(brand)!.length

    const tile = document.createElement('button')
    tile.className = 'brand-tile'
    tile.addEventListener('click', () => showBrandRobots(brand))

    const img = document.createElement('img')
    img.src = `${(import.meta as any).env.BASE_URL}images/logos/${brandSlug}.png`
    img.alt = brand
    img.onerror = () => {
      img.remove()
      const fallback = document.createElement('div')
      fallback.className = 'brand-icon-fallback'
      fallback.textContent = brand.slice(0, 2).toUpperCase()
      tile.insertBefore(fallback, tile.firstChild)
    }
    tile.appendChild(img)

    const name = document.createElement('span')
    name.textContent = brand
    tile.appendChild(name)

    const countEl = document.createElement('span')
    countEl.className = 'brand-count'
    countEl.textContent = count === 1 ? t('models.count.one') : t('models.count.other', { n: count })
    tile.appendChild(countEl)

    grid.appendChild(tile)
  }

  modelsListContainer.innerHTML = ''
  modelsListContainer.appendChild(grid)
}

function showFlatResults (models: ManifestModel[]) {
  const view = document.createElement('div')
  view.className = 'models-view'

  const countLabel = document.createElement('div')
  countLabel.className = 'filter-count'
  countLabel.textContent = models.length === 1 ? t('results.count.one') : t('results.count.other', { n: models.length })
  view.appendChild(countLabel)

  const ul = document.createElement('ul')
  ul.className = 'model-list'
  for (const model of models) {
    const li = document.createElement('li')
    li.id = model.id
    const a = document.createElement('a')
    a.href = '#!'
    a.innerHTML = `<span class="result-name">${model.name}</span><span class="result-brand">${model.brand}</span>`
    a.addEventListener('click', () => {
      loadModel(model.id)
      hideSidebar()
    })
    li.appendChild(a)
    ul.appendChild(li)
  }
  view.appendChild(ul)

  modelsListContainer.innerHTML = ''
  modelsListContainer.appendChild(view)
}

function showBrandRobots (brand: string) {
  const brandSlug = brand.replace(/\s+/g, '-').toLowerCase()
  const models = brandMap.get(brand)!

  const view = document.createElement('div')
  view.className = 'models-view'

  // Back button
  const back = document.createElement('button')
  back.className = 'brand-back'
  back.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`

  const backImg = document.createElement('img')
  backImg.src = `${(import.meta as any).env.BASE_URL}images/logos/${brandSlug}.png`
  backImg.alt = brand
  backImg.onerror = () => backImg.remove()
  back.appendChild(backImg)

  const backName = document.createElement('span')
  backName.className = 'brand-name'
  backName.textContent = brand
  back.appendChild(backName)

  back.addEventListener('click', showBrandGrid)
  view.appendChild(back)

  // Robot list
  const ul = document.createElement('ul')
  ul.className = 'model-list'
  for (const model of models) {
    const li = document.createElement('li')
    li.id = model.id
    const a = document.createElement('a')
    a.href = '#!'
    a.textContent = model.name
    a.addEventListener('click', () => {
      loadModel(model.id)
      hideSidebar()
    })
    li.appendChild(a)
    ul.appendChild(li)
  }
  view.appendChild(ul)

  modelsListContainer.innerHTML = ''
  modelsListContainer.appendChild(view)
}


function setupCategoryChips () {
  const categories = [...new Set(allModels.map(m => m.category))].sort()
  categoryChipsContainer.innerHTML = ''
  for (const cat of categories) {
    const chip = document.createElement('button')
    chip.className = 'category-chip'
    chip.textContent = t('category.' + cat)
    chip.addEventListener('click', () => {
      activeCategory = activeCategory === cat ? null : cat
      updateChipStates()
      showBrandGrid()
    })
    chip.dataset.category = cat
    categoryChipsContainer.appendChild(chip)
  }
}

function updateChipStates () {
  categoryChipsContainer.querySelectorAll('.category-chip').forEach(el => {
    const chip = el as HTMLElement
    chip.classList.toggle('active', chip.dataset.category === activeCategory)
  })
}

searchInput.addEventListener('input', () => showBrandGrid())

async function setupModelsList () {
  const manifest = await modelLoader.fetchManifest()

  allModels = manifest.models
  brandMap = buildBrandMap(allModels)

  setupCategoryChips()
  showBrandGrid()
}

setupModelsList()

// ── Model loading ──

const modelsInScene: THREE.Object3D[] = []

async function loadModel (modelId: string) {
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

    // Remove stale ellipsoids from previous robot
    for (const name of ['velocity-ellipsoid', 'force-ellipsoid', 'acceleration-ellipsoid']) {
      const obj = scene.getObjectByName(name)
      if (obj) scene.remove(obj)
    }

    robot = new Robot(scene, urdfRobot, kinematics, model.tipLinks)
    robot.id = modelId
    robot.category = model.category

    // Sync ellipsoid state from UI toggles to new robot
    robot.showVelocityEllipsoid = showVelocityEllipsoid
    robot.showForceEllipsoid = showForceEllipsoid
    if (showVelocityEllipsoid) robot.updateVelocityEllipsoid()
    if (showForceEllipsoid) robot.updateForceEllipsoid()

    updateShadowsState()
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
      break
    case 'r':
      for (const ctrl of ikGoalControls) { ctrl.setMode('rotate'); ctrl.setSpace('local') }
      break
    case 't':
      for (const ctrl of ikGoalControls) ctrl.setMode('translate')
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
      for (let i = 0; i < ikGoals.length; i++) {
        const pose = robot.getLinkPose(robot.tipLinks[i])
        ikGoals[i].position.setFromMatrixPosition(pose)
        ikGoals[i].quaternion.setFromRotationMatrix(pose)
      }
    }
    if (robot.showVelocityEllipsoid) robot.updateVelocityEllipsoid()
    if (robot.showForceEllipsoid) robot.updateForceEllipsoid()
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

function cleanupIkGoals () {
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

function setupIkGoals () {
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
      }
    })
    control.addEventListener('mouseDown', () => { orbitControls.enabled = false })
    control.addEventListener('mouseUp', () => { orbitControls.enabled = true })

    ikGoals.push(goal)
    ikGoalControls.push(control)
    ikGoalControlHelpers.push(helper)
  }
}

async function main () {
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
