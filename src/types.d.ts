// Three.js addons don't have types in @types/three for this version
declare module 'three/addons/capabilities/WebGL.js' {
  const WebGL: {
    isWebGL2Available(): boolean
    getWebGL2ErrorMessage(): HTMLElement
  }
  export default WebGL
}

declare module 'three/addons/controls/OrbitControls.js' {
  export { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
}

declare module 'three/addons/controls/TransformControls.js' {
  export { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
}

declare module 'three/addons/exporters/STLExporter.js' {
  export { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
}

declare module 'three/addons/geometries/ConvexGeometry.js' {
  export { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js'
}

declare module 'three/addons/loaders/ColladaLoader.js' {
  export { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js'
}

declare module 'file-saver' {
  export function saveAs(blob: Blob, filename: string): void
}

declare module 'kinematics' {
  export default class Kinematics {
    constructor(geometry: number[][])
    inverse(x: number, y: number, z: number, rx: number, ry: number, rz: number): number[]
  }
}

declare module 'jszip-utils' {
  export function getBinaryContent(path: string, callback: (err: Error | null, data: ArrayBuffer) => void): void
}

declare module 'stats.js' {
  export default class Stats {
    dom: HTMLDivElement
    update(): void
  }
}

// Materialize CSS jQuery plugins
interface JQuery {
  sideNav(action?: string): JQuery
  modal(options?: object | string): JQuery
  collapsible(options?: object): JQuery
}
