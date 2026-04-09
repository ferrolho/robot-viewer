/**
 * Node-based IK benchmark for atlas_v4 whole-body IK.
 *
 * Usage: npm run bench
 *
 * Loads the atlas_v4 URDF from the local robot-explorer-models repo (no
 * network, no meshes), creates a Robot instance, and times moveTipsToPoses
 * across multiple runs.
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DOMParser as LinkedomDOMParser, parseHTML } from 'linkedom'

// Polyfill DOM globals for urdf-loader (must happen before import)
const { document, Document, Element, Node, Text, Comment } = parseHTML('<!doctype html><html></html>')
Object.assign(globalThis, {
  document, Document, Element, Node, Text, Comment,
  DOMParser: LinkedomDOMParser,
})

import * as THREE from 'three'
import URDFLoader from 'urdf-loader'
import { Robot, robotKinematicsFromURDF } from '../src/robotics/index.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Load atlas_v4 URDF ──

const urdfPath = resolve(__dirname, '../../robot-explorer-models/dist/models/atlas_v4/robot.urdf')
const urdfXml = readFileSync(urdfPath, 'utf-8')

const loader = new URDFLoader()
loader.parseVisual = false
loader.parseCollision = false
const urdf = loader.parse(urdfXml)

// ── Create Robot ──

const scene = new THREE.Scene()
const kinematics = robotKinematicsFromURDF(urdf)
const tipLinks = ['l_hand', 'r_hand', 'l_foot', 'r_foot']
scene.add(urdf)

// Rotate to Y-up (same as the app does)
urdf.rotation.x = -Math.PI / 2
urdf.updateMatrixWorld(true)

// Suppress Robot's printJointNames during construction
const origLog = console.log
console.log = () => {}
const robot = new Robot(scene, urdf, kinematics, tipLinks)
console.log = origLog

// ── Set up goals ──

function createGoals(): THREE.Object3D[] {
  // Get current tip positions and create goal objects offset slightly
  return tipLinks.map((_, i) => {
    const goal = new THREE.Object3D()
    scene.add(goal)

    const tipLink = urdf.getObjectByName(tipLinks[i])
    if (!tipLink) throw new Error(`Tip link not found: ${tipLinks[i]}`)
    tipLink.updateWorldMatrix(true, false)

    // Copy tip pose and apply a small random offset
    goal.position.setFromMatrixPosition(tipLink.matrixWorld)
    goal.quaternion.setFromRotationMatrix(tipLink.matrixWorld)
    goal.position.x += (Math.random() - 0.5) * 0.1
    goal.position.y += (Math.random() - 0.5) * 0.1
    goal.position.z += (Math.random() - 0.5) * 0.1
    goal.updateMatrixWorld(true)

    return goal
  })
}

// ── Benchmark ──

const N = 50
const times: number[] = []

// Suppress console.log from Robot during benchmark
console.log = () => {}

for (let i = 0; i < N; i++) {
  // Reset to zero configuration each run
  robot.configuration = robot.zeroConfiguration
  urdf.updateMatrixWorld(true)

  const goals = createGoals()

  const start = performance.now()
  robot.moveTipsToPoses(goals)
  const elapsed = performance.now() - start

  times.push(elapsed)

  // Clean up goal objects
  for (const g of goals) scene.remove(g)
}

// Restore console.log
console.log = origLog

// ── Report ──

times.sort((a, b) => a - b)

const sum = times.reduce((a, b) => a + b, 0)
const mean = sum / N
const median = times[Math.floor(N / 2)]
const p95 = times[Math.floor(N * 0.95)]
const min = times[0]
const max = times[N - 1]

console.log(`\natlas_v4 whole-body IK benchmark (${N} runs)\n`)
console.log(`  min:    ${min.toFixed(1)} ms`)
console.log(`  median: ${median.toFixed(1)} ms`)
console.log(`  mean:   ${mean.toFixed(1)} ms`)
console.log(`  p95:    ${p95.toFixed(1)} ms`)
console.log(`  max:    ${max.toFixed(1)} ms`)
console.log()
