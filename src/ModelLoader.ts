import URDFLoader from 'urdf-loader'
import type { URDFRobot } from 'urdf-loader'

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

const DEFAULT_BASE_URL = 'https://cdn.jsdelivr.net/gh/ferrolho/robot-viewer-models@dist/'

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

    // Use the default mesh loader — it handles STL and GLB natively
    return urdfLoader.loadAsync(urdfUrl) as Promise<URDFRobot>
  }
}
