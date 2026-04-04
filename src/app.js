import { IkSolverEnum } from './IkSolver.js'
import { Robot } from './Robot.js'

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

import colladaRobotsList from './ColladaRobotsList.js'

const stats = new Stats()
stats.dom.id = 'statsjs'
document.body.appendChild(stats.dom)

window.addEventListener('resize', onWindowResize, false)

let RENDERER_WIDTH
updateRendererWidth()
function updateRendererWidth () {
  RENDERER_WIDTH = window.innerWidth > 992 ? window.innerWidth - $('.side-nav').width() : window.innerWidth
}

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
renderer.setClearColor(0xf0f0f0)
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(RENDERER_WIDTH, window.innerHeight)
$('#threejs-container').append(renderer.domElement)

const cameraTarget = new THREE.Vector3(0, 0.4, 0)

// Camera
const camera = new THREE.PerspectiveCamera(75, RENDERER_WIDTH / window.innerHeight, 0.01)
camera.position.set(1, 1, 1)

// Orbit Controls
const orbitControls = new OrbitControls(camera, renderer.domElement)
orbitControls.target = cameraTarget
orbitControls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.DOLLY }
orbitControls.screenSpacePanning = true
orbitControls.zoomSpeed = 0.8

camera.lookAt(cameraTarget)

// Scene
const scene = new THREE.Scene()

// Global variables
let castShadows = false
let robot

let rawPoints = [[], [], [], []]
let showEllipsoids = false

$(document).ready(function () {
  // Initialize collapse button
  $('.button-collapse').sideNav()

  $('#loader-modal').modal({ dismissible: false })
  $('#shortcuts-modal').modal()

  // Axes Helper
  const axis = new THREE.AxesHelper(1)

  $('input[id=axis-switch][type=checkbox]').change(function () {
    $(this).is(':checked') ? scene.add(axis) : scene.remove(axis)
  })

  // Grid Helper
  const grid = new THREE.GridHelper(10)
  grid.material.color.setHex(0x000000)
  grid.material.opacity = 0.2
  grid.material.transparent = true

  $('input[id=grid-switch][type=checkbox]').change(function () {
    $(this).is(':checked') ? scene.add(grid) : scene.remove(grid)
  }).click()

  // Shadows
  $('input[id=shadows-switch][type=checkbox]').change(function () {
    castShadows = $(this).is(':checked')
    updateShadowsState()
  })

  // Performance Monitor
  $('#statsjs').hide()
  $('input[id=stats-switch][type=checkbox]').change(function () {
    $(this).is(':checked') ? $('#statsjs').show() : $('#statsjs').hide()
  })

  // Reset configuration
  $('#reset-button').click(function () {
    console.log(`Moving robot to 'home' position...`)
    moveFromTo(robot.configuration, robot.zeroConfiguration, 1000, Easing.Quadratic.Out).start()
  })

  // Random configuration
  $('#random-button').click(function () {
    console.log('Moving robot to random position...')
    moveFromTo(robot.configuration, robot.randomConfiguration, 1000, Easing.Quadratic.Out).start()
  })

  let pointCloudsInScene = []

  const pointsMaterials = [
    new THREE.PointsMaterial({ color: 0xff0000, transparent: true, opacity: 0.5, size: 0.01 }),
    new THREE.PointsMaterial({ color: 0xff00ff, transparent: true, opacity: 0.5, size: 0.01 }),
    new THREE.PointsMaterial({ color: 0xffff00, transparent: true, opacity: 0.5, size: 0.01 }),
    new THREE.PointsMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5, size: 0.01 })
  ]

  /**
   * Robot Reachability
   *
   * Randomly samples robot configurations 1000 times and,
   * for each sample, adds a visual point marker to the scene.
   */
  $('#reachability-button').click(function () {
    while (pointCloudsInScene.length) { scene.remove(pointCloudsInScene.shift()) }

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

      let geometry = new THREE.BufferGeometry().setFromPoints(rawPoints[j])

      let pointCloud = new THREE.Points(geometry, pointsMaterials[j])

      scene.add(pointCloud)
      pointCloudsInScene.push(pointCloud)
    }

    console.log(`The cloud now has ${totalPoints} particles.`)
  })

  // Clear clouds
  $('#clear-clouds-button').click(function () {
    rawPoints = [[], [], [], []]
    while (pointCloudsInScene.length) { scene.remove(pointCloudsInScene.shift()) }

    let totalPoints = 0
    for (let j = 0; j < robot.tipLinks.length; j++) {
      totalPoints += rawPoints[j].length
    }

    console.log(`The cloud now has ${totalPoints} particles.`)
  })

  // Inverse Kinematics

  $('input[id=ik-switch][type=checkbox]').change(function () {
    ikSolver = $(this).is(':checked') ? IkSolverEnum.IK : IkSolverEnum.OFF
  })

  $('input[id=genetic-algorithm-switch][type=checkbox]').change(function () {
    ikSolver = $(this).is(':checked') ? IkSolverEnum.GENETIC_ALGORITHM : IkSolverEnum.OFF
  })

  $('input[id=pseudo-inverse-switch][type=checkbox]').change(function () {
    ikSolver = $(this).is(':checked') ? IkSolverEnum.PSEUDO_INVERSE : IkSolverEnum.OFF
    if (ikSolver !== IkSolverEnum.OFF && robot) {
      const pose = robot.getLinkPose(robot.tipLinks[0])
      ikGoal.position.setFromMatrixPosition(pose)
      ikGoal.quaternion.setFromRotationMatrix(pose)
      ikGoalControl.setMode('translate')
      ikGoalControl.setSpace('local')
    }
  })

  $('input[id=vel-force-ellipsoids-switch][type=checkbox]').change(function () {
    showEllipsoids = $(this).is(':checked')
    if (robot) {
      robot.showEllipsoids = showEllipsoids
      if (showEllipsoids) {
        robot.updateForceEllipsoid()
        robot.updateVelocityEllipsoid()
      } else {
        scene.remove(scene.getObjectByName('force-ellipsoid'))
        scene.remove(scene.getObjectByName('velocity-ellipsoid'))
        scene.remove(scene.getObjectByName('acceleration-ellipsoid'))
      }
    }
  })

  main()
})

