import URDFLoader from 'urdf-loader'
import type { URDFRobot } from 'urdf-loader'
import * as THREE from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export interface ManifestModel {
  id: string
  brand: string
  name: string
  tipLinks: string[]
  category: string
  dof: number
  upstream: string
  urdf: string
  reach?: number
  weight?: number
  payload?: number
  dataSheet?: string
  productPage?: string
}

interface Manifest {
  version: number
  generated: string
  models: ManifestModel[]
}

const DEFAULT_BASE_URL = 'https://raw.githubusercontent.com/ferrolho/robot-explorer-models/dist/'

export class ModelLoader {
  private baseUrl: string
  private manifest: Manifest | null = null

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? (import.meta as any).env?.VITE_MODELS_BASE_URL ?? DEFAULT_BASE_URL
    if (!this.baseUrl.endsWith('/')) this.baseUrl += '/'
  }

  async fetchManifest(): Promise<Manifest> {
    if (this.manifest) return this.manifest
    const res = await fetch(`${this.baseUrl}manifest.json`)
    if (!res.ok) throw new Error(`Failed to fetch manifest: ${res.status}`)
    this.manifest = await res.json() as Manifest
    return this.manifest
  }

  get models(): ManifestModel[] {
    return this.manifest?.models ?? []
  }

  getModel(id: string): ManifestModel | undefined {
    return this.manifest?.models.find(m => m.id === id)
  }

  async loadRobot(modelId: string): Promise<URDFRobot> {
    const manifest = await this.fetchManifest()
    const model = manifest.models.find(m => m.id === modelId)
    if (!model) throw new Error(`Model not found: ${modelId}`)

    const urdfUrl = `${this.baseUrl}${model.urdf}`

    const urdfLoader = new URDFLoader()
    urdfLoader.parseVisual = true
    urdfLoader.parseCollision = false

    // Our rewritten URDFs use relative paths (no package:// prefix)
    urdfLoader.packages = ''

    // Extend the default mesh loader (STL + DAE) with OBJ and GLB support
    urdfLoader.loadMeshCb = (path, manager, done) => {
      if (/\.obj$/i.test(path)) {
        new OBJLoader(manager).load(path, (obj: THREE.Group) => {
          // TODO: Remove this workaround once https://github.com/gkjohnson/urdf-loaders/pull/333 is merged.
          // OBJLoader returns a Group, but urdf-loader only applies URDF
          // material colors to THREE.Mesh instances (not Groups). Extract the
          // single child mesh so the URDF-defined colour is applied correctly.
          const meshes: THREE.Mesh[] = []
          obj.traverse(child => {
            if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh)
          })
          done(meshes.length === 1 ? meshes[0] : obj)
        })
      } else if (/\.glb$/i.test(path) || /\.gltf$/i.test(path)) {
        new GLTFLoader(manager).load(path, gltf => done(gltf.scene))
      } else {
        urdfLoader.defaultMeshLoader(path, manager, done)
      }
    }

    return urdfLoader.loadAsync(urdfUrl) as Promise<URDFRobot>
  }
}
