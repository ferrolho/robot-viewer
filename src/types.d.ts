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

declare module 'three/addons/loaders/GLTFLoader.js' {
  export { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
}

declare module 'three/addons/lines/LineSegments2.js' {
  export { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
}

declare module 'three/addons/lines/LineSegmentsGeometry.js' {
  export { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
}

declare module 'three/addons/lines/LineMaterial.js' {
  export { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
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


declare module 'stats.js' {
  export default class Stats {
    dom: HTMLDivElement
    update(): void
  }
}