let ikSolver = IkSolverEnum.OFF

let ikGoal
let ikGoalControl
let ikGoalControlHelper

function main () {
  // loadModelZae('abb_irb52_7_120')
  loadModelZae('abb_irb120_3_58')

  ikGoal = addSphereAtXYZ(0.4, 0.5, 0)
  ikGoal.name = 'ikGoal'

  ikGoalControl = new TransformControls(camera, renderer.domElement)
  ikGoalControlHelper = ikGoalControl.getHelper()
  ikGoalControlHelper.name = 'ikGoalControl'
  ikGoalControl.addEventListener('objectChange', function () {
    if (ikSolver !== IkSolverEnum.OFF) { robot.moveTipToPose(ikGoal, ikSolver, scene) }
  })
  ikGoalControl.addEventListener('mouseDown', function () {
    orbitControls.enabled = false
  })
  ikGoalControl.addEventListener('mouseUp', function () {
    orbitControls.enabled = true
  })
}

function updateShadowsState () {
  plane.visible = castShadows
  robot.updateShadowsState(castShadows)
}

// Lights
const ambientLight = new THREE.AmbientLight(0xcccccc, 0.6)
scene.add(ambientLight)

let directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
directionalLight.castShadow = true
directionalLight.position.set(20, 20, 0)
const shadowCameraSize = 2
directionalLight.shadow.camera.far = 50
directionalLight.shadow.camera.bottom = -shadowCameraSize
directionalLight.shadow.camera.left = -shadowCameraSize
directionalLight.shadow.camera.right = shadowCameraSize
directionalLight.shadow.camera.top = shadowCameraSize
// directionalLight.shadow.mapSize.width = 2048
// directionalLight.shadow.mapSize.height = 2048
scene.add(directionalLight)

// Create a plane that receives shadows (but does not cast them)
const planeGeometry = new THREE.PlaneGeometry(10, 10)
const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.4 })
const plane = new THREE.Mesh(planeGeometry, planeMaterial)
plane.receiveShadow = true
plane.rotateX(-90 * THREE.MathUtils.DEG2RAD)
scene.add(plane)

// Create a helper for the shadow camera (optional)
// var helper = new THREE.CameraHelper(directionalLight.shadow.camera)
// scene.add(helper)

const geometry = new THREE.BoxGeometry(0.1, 0.01, 0.1)
const material = new THREE.MeshLambertMaterial({ color: 0x00ff00, transparent: true, opacity: 0.4 })
const cube = new THREE.Mesh(geometry, material)
cube.position.set(0, 1.306, 0)
// scene.add(cube)

const sphereGeometry = new THREE.SphereGeometry(0.01)
const sphereMaterialRed = new THREE.MeshLambertMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 })
const sphereMaterialBlue = new THREE.MeshLambertMaterial({ color: 0x0000ff, transparent: true, opacity: 0.8 })

function addSphereAtPose (pose) {
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterialRed)
  sphere.position.setFromMatrixPosition(pose)
  scene.add(sphere)

  console.log(`Added sphere at (${sphere.position.x}, ${sphere.position.y}, ${sphere.position.z})`)
}

