/* global $, Materialize, requestAnimationFrame */

const Detector = require('./js/Detector')
if (!Detector.webgl) Detector.addGetWebGLMessage()

const JSZip = require('jszip')
const JSZipUtils = require('jszip-utils')
const THREE = require('three')
const THREEOrbitControls = require('three-orbitcontrols')
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

const cameraTarget = new THREE.Vector3(0, 2, 0)

// Camera
const camera = new THREE.PerspectiveCamera(75, RENDERER_WIDTH / window.innerHeight)
camera.position.set(5, 5, 5)

// Orbit Controls
const controls = new THREEOrbitControls(camera, renderer.domElement)
controls.target = cameraTarget
controls.enableKeys = false
controls.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, PAN: THREE.MOUSE.MIDDLE, ZOOM: THREE.MOUSE.RIGHT }
controls.zoomSpeed = 0.8

camera.lookAt(cameraTarget)

// Scene
const scene = new THREE.Scene()

let castShadows = true

$(document).ready(function () {
  // Initialize collapse button
  $('.button-collapse').sideNav()

  $('#loader-modal').modal({
    dismissible: false
  })

  // Axis Helper
  const axis = new THREE.AxisHelper(5)

  $('input[id=axis-switch][type=checkbox]').change(function () {
    $(this).is(':checked') ? scene.add(axis) : scene.remove(axis)
  })

  // Grid Helper
  const grid = new THREE.GridHelper()
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

  loadModelZae('abb_irb52_7_120')
})

function updateShadowsState () {
  dae.traverse(function (child) {
    if (child instanceof THREE.Mesh) {
      child.castShadow = castShadows
      child.receiveShadow = castShadows
    }
  })
}

// Lights
const ambientLight = new THREE.AmbientLight(0xcccccc, 0.6)
scene.add(ambientLight)

let directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
directionalLight.castShadow = true
directionalLight.position.set(20, 20, 0)
const shadowCameraSize = 10
directionalLight.shadow.camera.far = 50
directionalLight.shadow.camera.bottom = -shadowCameraSize
directionalLight.shadow.camera.left = -shadowCameraSize
directionalLight.shadow.camera.right = shadowCameraSize
directionalLight.shadow.camera.top = shadowCameraSize
// directionalLight.shadow.mapSize.width = 2048
// directionalLight.shadow.mapSize.height = 2048
scene.add(directionalLight)

// Create a plane that receives shadows (but does not cast them)
var planeGeometry = new THREE.PlaneBufferGeometry(100, 100)
// var planeMaterial = new THREE.MeshLambertMaterial()
var planeMaterial = new THREE.ShadowMaterial({ opacity: 0.4 })
var plane = new THREE.Mesh(planeGeometry, planeMaterial)
plane.receiveShadow = true
plane.rotateX(-90 * THREE.Math.DEG2RAD)
scene.add(plane)

// Create a helper for the shadow camera (optional)
// var helper = new THREE.CameraHelper(directionalLight.shadow.camera)
// scene.add(helper)

animate()
function animate () {
  requestAnimationFrame(animate)

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
    $(`#${model.brand}-models`).append(`<li id="${model.id}"><a class="waves-effect" href="#!">${model.name}</a></li>`)
    $(`#${model.brand}-models`).children().last().click(function () { loadModelZae(model.id); $('.button-collapse').sideNav('hide') })
  }
}

// instantiate a loader
const loader = new THREE.ColladaLoader()
loader.options.convertUpAxis = true

let dae
let kinematics
const tweenParameters = {}
const modelsInScene = []

async function addCollada (collada) {
  dae = collada.scene

  dae.traverse(function (child) {
    if (child instanceof THREE.Mesh) {
      // model does not have normals
      child.material.flatShading = true
    }
  })

  updateShadowsState()

  dae.scale.x = dae.scale.y = dae.scale.z = 5.0
  dae.updateMatrix()

  kinematics = collada.kinematics

  while (modelsInScene.length) {
    scene.remove(modelsInScene.pop())
  }

  scene.add(dae)
  modelsInScene.push(dae)

  setupTween()
}

function loadModelZae (model) {
  console.log(`Loading ${model}...`)

  $('#models-list li').removeClass('active')
  $(`#models-list #${model}`).addClass('active')

  $('#loader-modal').modal('open')

  JSZipUtils.getBinaryContent(`../collada-robots-collection/${model}.zae`, function (err, data) {
    if (err) throw err
    JSZip.loadAsync(data).then(function (zip) {
      zip.file(`${model}.dae`).async('string').then(function (content) {
        addCollada(loader.parse(content)).then(function () {
          $('#loader-modal').modal('close')
        })
      })
    })
  })
}

function setupTween () {
  const duration = THREE.Math.randInt(1000, 5000)

  const target = {}

  for (const prop in kinematics.joints) {
    if (kinematics.joints.hasOwnProperty(prop)) {
      if (!kinematics.joints[ prop ].static) {
        const joint = kinematics.joints[ prop ]

        const old = tweenParameters[ prop ]

        const position = old || joint.zeroPosition

        tweenParameters[ prop ] = position

        target[ prop ] = THREE.Math.randInt(joint.limits.min, joint.limits.max)
      }
    }
  }

  const kinematicsTween = new TWEEN.Tween(tweenParameters).to(target, duration).easing(TWEEN.Easing.Quadratic.Out)

  kinematicsTween.onUpdate(function () {
    for (var prop in kinematics.joints) {
      if (kinematics.joints.hasOwnProperty(prop)) {
        if (!kinematics.joints[ prop ].static) {
          kinematics.setJointValue(prop, this[ prop ])
        }
      }
    }
  })

  kinematicsTween.start()

  setTimeout(setupTween, duration)
}
