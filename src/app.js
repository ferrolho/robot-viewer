/* global $, Materialize, requestAnimationFrame */

import { Robot } from './js/Robot.js'

const Detector = require('./js/Detector')
if (!Detector.webgl) Detector.addGetWebGLMessage()

const JSZip = require('jszip')
const JSZipUtils = require('jszip-utils')
const THREE = require('three')
const THREEOrbitControls = require('three-orbitcontrols')
const THREETransformControls = require('three-transformcontrols')
const TWEEN = require('tween.js')
const Stats = require('stats.js')

require('./loaders/ColladaLoader2')(THREE)

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
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setClearColor(0xf0f0f0)
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(RENDERER_WIDTH, window.innerHeight)
$('#threejs-container').append(renderer.domElement)

const cameraTarget = new THREE.Vector3(0, 0.4, 0)

// Camera
const camera = new THREE.PerspectiveCamera(75, RENDERER_WIDTH / window.innerHeight, 0.01)
camera.position.set(1, 1, 1)

// Orbit Controls
const orbitControls = new THREEOrbitControls(camera, renderer.domElement)
orbitControls.target = cameraTarget
orbitControls.enableKeys = false
orbitControls.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, PAN: THREE.MOUSE.MIDDLE, ZOOM: THREE.MOUSE.RIGHT }
orbitControls.zoomSpeed = 0.8

camera.lookAt(cameraTarget)

// Scene
const scene = new THREE.Scene()

// Global variables
let castShadows = false
let robot