function addSphereAtXYZ (x, y, z) {
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterialBlue)
  sphere.position.set(x, y, z)

  console.log(`Added sphere at (${x}, ${y}, ${z})`)

  return sphere
}

requestAnimationFrame(animate)
function animate (time) {
  requestAnimationFrame(animate)

  if (ikSolver === IkSolverEnum.OFF) {
    if (scene.getObjectByName('ikGoal')) { scene.remove(ikGoal) }
    if (scene.getObjectByName('ikGoalControl')) {
      ikGoalControl.detach(ikGoal)
      scene.remove(ikGoalControlHelper)
    }
  } else if (ikSolver !== IkSolverEnum.OFF) {
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

function onWindowResize () {
  updateRendererWidth()
  camera.aspect = RENDERER_WIDTH / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(RENDERER_WIDTH, window.innerHeight)
}

setupModelsList(colladaRobotsList)
function setupModelsList (models) {
  for (const model of models) {
    $(`#${model.brand.replace(/\s+/g, '-').toLowerCase()}-models`).append(`<li id="${model.id}"><a class="waves-effect" href="#!">${model.name}</a></li>`)
    $(`#${model.brand.replace(/\s+/g, '-').toLowerCase()}-models`).children().last().click(function () { loadModelZae(model.id); $('.button-collapse').sideNav('hide') })
  }
}

// instantiate a loader
const loader = new ColladaLoader()

const modelsInScene = []

async function addCollada (modelId, collada) {
  let dae = collada.scene

  dae.traverse(function (child) {
    if (child instanceof THREE.Mesh) {
      // Most of the models do not have normals
      child.material.flatShading = true

      // child.material.transparent = true
      // child.material.opacity = 0.3
    }
  })

  dae.scale.x = dae.scale.y = dae.scale.z = 1.0
  dae.updateMatrix()

  while (modelsInScene.length) {
    scene.remove(modelsInScene.pop())
  }

  scene.add(dae)
  modelsInScene.push(dae)

  const tipLinks = $.grep(colladaRobotsList, function (e) { return e.id === modelId })[0].tipLinks

  robot = new Robot(scene, dae, collada, tipLinks)
  robot.id = modelId

  updateShadowsState()
}

function loadModelZae (modelId) {
  console.log(`Loading ${modelId}...`)

  $('#models-list li').removeClass('active')
  $(`#models-list #${modelId}`).addClass('active')

  $('#loader-modal').modal('open')

  JSZipUtils.getBinaryContent(`${import.meta.env.BASE_URL}collada-robots-collection/${modelId}.zae`, function (err, data) {
    if (err) throw err
    JSZip.loadAsync(data).then(function (zip) {
      zip.file(`${modelId}.dae`).async('string').then(function (content) {
        addCollada(modelId, loader.parse(content)).then(function (result) {
          $('#loader-modal').modal('close')

          const model = $.grep(colladaRobotsList, function (e) { return e.id === modelId })[0]

          // Fill in HUD information
          $('#hud-brand').text(model.brand ? model.brand : '—')
          $('#hud-model').text(model.name ? model.name : '—')
          $('#hud-reach').text(model.reach ? model.reach : '—')
          $('#hud-payload').text(model.payload ? model.payload : '—')
          $('#hud-dof').text(model.dof ? model.dof : '—')
        })
      })
    })
  })
}

const robotTweens = []

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
      for (let q of robot.motionKeypoints) {
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
      if ($('#shortcuts-modal').hasClass('open')) {
        $('#shortcuts-modal').modal('close')
      } else {
        $('#shortcuts-modal').modal('open')
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

/**
 * Robot Motion (without accounting for any collisions)
 *
 * Moves the robot from an initial configuration $q_s$ to a final configuration $q_t$.
 *
 * @param {Number[]} q_s The initial configuration, $q_s$.
 * @param {Number[]} q_t The final configuration, $q_t$.
 */
function moveFromTo (q_s, q_t, duration = 10, easing = Easing.Linear.None) {
  let tweenStart = {}
  let tweenFinal = {}

  // Initialises data structures for tween.js
  for (const joint of robot._joints) {
    tweenStart[joint] = q_s.shift()
    tweenFinal[joint] = q_t.shift()
  }

  const tween = new Tween(tweenStart, tweenGroup).to(tweenFinal, duration).easing(easing)

  tween.onUpdate(function (obj) {
    // Update robot configuration, joint by joint.
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

/**
 * Gamepad support (native Gamepad API)
 */

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
    // Right stick (axes 2,3) controls orbit camera
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
