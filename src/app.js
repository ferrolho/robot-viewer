const isWebglEnabled = require('detector-webgl')
const THREE = require('three')
const ColladaLoader = require('./loaders/ColladaLoader2')(THREE)
const OrbitControls = require('three-orbitcontrols')
const TWEEN = require('tween.js')
const Stats = require('stats.js')

const stats = new Stats()
document.body.appendChild(stats.dom)

window.addEventListener('resize', onWindowResize, false)

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setClearColor(0xf0f0f0)
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight)
camera.position.set(0, 10, 0)

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableKeys = false
// controls.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, PAN: THREE.MOUSE.MIDDLE, ZOOM: THREE.MOUSE.RIGHT }
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
// let light = new THREE.DirectionalLight(0xdddddd, 0.8)
let light = new THREE.PointLight(0xffffff, 0.5)
light.position.set(-10, 100, -10)
scene.add(light)

light = new THREE.PointLight(0xffffff, 0.5)
light.position.set(-10, 100, 10)
scene.add(light)

light = new THREE.AmbientLight(0x404040)
scene.add(light)

function render () {
  transformControls.update()
  renderer.render(scene, camera)
}

function animate () {
  requestAnimationFrame(animate)

  stats.update()
  TWEEN.update()

  renderer.render(scene, camera)
}

function onWindowResize () {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

var dae
var kinematics
var kinematicsTween
var tweenParameters = {}

// instantiate a loader
var loader = new THREE.ColladaLoader()
loader.options.convertUpAxis = true
loader.load(
  // resource URL
  // './kawada-hironx.dae',
  './lbr_iiwa_14_r820.dae',

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
  var duration = THREE.Math.randInt(1000, 5000)

  var target = {}

  for (var prop in kinematics.joints) {
    if (kinematics.joints.hasOwnProperty(prop)) {
      if (!kinematics.joints[ prop ].static) {
        var joint = kinematics.joints[ prop ]

        var old = tweenParameters[ prop ]

        var position = old || joint.zeroPosition

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