$(document).ready(function () {
  // Initialize collapse button
  $('.button-collapse').sideNav()

  $('#loader-modal').modal({ dismissible: false })

  // Axis Helper
  const axis = new THREE.AxisHelper(1)

  $('input[id=axis-switch][type=checkbox]').change(function () {
    $(this).is(':checked') ? scene.add(axis) : scene.remove(axis)
  })

  // Grid Helper
  const grid = new THREE.GridHelper(2)
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
    robot.configuration = robot.zeroConfiguration
  })

  // Random configuration
  $('#random-button').click(function () {
    robot.configuration = robot.randomConfiguration
  })

  let rawPoints = [[], [], [], []]
  let pointCloudsInScene = []

  const pointsMaterials = [
    new THREE.PointsMaterial({ color: 0xff0000, transparent: true, opacity: 0.5, size: 0.01 }),
    new THREE.PointsMaterial({ color: 0xff00ff, transparent: true, opacity: 0.5, size: 0.01 }),
    new THREE.PointsMaterial({ color: 0xffff00, transparent: true, opacity: 0.5, size: 0.01 }),
    new THREE.PointsMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5, size: 0.01 })
  ]

  // Reachability
  $('#reachability-button').click(function () {
    while (pointCloudsInScene.length) { scene.remove(pointCloudsInScene.shift()) }

    for (let i = 0; i < 1e4; i++) {
      robot.configuration = robot.randomConfiguration

      for (let j = 0; j < robot.tipLinks.length; j++) {
        const point = new THREE.Vector3()
        point.setFromMatrixPosition(robot.getLinkPose(robot.tipLinks[j]))
        rawPoints[j].push(point)
      }
    }

    let totalPoints = 0
    for (let j = 0; j < robot.tipLinks.length; j++) {
      totalPoints += rawPoints[j].length

      let geometry = new THREE.Geometry()
      for (const point of rawPoints[j]) { geometry.vertices.push(point) }

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

  $('input[id=genetic-algorithm-switch][type=checkbox]').change(function () {
    ikState = $(this).is(':checked') ? IkStateEnum.GENETIC_ALGORITHM : IkStateEnum.OFF
  })

  $('input[id=pseudo-inverse-switch][type=checkbox]').change(function () {
    ikState = $(this).is(':checked') ? IkStateEnum.PSEUDO_INVERSE : IkStateEnum.OFF
  })

  main()
})

const IkStateEnum = Object.freeze({
  OFF: 0,
  GENETIC_ALGORITHM: 1,
  PSEUDO_INVERSE: 2
})

let ikState = IkStateEnum.OFF

let ikGoal
let ikGoalControl

function main () {
  loadModelZae('abb_irb52_7_120')
  ikGoal = addSphereAtXYZ(0, 0.9615, 0.815)
  ikGoal.name = 'ikGoal'
  ikGoalControl = new THREETransformControls(camera, renderer.domElement)
  ikGoalControl.name = 'ikGoalControl'
  ikGoalControl.addEventListener('change', function () {
    if (ikState !== IkStateEnum.OFF) { robot.moveTipToPose(ikGoal) }
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
const planeGeometry = new THREE.PlaneBufferGeometry(10, 10)
const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.4 })
const plane = new THREE.Mesh(planeGeometry, planeMaterial)
plane.receiveShadow = true
plane.rotateX(-90 * THREE.Math.DEG2RAD)
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

animate()
function animate () {
  requestAnimationFrame(animate)

  if (ikState === IkStateEnum.OFF) {
    if (scene.getObjectByName('ikGoal')) { scene.remove(ikGoal) }
    if (scene.getObjectByName('ikGoalControl')) {
      ikGoalControl.detach(ikGoal)
      scene.remove(ikGoalControl)
    }
  } else if (ikState !== IkStateEnum.OFF) {
    if (!scene.getObjectByName('ikGoal')) { scene.add(ikGoal) }
    if (!scene.getObjectByName('ikGoalControl')) {
      ikGoalControl.attach(ikGoal)
      scene.add(ikGoalControl)
    }
  }

  renderer.render(scene, camera)
  TWEEN.update()

  stats.update()
}

function onWindowResize () {
  updateRendererWidth()
  camera.aspect = RENDERER_WIDTH / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(RENDERER_WIDTH, window.innerHeight)
}

const colladaRobotsList = require('./js/ColladaRobotsList')
setupModelsList(colladaRobotsList)
function setupModelsList (models) {
  for (const model of models) {
    $(`#${model.brand.toLowerCase()}-models`).append(`<li id="${model.id}"><a class="waves-effect" href="#!">${model.name}</a></li>`)
    $(`#${model.brand.toLowerCase()}-models`).children().last().click(function () { loadModelZae(model.id); $('.button-collapse').sideNav('hide') })
  }
}

// instantiate a loader
const loader = new THREE.ColladaLoader()
loader.options.convertUpAxis = true

const modelsInScene = []

async function addCollada (modelId, collada) {
  let dae = collada.scene

  dae.traverse(function (child) {
    if (child instanceof THREE.Mesh) {
      // Most of the models do not have normals
      child.material.flatShading = true
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

  robot = new Robot(dae, collada.kinematics, tipLinks)

  updateShadowsState()
}

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function loadModelZae (modelId) {
  console.log(`Loading ${modelId}...`)

  $('#models-list li').removeClass('active')
  $(`#models-list #${modelId}`).addClass('active')

  $('#loader-modal').modal('open')

  JSZipUtils.getBinaryContent(`../collada-robots-collection/${modelId}.zae`, function (err, data) {
    if (err) throw err
    JSZip.loadAsync(data).then(function (zip) {
      zip.file(`${modelId}.dae`).async('string').then(function (content) {
        addCollada(modelId, loader.parse(content)).then(function (result) {
          $('#loader-modal').modal('close')

          const model = $.grep(colladaRobotsList, function (e) { return e.id === modelId })[0]

          // Fill in HUD information
          $('#hud-brand').text(model.brand)
          $('#hud-model').text(model.name)
          $('#hud-reach').text(model.reach)
          $('#hud-payload').text(model.payload)
          $('#hud-dof').text(model.dof)
        })
      })
    })
  })
}

window.addEventListener('keydown', function (event) {
  switch (event.keyCode) {
    case 84: // T
      ikGoalControl.setMode('translate')
      ikGoalControl.setSpace('world')
      break
    case 82: // R
      ikGoalControl.setMode('rotate')
      ikGoalControl.setSpace('local')
      break
  }
})
