/* global $, Materialize, requestAnimationFrame */

const Detector = require('./js/Detector')
if (!Detector.webgl) Detector.addGetWebGLMessage()

const THREE = require('three')
const OrbitControls = require('three-orbitcontrols')
const TWEEN = require('tween.js')
const Stats = require('stats.js')

require('./loaders/ColladaLoader2')(THREE)

const stats = new Stats()
stats.dom.id = 'statsjs'
document.body.appendChild(stats.dom)

// Initialize collapse button
$('.button-collapse').sideNav()

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

// Camera
const camera = new THREE.PerspectiveCamera(75, RENDERER_WIDTH / window.innerHeight)
camera.position.set(5, 5, 5)

const cameraTarget = new THREE.Vector3(0, 2, 0)

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement)
controls.target = cameraTarget
controls.enableKeys = false
controls.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, PAN: THREE.MOUSE.MIDDLE, ZOOM: THREE.MOUSE.RIGHT }
controls.zoomSpeed = 0.8

camera.lookAt(cameraTarget)

// Scene
const scene = new THREE.Scene()

let castShadows = true

$(document).ready(function () {
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
    Materialize.toast('Shadow changes will take effect on future robot models', 2000)
  })

  // Performance Monitor
  $('#statsjs').hide()
  $('input[id=stats-switch][type=checkbox]').change(function () {
    $(this).is(':checked') ? $('#statsjs').show() : $('#statsjs').hide()
  })
})

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

var models = [
  'abb_irb1200_5_90',
  'abb_irb120_3_58',
  'abb_irb1600_6_12',
  'abb_irb2400',
  'abb_irb2600_12_165',
  'abb_irb4400l_30_243',
  'abb_irb4600_60_205',
  'abb_irb52_7_120',
  'abb_irb5400',
  'abb_irb6640_185_280',
  'abb_irb6640',
  'abb_irb7600_150_350',
  'kawada_hironx',
  'kuka_kr10r1100sixx',
  'kuka_kr120r2500pro',
  'kuka_kr16_2',
  'kuka_kr5_arc',
  'kuka_lbr_iiwa_14_r820',
  'universal_robot_ur10',
  'universal_robot_ur3',
  'universal_robot_ur5'
]

function setupModelsList (models) {
  for (const model of models) {
    $('.models-list').append(`<li><a href="#!">${model}</a></li>`)
    $('.models-list').children().last().click(function () { loadModel(model); $('.button-collapse').sideNav('hide') })
  }
}

setupModelsList(models)

// instantiate a loader
const loader = new THREE.ColladaLoader()
loader.options.convertUpAxis = true

loadModel('kuka_lbr_iiwa_14_r820')

let dae
let kinematics
const tweenParameters = {}

const modelsInScene = []

function loadModel (model) {
  console.log(`Loading ${model}...`)

  loader.load(
    // resource URL
    `../collada-robots-collection/${model}.dae`,

    // Function when resource is loaded
    function (collada) {
      dae = collada.scene

      dae.traverse(function (child) {
        if (child instanceof THREE.Mesh) {
          // model does not have normals
          child.material.flatShading = true

          if (castShadows) {
            child.castShadow = true
            child.receiveShadow = true
          }
        }
      })

      dae.scale.x = dae.scale.y = dae.scale.z = 5.0
      dae.updateMatrix()

      kinematics = collada.kinematics

      while (modelsInScene.length) {
        scene.remove(modelsInScene[0])
        modelsInScene.pop()
      }

      scene.add(dae)
      modelsInScene.push(dae)

      setupTween()
    }
  )

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
}
