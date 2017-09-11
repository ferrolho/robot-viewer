const isWebglEnabled = require('detector-webgl')
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
renderer.setClearColor(0xf0f0f0)
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(RENDERER_WIDTH, window.innerHeight)
$('#threejs-container').append(renderer.domElement)

// Camera
const camera = new THREE.PerspectiveCamera(75, RENDERER_WIDTH / window.innerHeight)
camera.position.set(2, 1, 1)

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableKeys = false
controls.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, PAN: THREE.MOUSE.MIDDLE, ZOOM: THREE.MOUSE.RIGHT }
controls.zoomSpeed = 0.8

// Scene
const scene = new THREE.Scene()

// Axis Helper
const axisHelper = new THREE.AxisHelper(5)
scene.add(axisHelper)

// Grid
const grid = new THREE.GridHelper()
grid.material.color.setHex(0x000000)
grid.material.opacity = 0.2
grid.material.transparent = true
scene.add(grid)

// Lights
const ambientLight = new THREE.AmbientLight(0xcccccc, 0.6)
scene.add(ambientLight)

let directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
directionalLight.position.set(1, 0, 0).normalize()
scene.add(directionalLight)

function render () {
  renderer.render(scene, camera)
}

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
let kinematicsTween
const tweenParameters = {}

function loadModel (model) {
  scene.remove(dae)

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
        }
      })

      dae.scale.x = dae.scale.y = dae.scale.z = 5.0
      dae.updateMatrix()

      kinematics = collada.kinematics
      scene.add(dae)
      setupTween()
      animate()
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

    kinematicsTween = new TWEEN.Tween(tweenParameters).to(target, duration).easing(TWEEN.Easing.Quadratic.Out)

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
