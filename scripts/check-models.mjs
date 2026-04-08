#!/usr/bin/env node

// Fetches every robot model from the CDN manifest, parses each URDF,
// and checks for common issues:
//   - Mesh files using unsupported formats
//   - tipLinks referencing links that don't exist in the URDF
//   - (optional) Mesh URLs that return 404
//
// Usage:  node scripts/check-models.mjs [--check-exists]
//
// --check-exists  HEAD-request every mesh URL to verify it exists (slow)

const BASE_URL = 'https://raw.githubusercontent.com/ferrolho/robot-explorer-models/dist/'
const SUPPORTED_EXTS = new Set(['.stl', '.dae', '.obj', '.glb', '.gltf'])
const checkExists = process.argv.includes('--check-exists')

async function fetchText(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.text()
}

function extractMeshFilenames(urdfXml) {
  const filenames = []
  const re = /<mesh\s[^>]*filename\s*=\s*"([^"]+)"/g
  let m
  while ((m = re.exec(urdfXml)) !== null) filenames.push(m[1])
  return [...new Set(filenames)]
}

function extractLinkNames(urdfXml) {
  const names = new Set()
  const re = /<link\s[^>]*name\s*=\s*"([^"]+)"/g
  let m
  while ((m = re.exec(urdfXml)) !== null) names.add(m[1])
  return names
}

function extOf(filename) {
  const dot = filename.lastIndexOf('.')
  return dot === -1 ? '' : filename.slice(dot).toLowerCase()
}

async function main() {
  const manifest = await fetch(`${BASE_URL}manifest.json`).then(r => r.json())
  console.log(`Manifest: ${manifest.models.length} models\n`)

  let totalIssues = 0

  for (const model of manifest.models) {
    const urdfUrl = `${BASE_URL}${model.urdf}`
    let urdfXml
    try {
      urdfXml = await fetchText(urdfUrl)
    } catch (e) {
      console.log(`FAIL  ${model.id} — URDF fetch failed: ${e.message}`)
      totalIssues++
      continue
    }

    const meshFiles = extractMeshFilenames(urdfXml)
    const linkNames = extractLinkNames(urdfXml)
    const issues = []

    // Check tipLinks exist in the URDF
    for (const tip of model.tipLinks ?? []) {
      if (!linkNames.has(tip)) {
        issues.push(`tipLink not found in URDF: "${tip}"`)
      }
    }

    // Check for unsupported extensions
    for (const f of meshFiles) {
      const ext = extOf(f)
      if (!SUPPORTED_EXTS.has(ext)) {
        issues.push(`unsupported format "${ext}": ${f}`)
      }
    }

    // Optionally verify mesh URLs exist
    if (checkExists) {
      const baseDir = urdfUrl.replace(/\/[^/]+$/, '/')
      await Promise.all(meshFiles.map(async (f) => {
        const url = `${baseDir}${f}`
        try {
          const res = await fetch(url, { method: 'HEAD' })
          if (!res.ok) issues.push(`${res.status}: ${f}`)
        } catch (e) {
          issues.push(`fetch error: ${f} — ${e.message}`)
        }
      }))
    }

    if (issues.length > 0) {
      console.log(`FAIL  ${model.id} (${meshFiles.length} meshes)`)
      for (const issue of issues) console.log(`      ${issue}`)
      totalIssues += issues.length
    } else {
      console.log(`  ok  ${model.id} (${meshFiles.length} meshes)`)
    }
  }

  console.log(`\n${totalIssues === 0 ? 'All models OK' : `${totalIssues} issue(s) found`}`)
  process.exit(totalIssues > 0 ? 1 : 0)
}

main()
