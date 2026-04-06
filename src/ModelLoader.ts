import URDFLoader from 'urdf-loader'
import type { URDFRobot } from 'urdf-loader'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { LoadingManager, Object3D } from 'three'

export interface ManifestModel {
  id: string
  brand: string
  name: string
  tipLinks: string[]
  category: string
  lods: string[]
  dof: number
  upstream: string
  urdfs: Record<string, string>
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

const DEFAULT_BASE_URL = 'https://cdn.jsdelivr.net/gh/ferrolho/robot-viewer-models@v0.1.0/'

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

  async loadRobot(modelId: string, lod = 'medium'): Promise<URDFRobot> {
    const manifest = await this.fetchManifest()
    const model = manifest.models.find(m => m.id === modelId)
    if (!model) throw new Error(`Model not found: ${modelId}`)

    const urdfRelPath = model.urdfs[lod] ?? model.urdfs[model.lods[0]]
    const urdfUrl = `${this.baseUrl}${urdfRelPath}`

    // Create a fresh LoadingManager per load to track mesh completion
    const manager = new LoadingManager()
    const gltfLoader = new GLTFLoader(manager)

    const urdfLoader = new URDFLoader(manager)
    urdfLoader.parseVisual = true
    urdfLoader.parseCollision = false

    // Our rewritten URDFs use relative paths (no package:// prefix)
    urdfLoader.packages = ''

    urdfLoader.loadMeshCb = (url: string, _manager: LoadingManager, onComplete: (obj: Object3D, err?: Error) => void) => {
      gltfLoader.load(
        url,
        (gltf) => onComplete(gltf.scene),
        undefined,
        (err) => onComplete(new Object3D(), err as Error),
      )
    }

    return urdfLoader.loadAsync(urdfUrl) as Promise<URDFRobot>
  }
}
