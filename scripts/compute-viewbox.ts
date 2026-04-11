/**
 * Precompute bounding-box data for each robot model by sampling random
 * joint configurations.  Fetches URDFs from the CDN (no local dist
 * checkout required).  Outputs a JSON map from model ID to a viewBox
 * (Y-up, post-rotation) that can be embedded in the manifest or loaded
 * at runtime for camera framing.
 *
 * Usage:  npx tsx scripts/compute-viewbox.ts
 */

import { writeFileSync } from 'node:fs'
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

const BASE_URL = 'https://raw.githubusercontent.com/ferrolho/robot-explorer-models/dist/'
const NUM_SAMPLES = 50

interface ViewData {
  /** Half the largest bounding-box dimension. */
  radius: number
  /** Y-center of the bounding box (vertical midpoint of the robot's workspace). */
  elevation: number
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}

function computeViewBox(urdfXml: string, tipLinks: string[]): ViewBox {
  const loader = new URDFLoader()
  loader.parseVisual = false
  loader.parseCollision = false
  const urdf = loader.parse(urdfXml)

  // Rotate to Y-up (same as the app)
  const wrapper = new THREE.Group()
  urdf.rotation.x = -Math.PI / 2
  wrapper.add(urdf)

  const scene = new THREE.Scene()
  scene.add(wrapper)

  const kinematics = robotKinematicsFromURDF(urdf)

  // Suppress Robot's constructor console.log
  const origLog = console.log
  console.log = () => {}
  const robot = new Robot(scene, urdf, kinematics, tipLinks)
  console.log = origLog

  const box = new THREE.Box3()
  const pos = new THREE.Vector3()

  function expandBoxFromLinks() {
    wrapper.updateMatrixWorld(true)
    const linkMap: Record<string, THREE.Object3D> = (urdf as any).links ?? {}
    for (const name in linkMap) {
      const link = linkMap[name]
      link.getWorldPosition(pos)
      box.expandByPoint(pos)
    }
  }

  // Include the zero configuration
  robot.configuration = robot.zeroConfiguration
  expandBoxFromLinks()

  // Sample random configurations
  for (let i = 0; i < NUM_SAMPLES; i++) {
    robot.configuration = robot.randomConfiguration
    expandBoxFromLinks()
  }

  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  return {
    radius: round3(Math.max(size.x, size.y, size.z) / 2),
    elevation: round3(center.y),
  } as ViewData
}

// ── Main ──

async function main() {
  const manifest = await fetch(`${BASE_URL}manifest.json`).then(r => r.json())
  console.log(`Manifest: ${manifest.models.length} models\n`)

  const results: Record<string, ViewData> = {}
  let errors = 0

  for (const model of manifest.models) {
    const urdfUrl = `${BASE_URL}${model.urdf}`
    try {
      const urdfXml = await fetch(urdfUrl).then(r => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
        return r.text()
      })
      const data = computeViewBox(urdfXml, model.tipLinks ?? [])
      if (isFinite(data.radius) && data.radius > 0 && isFinite(data.elevation)) {
        results[model.id] = data
        console.log(`  ok  ${model.id}  radius=${data.radius}  elevation=${data.elevation}`)
      } else {
        console.log(`SKIP  ${model.id}  (invalid: radius=${data.radius} elevation=${data.elevation})`)
      }
    } catch (e) {
      console.log(`FAIL  ${model.id}: ${(e as Error).message}`)
      errors++
    }
  }

  console.log(`\n${Object.keys(results).length} models computed, ${errors} errors\n`)
  // Write the viewbox data as a JSON file for direct import
const outPath = new URL('../src/viewbox-data.json', import.meta.url).pathname
writeFileSync(outPath, JSON.stringify(results, null, 2) + '\n')
console.log(`Written to ${outPath}`)
}

main()
