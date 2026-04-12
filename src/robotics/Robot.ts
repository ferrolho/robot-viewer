import * as robotMath from './math.ts'
import { type Partial } from './math.ts'
import * as la from './linalg.ts'
import { SolverBuffers, mat4Multiply, mat4AxisAngle, mat4Translation } from './linalg.ts'
import * as THREE from 'three'
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js'

/** Fixed scale factor for force visualizations: 1 mm per Newton. */
const FORCE_SCALE = 0.001

const DEG2RAD = Math.PI / 180

/** Pre-computed segment in a pure-math FK chain. */
interface FkSeg {
  /** Column-major 4×4 static pre-transform (accumulated non-joint transforms merged with joint origin). */
  m: Float64Array
  /** Index into q vector, or -1 for a trailing static segment. */
  qIdx: number
  /** True for prismatic (linear) joints. */
  prismatic: boolean
  /** Joint axis in local frame (valid when qIdx >= 0). */
  ax: number; ay: number; az: number
  /** Joint angle (degrees) at the time the chain was captured. */
  refDeg: number
  /** Mimic multiplier (1 for direct joints, e.g. -1 to reverse direction). */
  mul: number
  /** Mimic offset in degrees (0 for direct joints). */
  off: number
}

export interface RobotJoint {
  static: boolean
  prismatic?: boolean  // true for prismatic (linear) joints; default revolute
  limits: { min: number; max: number }
  effort?: number  // max torque (Nm) from URDF <limit effort="..."/>
  axis: THREE.Vector3
  mimics?: string  // name of the parent joint this joint mimics
  mimicMultiplier?: number  // multiplier for mimic relationship (default 1)
  mimicOffset?: number      // offset for mimic relationship in degrees (default 0)
}

export interface RobotKinematics {
  joints: Record<string, RobotJoint>
  setJointValue(name: string, value: number): void
}

export class Robot {
  id = ''
  category = ''
  showVelocityEllipsoid = false
  showForceEllipsoid = false
  showAccelerationEllipsoid = false
  showForcePolytope = false
  torqueWeightedEllipsoid = true
  showCenterOfMass = false

  /** Recompute all active capability visualizations for the current configuration. */
  updateVisualizations(): void {
    if (this.showCenterOfMass) this.updateCenterOfMass()
    if (this.showVelocityEllipsoid) this.updateVelocityEllipsoid()
    if (this.showForceEllipsoid) this.updateForceEllipsoid()
    if (this.showAccelerationEllipsoid) this.updateAccelerationEllipsoid()
    if (this.showForcePolytope) this.updateForcePolytope()
  }

  private _scene: THREE.Scene
  private _root: THREE.Object3D
  private _kinematics: RobotKinematics
  private _tipLinks: string[]
  private _tipJointIndices: number[][] = []
  /** Joints that are connected to a tip only via mimic chain (need numerical Jacobian). */
  private _mimicResolvedJoints: Set<number>[] = []
  private _degreesOfFreedom: number
  _joints: string[]
  private _q: number[]
  private _motionKeypoints: number[][] = []
  /** Link map from urdf-loader — immune to name collisions from async mesh loads. */
  private _linkMap: Record<string, THREE.Object3D>
  /** Cached joint Object3D references (avoids getObjectByName DFS in hot loop). */
  private _jointObjMap: Record<string, THREE.Object3D> = {}
  /** Cached solver buffers, keyed by "totalDim,nj". */
  private _solverBuf: { key: string; buf: SolverBuffers } | null = null
  /** Cached pure-math FK chains (one per tip link). */
  private _fkChains: FkSeg[][] | null = null
  /** Pre-computed flat joint limit arrays (degrees). */
  private _limitsMin: Float64Array | null = null
  private _limitsMax: Float64Array | null = null

  constructor(scene: THREE.Scene, sceneRoot: THREE.Object3D, kinematics: RobotKinematics, tipLinks: string[]) {
    this._scene = scene
    this._root = sceneRoot
    this._linkMap = (sceneRoot as any).links ?? {}
    this._kinematics = kinematics
    this._tipLinks = tipLinks

    this._degreesOfFreedom = 0
    this._joints = []

    for (const prop in this._kinematics.joints) {
      if (this._kinematics.joints.hasOwnProperty(prop)) {
        if (!this._kinematics.joints[prop].static) {
          this._degreesOfFreedom++
          this._joints.push(prop)
        }
      }
    }

    // Cache joint Object3D references to avoid getObjectByName DFS in the IK loop
    for (const name of this._joints) {
      const obj = this._root.getObjectByName(name)
      if (obj) this._jointObjMap[name] = obj
    }

    this._q = this.zeroConfiguration
    this._tipJointIndices = this._computeTipJointIndices()

    this.printJointNames()
  }

  /** For each tip link, find all ancestor joint indices in its kinematic chain.
   *  If an ancestor is a mimic joint, include its parent (mimicked) joint instead. */
  private _computeTipJointIndices(): number[][] {
    const jointSet = new Set(this._joints)
    const allJoints = this._kinematics.joints
    this._mimicResolvedJoints = []
    return this._tipLinks.map(tipName => {
      const directAncestors = new Set<string>()
      const mimicResolved = new Set<string>()
      let obj: THREE.Object3D | null = this._getLink(tipName)
      while (obj && obj !== this._root) {
        const name = obj.name
        if (jointSet.has(name)) {
          directAncestors.add(name)
        } else if (allJoints[name]?.mimics) {
          mimicResolved.add(allJoints[name].mimics!)
        }
        obj = obj.parent
      }
      const allAncestors = new Set([...directAncestors, ...mimicResolved])
      const indices: number[] = []
      const mimicIndices = new Set<number>()
      for (let i = 0; i < this._joints.length; i++) {
        if (allAncestors.has(this._joints[i])) {
          indices.push(i)
          if (mimicResolved.has(this._joints[i]) && !directAncestors.has(this._joints[i])) {
            mimicIndices.add(i)
          }
        }
      }
      this._mimicResolvedJoints.push(mimicIndices)
      return indices
    })
  }

  /** Get or create pre-allocated solver buffers for the given problem size. */
  private _ensureBuf(totalDim: number, nj: number): SolverBuffers {
    const key = `${totalDim},${nj}`
    if (this._solverBuf?.key === key) return this._solverBuf.buf
    const buf = new SolverBuffers(totalDim, nj)
    this._solverBuf = { key, buf }
    return buf
  }

  plotEllipsoid(A: la.Mat, name: string): void {
    const geometry = new THREE.SphereGeometry(1)
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
    const ps: number[][] = []
    for (let i = 0; i < posAttr.count; i++) {
      ps.push([posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)])
    }

    const sqrtA = la.sqrtm3x3Symmetric(A)
    const P = la.fromRows(ps)            // count × 3
    const Pt = la.transpose(P)           // 3 × count
    const pe = la.multiply(sqrtA, Pt)    // 3 × count

    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setXYZ(i, pe.data[i], pe.data[posAttr.count + i], pe.data[2 * posAttr.count + i])
    }
    posAttr.needsUpdate = true

    const lineSegments = new THREE.LineSegments(new THREE.WireframeGeometry(geometry))
    const material = lineSegments.material as THREE.LineBasicMaterial
    material.depthTest = false
    material.opacity = 0.5
    material.transparent = true

    material.color = ((name: string) => {
      switch (name) {
        case 'acceleration-ellipsoid': return new THREE.Color(0xfbbf24)
        case 'force-ellipsoid': return new THREE.Color(0xf87171)
        case 'velocity-ellipsoid': return new THREE.Color(0x60a5fa)
        default: return new THREE.Color(0x9ca3af)
      }
    })(name)

    const existing = this._scene.getObjectByName(name)
    if (existing) this._scene.remove(existing)

    const ellipsoid = lineSegments
    ellipsoid.name = name

    const eff = robotMath.transl(this.fkine(this.configuration).elements)
    ellipsoid.position.set(eff.x, eff.y, eff.z)

    this._scene.add(ellipsoid)
  }

  updateAccelerationEllipsoid(): void {
    const M = this.computeInertia()

    // Guard: if M is (near-)singular the model lacks inertial data
    const n = M.rows
    let mDiag = 0
    for (let i = 0; i < n; i++) mDiag += Math.abs(M.data[i * n + i])
    if (mDiag < 1e-10) {
      const existing = this._scene.getObjectByName('acceleration-ellipsoid')
      if (existing) this._scene.remove(existing)
      return
    }

    // Full-DOF Jacobian (all n joints) so dimensions match the n×n inertia matrix.
    // Columns for joints outside the tip's chain are zero, which correctly
    // excludes their inertia from the end-effector acceleration ellipsoid.
    const allJoints: number[] = []
    for (let i = 0; i < n; i++) allJoints.push(i)
    const Jm = la.fromRows(this.geometricJacobian(0, '', allJoints))
    const Jt = la.transpose(Jm)
    const Minv = la.inv(M)

    // J * Minv² * J^T — Minv is symmetric so Minv^T = Minv
    const MinvJt = la.multiply(Minv, Jt)
    const full = la.multiply(Jm, la.multiply(Minv, MinvJt))

    // Extract top-left 3×3 block (translational)
    const Mx = la.mat(3, 3)
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        Mx.data[i * 3 + j] = full.data[i * full.cols + j]

    // Normalize to match velocity ellipsoid scale so the shape (directional
    // distribution of acceleration capability) is visually comparable.
    const Jv = la.fromRows(this.geometricJacobian(0, 'translational'))
    const JJt = la.multiply(Jv, la.transpose(Jv))
    const velTrace = JJt.data[0] + JJt.data[4] + JJt.data[8]
    const accTrace = Mx.data[0] + Mx.data[4] + Mx.data[8]
    if (accTrace > 1e-20) {
      const scale = velTrace / accTrace
      for (let i = 0; i < 9; i++) Mx.data[i] *= scale
    }

    this.plotEllipsoid(Mx, 'acceleration-ellipsoid')
  }

  updateForceEllipsoid(): void {
    const indices = this._tipJointIndices[0]
    const n = indices.length
    const Jm = la.fromRows(this.geometricJacobian(0, 'translational'))
    const JJt = la.multiply(Jm, la.transpose(Jm))
    const JJtInv = la.inv(JJt)
    const W = la.multiply(JJtInv, Jm)  // 3×n force mapping

    // Collect per-joint effort limits
    const efforts: number[] = []
    let hasEffort = false
    for (let j = 0; j < n; j++) {
      const eff = this._kinematics.joints[this._joints[indices[j]]].effort ?? 0
      if (eff > 0) hasEffort = true
      efforts.push(eff)
    }

    let E: la.Mat

    if (!hasEffort || !this.torqueWeightedEllipsoid) {
      // RMS-scaled: E = τ_rms² (JJᵀ)⁻¹.
      // Assumes ‖τ‖₂ ≤ τ_rms, a uniform norm bound in physical units.
      E = la.mat(3, 3)
      la.copyInto(E, JJtInv)
      if (hasEffort) {
        let sumSq = 0
        for (const eff of efforts) sumSq += eff * eff
        const tauRms = Math.sqrt(sumSq / n)
        const s2 = (tauRms * FORCE_SCALE) ** 2
        for (let i = 0; i < 9; i++) E.data[i] *= s2
      }
    } else {
      // Torque-weighted: E = (WT)(WT)ᵀ where T = diag(τ_max).
      // Uses per-joint limits so the ellipsoid better approximates the polytope.
      const WT = la.mat(3, n)
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < 3; i++) {
          WT.data[i * n + j] = W.data[i * n + j] * efforts[j]
        }
      }
      E = la.mat(3, 3)
      la.multiplyABtInto(E, WT, WT)
      const s2 = FORCE_SCALE * FORCE_SCALE
      for (let i = 0; i < 9; i++) E.data[i] *= s2
    }

    // Log rendered semi-axes
    const semiAxes = Robot._eigenvalues3x3Symmetric(E).map(v => Math.sqrt(v))
    semiAxes.sort((a, b) => b - a)
    const ellVol = (4 / 3) * Math.PI * semiAxes[0] * semiAxes[1] * semiAxes[2]
    console.log(
      `[Force Ellipsoid] mode=${this.torqueWeightedEllipsoid ? 'torque-weighted' : 'unweighted'}` +
      ` | semi-axes=[${semiAxes.map(v => v.toFixed(4)).join(', ')}]` +
      ` | volume=${ellVol.toFixed(6)}`
    )

    this.plotEllipsoid(E, 'force-ellipsoid')
  }

  /** Eigenvalues of a 3×3 symmetric matrix (analytical, Cardano's method). */
  private static _eigenvalues3x3Symmetric(A: la.Mat): number[] {
    const a = A.data
    const p1 = a[1] * a[1] + a[2] * a[2] + a[5] * a[5]  // off-diagonal sum of squares
    if (p1 < 1e-30) return [a[0], a[4], a[8]]  // already diagonal

    const q = (a[0] + a[4] + a[8]) / 3  // trace / 3
    const p2 = (a[0] - q) ** 2 + (a[4] - q) ** 2 + (a[8] - q) ** 2 + 2 * p1
    const p = Math.sqrt(p2 / 6)

    // B = (1/p)(A - qI)
    const b00 = (a[0] - q) / p, b01 = a[1] / p, b02 = a[2] / p
    const b11 = (a[4] - q) / p, b12 = a[5] / p
    const b22 = (a[8] - q) / p

    // det(B) for symmetric 3x3
    const detB = b00 * (b11 * b22 - b12 * b12)
               - b01 * (b01 * b22 - b12 * b02)
               + b02 * (b01 * b12 - b11 * b02)
    const r = detB / 2

    // Clamp for numerical safety
    const phi = Math.acos(Math.max(-1, Math.min(1, r))) / 3

    const eig1 = q + 2 * p * Math.cos(phi)
    const eig3 = q + 2 * p * Math.cos(phi + (2 * Math.PI / 3))
    const eig2 = 3 * q - eig1 - eig3  // trace = sum of eigenvalues
    return [eig1, eig2, eig3]
  }

  updateVelocityEllipsoid(): void {
    const Jm = la.fromRows(this.geometricJacobian(0, 'translational'))
    this.plotEllipsoid(la.multiply(Jm, la.transpose(Jm)), 'velocity-ellipsoid')
  }

  /**
   * Plot a convex polytope as a wireframe at the end-effector.
   *
   * @param vertices Array of 3D points (the polytope vertices in task space)
   * @param name Scene object name for replacement/removal
   */
  plotPolytope(vertices: THREE.Vector3[], name: string): void {
    const existing = this._scene.getObjectByName(name)
    if (existing) this._scene.remove(existing)

    if (vertices.length < 4) return  // need at least 4 non-coplanar points

    const geometry = new ConvexGeometry(vertices)

    // Semi-transparent solid faces
    const solidMat = new THREE.MeshBasicMaterial({
      color: 0xf87171,
      transparent: true,
      opacity: 0.15,
      depthTest: false,
      side: THREE.DoubleSide,
    })
    const solid = new THREE.Mesh(geometry, solidMat)

    // Wireframe edges on top
    const wireMat = new THREE.LineBasicMaterial({
      color: 0xf87171,
      transparent: true,
      opacity: 0.6,
      depthTest: false,
    })
    const wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), wireMat)

    const group = new THREE.Group()
    group.add(solid)
    group.add(wireframe)
    group.name = name

    const eff = robotMath.transl(this.fkine(this.configuration).elements)
    group.position.set(eff.x, eff.y, eff.z)

    this._scene.add(group)
  }

  /**
   * Force polytope: the set of feasible end-effector forces given joint torque limits.
   *
   * The feasible force set is the zonotope  F = { J⁺ᵀ τ : |τᵢ| ≤ τ_max_i }
   * where J⁺ᵀ = (JJᵀ)⁻¹ J maps joint torques to task-space forces.
   *
   * We enumerate all 2ⁿ vertices of the torque hypercube and map each through
   * the force mapping, then take the convex hull for rendering.
   */
  updateForcePolytope(): void {
    const indices = this._tipJointIndices[0]
    const n = indices.length

    // Guard: cap at 16 DOF to keep 2^n vertex enumeration tractable
    if (n < 3 || n > 16) {
      const existing = this._scene.getObjectByName('force-polytope')
      if (existing) this._scene.remove(existing)
      return
    }

    // Collect effort limits for the tip's joints
    const efforts: number[] = []
    let hasEffort = false
    for (const ji of indices) {
      const joint = this._kinematics.joints[this._joints[ji]]
      const eff = joint.effort ?? 0
      efforts.push(eff)
      if (eff > 0) hasEffort = true
    }

    // If no effort data, remove polytope and bail
    if (!hasEffort) {
      const existing = this._scene.getObjectByName('force-polytope')
      if (existing) this._scene.remove(existing)
      return
    }

    // 3×n translational Jacobian for the tip's joints
    const J = la.fromRows(this.geometricJacobian(0, 'translational'))

    // Force mapping: W = (JJᵀ)⁻¹ J  (3×n)
    // Guard against singularity: check manipulability before inverting
    const JJt = la.multiply(J, la.transpose(J))
    const lu = la.mat(3, 3)
    la.copyInto(lu, JJt)
    const pivots = new Int32Array(3)
    const sign = la.luDecomposeInPlace(lu, pivots)
    const det = la.luDet(lu, sign)
    if (Math.abs(det) < 1e-10) {
      const existing = this._scene.getObjectByName('force-polytope')
      if (existing) this._scene.remove(existing)
      return
    }
    const JJtInv = la.mat(3, 3)
    la.luInvertInto(JJtInv, lu, pivots)
    const W = la.multiply(JJtInv, J)

    // Enumerate 2^n torque hypercube vertices → task-space force vertices
    const numVertices = 1 << n  // 2^n
    const tau = new Float64Array(n)
    const force = new Float64Array(3)
    const vertices: THREE.Vector3[] = []

    for (let v = 0; v < numVertices; v++) {
      for (let j = 0; j < n; j++) {
        tau[j] = (v & (1 << j)) ? efforts[j] : -efforts[j]
      }
      la.matVecMultiplyInto(force, W, tau)
      vertices.push(new THREE.Vector3(force[0], force[1], force[2]))
    }

    for (const v of vertices) v.multiplyScalar(FORCE_SCALE)

    // Log polytope metrics
    let maxR = 0, minR = Infinity
    const extents = [0, 0, 0]
    for (const v of vertices) {
      const r = v.length()
      if (r > maxR) maxR = r
      if (r < minR) minR = r
      extents[0] = Math.max(extents[0], Math.abs(v.x))
      extents[1] = Math.max(extents[1], Math.abs(v.y))
      extents[2] = Math.max(extents[2], Math.abs(v.z))
    }
    const polyVol = Robot._convexHullVolume(vertices)
    console.log(
      `[Force Polytope] ${numVertices} hypercube vertices, ${vertices.length} after mapping` +
      ` | extents=[${extents.map(v => v.toFixed(4)).join(', ')}]` +
      ` | max radius=${maxR.toFixed(4)}, min radius=${minR.toFixed(4)}` +
      ` | volume=${polyVol.toFixed(6)}`
    )

    this.plotPolytope(vertices, 'force-polytope')
  }

  /** Volume of a convex hull from a set of points (signed tetrahedra method). */
  private static _convexHullVolume(points: THREE.Vector3[]): number {
    const geometry = new ConvexGeometry(points)
    const pos = geometry.getAttribute('position') as THREE.BufferAttribute
    const idx = geometry.getIndex()
    const triCount = idx ? idx.count / 3 : pos.count / 3
    let vol = 0
    for (let t = 0; t < triCount; t++) {
      const i0 = t * 3
      const a = idx ? idx.getX(i0) : i0
      const b = idx ? idx.getX(i0 + 1) : i0 + 1
      const c = idx ? idx.getX(i0 + 2) : i0 + 2
      const ax = pos.getX(a), ay = pos.getY(a), az = pos.getZ(a)
      const bx = pos.getX(b), by = pos.getY(b), bz = pos.getZ(b)
      const cx = pos.getX(c), cy = pos.getY(c), cz = pos.getZ(c)
      // Signed volume of tetrahedron with origin
      vol += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx))
    }
    geometry.dispose()
    return Math.abs(vol) / 6
  }

  /**
   * Joint-space inertia matrix M(q) via the link-contribution method.
   *
   * For each link with URDF inertial data, computes the 6×n geometric Jacobian
   * at its center of mass and accumulates:
   *   M += Jv^T · m · Jv  +  Jw^T · I_world · Jw
   *
   * This is equivalent to CRBA but expressed in Cartesian coordinates, reusing
   * the same geometric Jacobian formulation used elsewhere. Complexity is
   * O(L · k²) where L = number of links and k = max chain depth, which is
   * optimal for the serial/near-serial chains in this application.
   */
  computeInertia(): la.Mat {
    const n = this._degreesOfFreedom
    const M = la.zeros(n, n)

    this._root.updateMatrixWorld()

    const _z = new THREE.Vector3()
    const _p = new THREE.Vector3()
    const _pCom = new THREE.Vector3()
    const _d = new THREE.Vector3()
    const _jointRot = new THREE.Matrix3()

    for (const name in this._linkMap) {
      const link = this._linkMap[name] as any
      const inertial = link.inertial
      if (!inertial || inertial.mass === 0) continue

      const mass = inertial.mass

      // COM in world frame
      _pCom.set(inertial.origin.xyz[0], inertial.origin.xyz[1], inertial.origin.xyz[2])
      link.localToWorld(_pCom)

      // Inertia tensor rotated to world frame
      const Iw = Robot._rotateInertiaToWorld(link.matrixWorld.elements, inertial)

      // Find ancestor controllable joints (walk link → root)
      const ancestors: number[] = []
      let obj: THREE.Object3D | null = link
      while (obj && obj !== this._root) {
        const idx = this._joints.indexOf(obj.name)
        if (idx >= 0) ancestors.push(idx)
        obj = obj.parent
      }
      ancestors.reverse()
      if (ancestors.length === 0) continue

      // Per-ancestor Jacobian columns at this link's COM
      const nAnc = ancestors.length
      const jv = new Float64Array(nAnc * 3)
      const jw = new Float64Array(nAnc * 3)

      for (let a = 0; a < nAnc; a++) {
        const ji = ancestors[a]
        const jointName = this._joints[ji]
        const jointObj = this._jointObjMap[jointName] ?? this._root.getObjectByName(jointName)!
        _jointRot.setFromMatrix4(jointObj.matrixWorld)
        _z.copy(this._kinematics.joints[jointName].axis).applyMatrix3(_jointRot).normalize()
        _p.setFromMatrixPosition(jointObj.matrixWorld)

        _d.subVectors(_pCom, _p)
        const off = a * 3
        jv[off]     = _z.y * _d.z - _z.z * _d.y
        jv[off + 1] = _z.z * _d.x - _z.x * _d.z
        jv[off + 2] = _z.x * _d.y - _z.y * _d.x
        jw[off]     = _z.x
        jw[off + 1] = _z.y
        jw[off + 2] = _z.z
      }

      // Accumulate M[i,j] += m · Jv_a · Jv_b + Jw_a^T · Iw · Jw_b
      for (let a = 0; a < nAnc; a++) {
        const i = ancestors[a]
        const oa = a * 3
        for (let b = a; b < nAnc; b++) {
          const j = ancestors[b]
          const ob = b * 3

          let val = mass * (jv[oa] * jv[ob] + jv[oa + 1] * jv[ob + 1] + jv[oa + 2] * jv[ob + 2])

          for (let k = 0; k < 3; k++) {
            const ik = k * 3
            val += jw[oa + k] * (Iw[ik] * jw[ob] + Iw[ik + 1] * jw[ob + 1] + Iw[ik + 2] * jw[ob + 2])
          }

          M.data[i * n + j] += val
          if (i !== j) M.data[j * n + i] += val
        }
      }
    }

    return M
  }

  /** Rotate a link's inertia tensor from the URDF inertial frame to world frame.
   *  Returns a row-major 3×3 Float64Array: I_world = R_wi · I · R_wi^T */
  private static _rotateInertiaToWorld(matrixWorldElements: ArrayLike<number>, inertial: any): Float64Array {
    const { ixx, ixy, ixz, iyy, iyz, izz } = inertial.inertia
    const rpy = inertial.origin.rpy
    const wm = matrixWorldElements // column-major 4×4

    // R_wl (world ← link) extracted as row-major 3×3
    let R: Float64Array

    if (rpy[0] === 0 && rpy[1] === 0 && rpy[2] === 0) {
      // Common case: inertial frame aligned with link frame
      R = new Float64Array([
        wm[0], wm[4], wm[8],
        wm[1], wm[5], wm[9],
        wm[2], wm[6], wm[10],
      ])
    } else {
      // R_li from RPY (URDF fixed-axis XYZ = R_z(yaw) · R_y(pitch) · R_x(roll))
      const cr = Math.cos(rpy[0]), sr = Math.sin(rpy[0])
      const cp = Math.cos(rpy[1]), sp = Math.sin(rpy[1])
      const cy = Math.cos(rpy[2]), sy = Math.sin(rpy[2])
      const Rli = [
        cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr,
        sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr,
        -sp,     cp * sr,                cp * cr,
      ]
      // R_wi = R_wl · R_li
      R = new Float64Array(9)
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) {
          let sum = 0
          for (let k = 0; k < 3; k++) sum += wm[k * 4 + i] * Rli[k * 3 + j]
          R[i * 3 + j] = sum
        }
    }

    // I_world = R · I · R^T  (I is symmetric)
    const I = [ixx, ixy, ixz, ixy, iyy, iyz, ixz, iyz, izz]
    const RI = new Float64Array(9)
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        RI[i * 3 + j] = R[i * 3] * I[j] + R[i * 3 + 1] * I[3 + j] + R[i * 3 + 2] * I[6 + j]

    const Iw = new Float64Array(9)
    for (let i = 0; i < 3; i++)
      for (let j = i; j < 3; j++) {
        const val = RI[i * 3] * R[j * 3] + RI[i * 3 + 1] * R[j * 3 + 1] + RI[i * 3 + 2] * R[j * 3 + 2]
        Iw[i * 3 + j] = val
        Iw[j * 3 + i] = val
      }

    return Iw
  }

  /** Compute the robot's center of mass in world frame. */
  computeCenterOfMass(): THREE.Vector3 {
    this._root.updateMatrixWorld()
    const com = new THREE.Vector3()
    const linkCom = new THREE.Vector3()
    let totalMass = 0

    for (const name in this._linkMap) {
      const link = this._linkMap[name] as any
      const inertial = link.inertial
      if (!inertial || inertial.mass === 0) continue

      // inertial.origin.xyz is the COM offset in the link's local frame
      linkCom.set(inertial.origin.xyz[0], inertial.origin.xyz[1], inertial.origin.xyz[2])
      link.localToWorld(linkCom)

      com.addScaledVector(linkCom, inertial.mass)
      totalMass += inertial.mass
    }

    if (totalMass > 0) com.divideScalar(totalMass)
    return com
  }

  updateCenterOfMass(): void {
    const com = this.computeCenterOfMass()

    let marker = this._scene.getObjectByName('center-of-mass') as THREE.Mesh | undefined
    if (!marker) {
      const geo = new THREE.SphereGeometry(0.03, 16, 16)
      const mat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, depthTest: false, transparent: true, opacity: 0.9 })
      marker = new THREE.Mesh(geo, mat)
      marker.name = 'center-of-mass'
      marker.renderOrder = 999
      this._scene.add(marker)
    }

    marker.position.copy(com)
  }

  get motionKeypoints(): number[][] {
    return this._motionKeypoints
  }

  clearMotionKeypoints(): void {
    this._motionKeypoints = []
  }

  saveMotionKeypoint(): void {
    this._motionKeypoints.push(this.configuration)
  }

  printJointNames(): void {
    console.log(this._joints)
  }

  get degreesOfFreedom(): number {
    return this._degreesOfFreedom
  }

  set degreesOfFreedom(_value: number) {
    throw new Error('You cannot change the degrees of freedom of a robot.')
  }

  get tipLinks(): string[] { return this._tipLinks }

  /** Returns true if all joints of tip `a` are a subset of tip `b`'s joints. */
  isTipSubsetOf(a: number, b: number): boolean {
    const setB = new Set(this._tipJointIndices[b])
    return this._tipJointIndices[a].every(j => setB.has(j))
  }

  /** Resolve a link by name, preferring the urdf-loader link map over scene-graph search. */
  private _getLink(name: string): THREE.Object3D | null {
    return this._linkMap[name] ?? this._root.getObjectByName(name) ?? null
  }

  getLinkPose(linkName: string): THREE.Matrix4 {
    this._root.updateMatrixWorld()
    const obj = this._getLink(linkName)
    if (!obj) {
      console.warn(`Robot.getLinkPose: link "${linkName}" not found`)
      return new THREE.Matrix4()
    }
    return obj.matrixWorld
  }

  fkine(q: number[], tipIndex = 0): THREE.Matrix4 {
    const q_backup = this.configuration

    this.configuration = q
    this._root.updateMatrixWorld()

    const T = this._getLink(this.tipLinks[tipIndex])!.matrixWorld.clone()

    this.configuration = q_backup
    this._root.updateMatrixWorld()

    return T
  }

  /** Read a tip link's world matrix using chain-only update (no full scene traversal). */
  private _fkineTip(tipIndex: number): THREE.Matrix4 {
    const tipObj = this._getLink(this._tipLinks[tipIndex])!
    tipObj.updateWorldMatrix(true, false)
    return tipObj.matrixWorld
  }

  updateShadowsState(castShadows: boolean): void {
    this._root.traverse(function (child) {
      if (child instanceof THREE.Mesh) {
        child.castShadow = castShadows
        child.receiveShadow = castShadows
      }
    })
  }

  get configuration(): number[] {
    return this._q.slice()
  }

  get zeroConfiguration(): number[] {
    return new Array(this._degreesOfFreedom + 1).join('0').split('').map(parseFloat)
  }

  get randomConfiguration(): number[] {
    const q: number[] = []

    for (const prop in this._kinematics.joints) {
      if (this._kinematics.joints.hasOwnProperty(prop)) {
        const joint = this._kinematics.joints[prop]
        if (!joint.static) {
          q.push(THREE.MathUtils.randFloat(joint.limits.min, joint.limits.max))
        }
      }
    }

    return q
  }

  setJointValue(name: string, value: number): void {
    value = robotMath.clamp(value, this._kinematics.joints[name].limits.min, this._kinematics.joints[name].limits.max)

    this._kinematics.setJointValue(name, value)
    this._q[this._joints.indexOf(name)] = value
  }

  set configuration(q: number[]) {
    try {
      if (q.length !== this.degreesOfFreedom) {
        throw new Error('set configuration (q): q must be the same size as the robot DoF.')
      } else {
        this._q = q.slice()
        let joint = 0
        for (const prop in this._kinematics.joints) {
          if (this._kinematics.joints.hasOwnProperty(prop)) {
            if (!this._kinematics.joints[prop].static) {
              this.setJointValue(prop, q[joint++])
            }
          }
        }
      }
    } catch (e: unknown) {
      const err = e as Error
      console.log(err.name + ': ' + err.message)
    }
  }

  // ── Pure-math batch FK (for reachability) ──

  /** Lazily build and cache FK chains + joint-limit arrays. */
  private _ensureFkChains(): void {
    if (this._fkChains) return
    this._fkChains = this._buildFkChains()
    const n = this._degreesOfFreedom
    const lo = new Float64Array(n)
    const hi = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      const j = this._kinematics.joints[this._joints[i]]
      lo[i] = j.limits.min
      hi[i] = j.limits.max
    }
    this._limitsMin = lo
    this._limitsMax = hi
  }

  /**
   * Build a pure-math FK chain for each tip link by walking the scene graph.
   *
   * Each chain is an array of segments. A segment with qIdx >= 0 represents a
   * joint: its `m` is the pre-multiplied static transforms up to (and including)
   * the joint-origin transform; at runtime revolute segments contribute
   * `m · R(axis, θ)` and prismatic segments contribute `m · T(axis, d)`.
   * A segment with qIdx === -1 is a trailing static transform.
   *
   * The chain captures the current joint values as reference so it can compute
   * the correct motion delta for any target configuration.
   * Since R(axis, a) · R(axis, b) = R(axis, a+b), the reference cancels out,
   * making the chain valid regardless of when it was built.
   */
  private _buildFkChains(): FkSeg[][] {
    const allJoints = this._kinematics.joints
    const jointSet = new Set(this._joints)
    const chains: FkSeg[][] = []

    this._root.updateMatrixWorld(true)

    for (const tipName of this._tipLinks) {
      // Collect path from root's child to tip (exclusive of _root itself)
      const path: THREE.Object3D[] = []
      let obj: THREE.Object3D | null = this._getLink(tipName)
      while (obj && obj !== this._root) {
        path.push(obj)
        obj = obj.parent
      }
      path.reverse()

      const segs: FkSeg[] = []
      // Accumulated static transform (identity)
      const acc = new Float64Array(16)
      acc[0] = acc[5] = acc[10] = acc[15] = 1

      for (const node of path) {
        node.updateMatrix()
        const lm = node.matrix.elements

        const jInfo = allJoints[node.name]
        const isControllable = jInfo != null && jointSet.has(node.name)
        const isMimic = jInfo != null && !isControllable && !!jInfo.mimics

        if (isControllable || isMimic) {
          // Merge accumulated statics with this joint's current local matrix
          const merged = new Float64Array(16)
          mat4Multiply(merged, acc, lm)

          const qIdx = isControllable
            ? this._joints.indexOf(node.name)
            : this._joints.indexOf(jInfo!.mimics!)
          const refDeg = this._q[qIdx]
          const mul = isMimic ? (jInfo!.mimicMultiplier ?? 1) : 1
          const off = isMimic ? (jInfo!.mimicOffset ?? 0) : 0

          segs.push({
            m: merged, qIdx,
            prismatic: !!jInfo!.prismatic,
            ax: jInfo!.axis.x, ay: jInfo!.axis.y, az: jInfo!.axis.z,
            refDeg, mul, off,
          })

          // Reset accumulator to identity
          acc.fill(0)
          acc[0] = acc[5] = acc[10] = acc[15] = 1
        } else {
          // Non-joint (or fixed joint): accumulate its local transform
          const tmp = new Float64Array(16)
          mat4Multiply(tmp, acc, lm)
          acc.set(tmp)
        }
      }

      // Trailing static transforms after the last joint
      if (acc[1] !== 0 || acc[2] !== 0 || acc[3] !== 0 || acc[4] !== 0 ||
          acc[6] !== 0 || acc[7] !== 0 || acc[8] !== 0 || acc[9] !== 0 ||
          acc[11] !== 0 || acc[12] !== 0 || acc[13] !== 0 || acc[14] !== 0 ||
          acc[0] !== 1 || acc[5] !== 1 || acc[10] !== 1 || acc[15] !== 1) {
        segs.push({ m: Float64Array.from(acc), qIdx: -1, prismatic: false, ax: 0, ay: 0, az: 0, refDeg: 0, mul: 1, off: 0 })
      }

      chains.push(segs)
    }

    return chains
  }

  /**
   * Compute tip-link positions for many random configurations using pure-math FK.
   *
   * This is orders of magnitude faster than setting `configuration` + `getLinkPose`
   * in a loop because it never touches the Three.js scene graph or urdf-loader.
   *
   * @returns One Float32Array per tip link, each containing interleaved [x,y,z,…] positions.
   */
  computeReachability(numSamples: number): Float32Array[] {
    this._ensureFkChains()
    const chains = this._fkChains!
    const lo = this._limitsMin!
    const hi = this._limitsMax!
    const nDof = this._degreesOfFreedom
    const nTips = this._tipLinks.length

    // Capture root world matrix once (includes the Z-up → Y-up rotation)
    this._root.updateMatrixWorld(true)
    const rootWorld = new Float64Array(this._root.matrixWorld.elements)

    // Pre-allocate output buffers
    const out: Float32Array[] = []
    for (let t = 0; t < nTips; t++) out.push(new Float32Array(numSamples * 3))

    // Scratch matrices (reused every iteration)
    const T = new Float64Array(16)
    const R = new Float64Array(16)
    const tmp = new Float64Array(16)
    const q = new Float64Array(nDof)

    for (let s = 0; s < numSamples; s++) {
      // Generate random configuration (degrees)
      for (let d = 0; d < nDof; d++) {
        q[d] = lo[d] + Math.random() * (hi[d] - lo[d])
      }

      for (let t = 0; t < nTips; t++) {
        const segs = chains[t]
        // Start with root world matrix
        T.set(rootWorld)

        for (let si = 0; si < segs.length; si++) {
          const seg = segs[si]

          // T = T * seg.m  (static pre-transform)
          mat4Multiply(tmp, T, seg.m)
          T.set(tmp)

          if (seg.qIdx >= 0) {
            const delta = seg.mul * (q[seg.qIdx] - seg.refDeg)
            if (seg.prismatic) {
              // T = T * Translation(axis, delta)  (meters)
              mat4Translation(R, seg.ax, seg.ay, seg.az, delta)
            } else {
              // T = T * R(axis, delta · DEG2RAD)
              mat4AxisAngle(R, seg.ax, seg.ay, seg.az, delta * DEG2RAD)
            }
            mat4Multiply(tmp, T, R)
            T.set(tmp)
          }
        }

        // Extract position (column 3 of the column-major 4×4)
        const off = s * 3
        out[t][off]     = T[12]
        out[t][off + 1] = T[13]
        out[t][off + 2] = T[14]
      }
    }

    return out
  }

  // ── Jacobian ──

  /**
   * Analytical geometric Jacobian for a single tip link.
   *
   * For each revolute joint i:
   *   J_linear[i]  = z_i × (p_ee − p_i)
   *   J_angular[i] = z_i
   *
   * For each prismatic joint i:
   *   J_linear[i]  = z_i
   *   J_angular[i] = 0
   *
   * where z_i is the joint axis in world frame and p_i, p_ee are world positions.
   */
  geometricJacobian(tipIndex = 0, partial: Partial = '', jointIndices?: number[]): number[][] {
    const indices = jointIndices ?? this._tipJointIndices[tipIndex]
    if (indices.length === 0 && !jointIndices) {
      // Fallback: use all joints (e.g. for serial manipulators with a single tip)
      const all: number[] = []
      for (let i = 0; i < this._joints.length; i++) all.push(i)
      return this.geometricJacobian(tipIndex, partial, all)
    }

    const nCols = indices.length
    const mimicSet = this._mimicResolvedJoints[tipIndex] ?? new Set<number>()
    const tipObj = this._getLink(this._tipLinks[tipIndex])!
    tipObj.updateWorldMatrix(true, false)

    const pEe = new THREE.Vector3().setFromMatrixPosition(tipObj.matrixWorld)

    const cols: number[][] = new Array(nCols)
    const _z = new THREE.Vector3()
    const _p = new THREE.Vector3()
    const _d = new THREE.Vector3()
    const _rot = new THREE.Matrix3()

    for (let ci = 0; ci < nCols; ci++) {
      const ji = indices[ci]
      const jointName = this._joints[ji]

      // Mimic-resolved joints: the joint is not a physical ancestor of the tip,
      // so the geometric formula doesn't apply. Use numerical differentiation.
      if (mimicSet.has(ji)) {
        cols[ci] = this._numericalJacobianColumn(tipIndex, ji, partial)
        continue
      }

      const jInfo = this._kinematics.joints[jointName]
      const jointObj = this._jointObjMap[jointName] ?? this._root.getObjectByName(jointName)!
      // Joint axis is defined in the joint's local frame — transform to world
      _rot.setFromMatrix4(jointObj.matrixWorld)
      _z.copy(jInfo.axis).applyMatrix3(_rot).normalize()
      _p.setFromMatrixPosition(jointObj.matrixWorld)

      if (jInfo.prismatic) {
        // Prismatic: linear = z_i (translation along axis), angular = 0
        if (partial === 'translational') {
          cols[ci] = [_z.x, _z.y, _z.z]
        } else if (partial === 'rotational') {
          cols[ci] = [0, 0, 0]
        } else {
          cols[ci] = [_z.x, _z.y, _z.z, 0, 0, 0]
        }
      } else {
        // Revolute: linear = z_i × (p_ee − p_i), angular = z_i
        _d.subVectors(pEe, _p)
        const dx = _z.y * _d.z - _z.z * _d.y
        const dy = _z.z * _d.x - _z.x * _d.z
        const dz = _z.x * _d.y - _z.y * _d.x

        if (partial === 'translational') {
          cols[ci] = [dx, dy, dz]
        } else if (partial === 'rotational') {
          cols[ci] = [_z.x, _z.y, _z.z]
        } else {
          cols[ci] = [dx, dy, dz, _z.x, _z.y, _z.z]
        }
      }
    }

    // Transpose from column-major to row-major (nRows × nCols)
    const nRows = partial === '' ? 6 : 3
    const rows: number[][] = new Array(nRows)
    for (let r = 0; r < nRows; r++) {
      const row = new Array(nCols)
      for (let c = 0; c < nCols; c++) row[c] = cols[c][r]
      rows[r] = row
    }
    return rows
  }

  /** Compute one Jacobian column by finite-difference perturbation (for mimic-resolved joints). */
  private _numericalJacobianColumn(tipIndex: number, jointIdx: number, partial: Partial): number[] {
    const jointName = this._joints[jointIdx]
    const isPrismatic = !!this._kinematics.joints[jointName].prismatic
    const eps = isPrismatic ? 0.001 : 0.5 // meters or degrees
    const origVal = this._q[jointIdx]
    const tipObj = this._getLink(this._tipLinks[tipIndex])!

    // Forward perturbation
    this.setJointValue(jointName, origVal + eps)
    this._root.updateMatrixWorld(true)
    const e1 = tipObj.matrixWorld.elements.slice()

    // Backward perturbation
    this.setJointValue(jointName, origVal - eps)
    this._root.updateMatrixWorld(true)
    const e0 = tipObj.matrixWorld.elements.slice()

    // Compute delta from the two poses
    const delta = robotMath.tr2delta(e0, e1, partial)

    // Restore original value
    this.setJointValue(jointName, origVal)
    this._root.updateMatrixWorld(true)

    // Prismatic: delta/eps is already in m/m = unitless → scale by 1/(2*eps)
    // Revolute: delta/eps needs deg→rad conversion → scale by 1/(2*eps*DEG2RAD)
    const scale = isPrismatic ? 1 / (2 * eps) : 1 / (2 * eps * THREE.MathUtils.DEG2RAD)
    return Array.from(delta, v => v * scale)
  }

  // ── IK Solver ──

  /**
   * Damped least-squares IK with adaptive damping and null-space regularization.
   *
   * - Adaptive damping (Nakamura & Hanafusa): increases damping near singularities
   *   based on the manipulability measure w = sqrt(det(J·Jᵀ)).
   * - Null-space bias: when there are more joints than task DOFs (e.g. 7-DOF arm
   *   with 6D task), projects a secondary objective (pull toward joint midpoints)
   *   into the null space to escape singularities and avoid joint limits.
   */
  private _solveIk(tipIndex: number, tfElements: ArrayLike<number>, jointIndices: number[], partial: Partial): number {
    const maxIterations = 50
    const tolerance = 1e-3
    const alpha = 0.2
    const lambdaMax = 0.04
    const manipThreshold = 0.01
    const nullSpaceGain = 0.5

    const nj = jointIndices.length
    const dim = partial === '' ? 6 : 3
    const hasNullSpace = nj > dim
    const buf = this._ensureBuf(dim, nj)

    // Precompute joint midpoints for null-space bias
    if (hasNullSpace) {
      for (let k = 0; k < nj; k++) {
        const ji = jointIndices[k]
        const joint = this._kinematics.joints[this._joints[ji]]
        buf.qDiff[k] = (joint.limits.min + joint.limits.max) / 2 // store midpoints in qDiff temporarily
      }
    }
    // Copy midpoints out so qDiff can be reused per-iteration
    const qMid = hasNullSpace ? Float64Array.from(buf.qDiff.subarray(0, nj)) : null

    let iteration = 0

    for (; iteration < maxIterations; iteration++) {
      const tipElements = this._fkineTip(tipIndex).elements
      robotMath.tr2delta(tipElements, tfElements, partial, buf.error)

      if (la.vecNorm(buf.error, dim) <= tolerance) break

      la.fromRows(this.geometricJacobian(tipIndex, partial, jointIndices), buf.J)

      this._solveIkStep(buf, dim, nj, alpha, lambdaMax, manipThreshold, jointIndices, hasNullSpace, nullSpaceGain, qMid)

      for (let k = 0; k < nj; k++) {
        const ji = jointIndices[k]
        // dq is in radians (revolute) or meters (prismatic)
        const dqNative = this._kinematics.joints[this._joints[ji]].prismatic
          ? buf.dq[k] : buf.dq[k] * THREE.MathUtils.RAD2DEG
        this.setJointValue(this._joints[ji], this._q[ji] + dqNative)
      }
    }

    return iteration
  }

  /**
   * One IK step: compute damped pseudo-inverse dq from the current J and error in buf.
   *
   * Joints at their limits are locked via a gradient check (J_col^T · error) to
   * determine if the task wants to push them further into the limit. Locked joints
   * have their Jacobian columns zeroed so the remaining joints absorb the work,
   * and their dq is zeroed after null-space to prevent jitter from midpoint pull.
   */
  private _solveIkStep(
    buf: SolverBuffers, dim: number, nj: number, alpha: number,
    lambdaMax: number, manipThreshold: number,
    jointIndices: number[], hasNullSpace: boolean, nullSpaceGain: number,
    qMid: Float64Array | null,
  ): void {
    // Lock joints at limits where the gradient pushes further into the limit
    let lockedMask = 0
    for (let k = 0; k < nj; k++) {
      const ji = jointIndices[k]
      const joint = this._kinematics.joints[this._joints[ji]]
      const q = this._q[ji]
      const atMax = q >= joint.limits.max - 1e-6
      const atMin = q <= joint.limits.min + 1e-6
      if (atMax || atMin) {
        // g = J_col^T · error — positive means joint wants to increase
        let g = 0
        for (let r = 0; r < dim; r++) g += buf.J.data[r * nj + k] * buf.error[r]
        if ((atMax && g > 0) || (atMin && g < 0)) {
          for (let r = 0; r < dim; r++) buf.J.data[r * nj + k] = 0
          lockedMask |= (1 << k)
        }
      }
    }

    this._computeDq(buf, dim, nj, alpha, lambdaMax, manipThreshold)

    // Null-space regularization: pull toward joint midpoints
    if (hasNullSpace && qMid) {
      for (let k = 0; k < nj; k++) {
        const diff = qMid[k] - this._q[jointIndices[k]]
        buf.qDiff[k] = this._kinematics.joints[this._joints[jointIndices[k]]].prismatic
          ? diff : diff * THREE.MathUtils.DEG2RAD
      }
      la.multiplyInto(buf.pinvJ!, buf.pinv, buf.J)
      la.identityInto(buf.nullProj!)
      la.subtractInto(buf.nullProj!, buf.nullProj!, buf.pinvJ!)
      la.matVecMultiplyInto(buf.nullStep!, buf.nullProj!, buf.qDiff)
      for (let k = 0; k < nj; k++) buf.dq[k] += nullSpaceGain * buf.nullStep![k]
    }

    // Zero dq for locked joints so nothing (task or null-space) moves them
    if (lockedMask) {
      for (let k = 0; k < nj; k++) {
        if (lockedMask & (1 << k)) buf.dq[k] = 0
      }
    }
  }

  /** Compute damped pseudo-inverse dq from J and error already in buf. */
  private _computeDq(
    buf: SolverBuffers, dim: number, nj: number, alpha: number,
    lambdaMax: number, manipThreshold: number,
  ): void {
    la.multiplyABtInto(buf.JJt, buf.J, buf.J)

    // Adaptive damping: increase near singularities
    la.copyInto(buf.luWork, buf.JJt)
    const sign = la.luDecomposeInPlace(buf.luWork, buf.pivots)
    const det = la.luDet(buf.luWork, sign)
    const w = Math.sqrt(Math.max(det, 0))
    const dampLambda = w < manipThreshold
      ? lambdaMax * (1 - (w / manipThreshold) ** 2)
      : 0

    la.addScaledIdentityInto(buf.A, buf.JJt, Math.max(dampLambda, 1e-4))
    la.luDecomposeInPlace(buf.A, buf.pivots)
    la.luInvertInto(buf.Ainv, buf.A, buf.pivots)
    la.multiplyAtBInto(buf.pinv, buf.J, buf.Ainv)

    la.matVecMultiplyInto(buf.dq, buf.pinv, buf.error)
    la.vecScaleInPlace(buf.dq, alpha, nj)
  }

  /** Compute dq with fixed damping (for whole-body IK). */
  private _computeDqFixed(buf: SolverBuffers, dim: number, nj: number, alpha: number, lambda: number): void {
    la.multiplyABtInto(buf.JJt, buf.J, buf.J)
    la.addScaledIdentityInto(buf.A, buf.JJt, lambda)
    la.luDecomposeInPlace(buf.A, buf.pivots)
    la.luInvertInto(buf.Ainv, buf.A, buf.pivots)
    la.multiplyAtBInto(buf.pinv, buf.J, buf.Ainv)
    la.matVecMultiplyInto(buf.dq, buf.pinv, buf.error)
    la.vecScaleInPlace(buf.dq, alpha, nj)
  }

  /** Use translational-only IK when the tip's chain has fewer than 6 joints. */
  private _tipPartial(tipIndex: number): Partial {
    return this._tipJointIndices[tipIndex].length < 6 ? 'translational' : ''
  }

  moveTipToPose(goal: THREE.Object3D, tipIndex = 0): void {
    const partial = this._tipPartial(tipIndex)
    const jointIndices = this._tipJointIndices[tipIndex]

    const start = Date.now()
    const iterations = this._solveIk(tipIndex, goal.matrixWorld.elements, jointIndices, partial)
    const delta = Date.now() - start

    this._root.updateMatrixWorld()

    if (this.showVelocityEllipsoid) this.updateVelocityEllipsoid()
    if (this.showForceEllipsoid) this.updateForceEllipsoid()
    if (this.showAccelerationEllipsoid) this.updateAccelerationEllipsoid()
    if (this.showCenterOfMass) this.updateCenterOfMass()

    console.log(`Solved with ${iterations} iterations (${delta} ms).`)
  }

  /**
   * Whole-body IK: solve all tips simultaneously with a stacked Jacobian.
   *
   * Shared joints (e.g. torso on a humanoid) appear in multiple tips' Jacobians,
   * so the solver naturally balances all tips through those joints rather than
   * letting one tip override another.
   */
  moveTipsToPoses(goals: THREE.Object3D[]): void {
    // Per-tip partial mode: tips with < 6 joints use translational only
    const tipPartials = goals.map((_, i) => this._tipPartial(i))
    const tipDims = tipPartials.map(p => p === '' ? 6 : 3)

    // Collect all unique joint indices across all tips (sorted)
    const allJointSet = new Set<number>()
    for (const indices of this._tipJointIndices) {
      for (const ji of indices) allJointSet.add(ji)
    }
    const allJoints = [...allJointSet].sort((a, b) => a - b)
    const nj = allJoints.length
    const totalDim = tipDims.reduce((a, b) => a + b, 0)

    // Map from global joint index to column in the stacked Jacobian
    const jointToCol = new Map<number, number>()
    for (let c = 0; c < nj; c++) jointToCol.set(allJoints[c], c)

    // Store goal elements references (column-major THREE.Matrix4.elements)
    const goalElements = goals.map(g => g.matrixWorld.elements)

    // Precompute joint midpoints for null-space bias
    const qMid = new Float64Array(nj)
    for (let c = 0; c < nj; c++) {
      const joint = this._kinematics.joints[this._joints[allJoints[c]]]
      qMid[c] = (joint.limits.min + joint.limits.max) / 2
    }

    const maxIterations = 100
    const tolerance = 1e-3
    const alpha = 0.5
    const lambda = 1e-3
    const nullSpaceGain = 0.1

    const buf = this._ensureBuf(totalDim, nj)

    // Temp buffer for per-tip tr2delta output
    const tipError = new Float64Array(6)

    const start = Date.now()
    let iteration = 0

    for (; iteration < maxIterations; iteration++) {
      // Build stacked error and Jacobian
      buf.J.data.fill(0)
      let maxTipError = 0
      let rowOffset = 0

      for (let ti = 0; ti < goals.length; ti++) {
        const dim = tipDims[ti]
        const p = tipPartials[ti]
        const tipElements = this._fkineTip(ti).elements
        robotMath.tr2delta(tipElements, goalElements[ti], p, tipError)

        let tipErrSq = 0
        for (let r = 0; r < dim; r++) {
          buf.error[rowOffset + r] = tipError[r]
          tipErrSq += tipError[r] * tipError[r]
        }
        maxTipError = Math.max(maxTipError, Math.sqrt(tipErrSq))

        // Per-tip Jacobian — place columns into the correct stacked positions
        const tipJoints = this._tipJointIndices[ti]
        const J = this.geometricJacobian(ti, p, tipJoints)
        for (let r = 0; r < dim; r++) {
          const rowBase = (rowOffset + r) * nj
          for (let c = 0; c < tipJoints.length; c++) {
            buf.J.data[rowBase + jointToCol.get(tipJoints[c])!] = J[r][c]
          }
        }
        rowOffset += dim
      }

      if (maxTipError <= tolerance) break

      // Lock joints at limits where the gradient pushes further into the limit
      let lockedMask = 0
      for (let c = 0; c < nj; c++) {
        const ji = allJoints[c]
        const joint = this._kinematics.joints[this._joints[ji]]
        const q = this._q[ji]
        const atMax = q >= joint.limits.max - 1e-6
        const atMin = q <= joint.limits.min + 1e-6
        if (atMax || atMin) {
          let g = 0
          for (let r = 0; r < totalDim; r++) g += buf.J.data[r * nj + c] * buf.error[r]
          if ((atMax && g > 0) || (atMin && g < 0)) {
            for (let r = 0; r < totalDim; r++) buf.J.data[r * nj + c] = 0
            lockedMask |= (1 << c)
          }
        }
      }

      this._computeDqFixed(buf, totalDim, nj, alpha, lambda)

      // Null-space regularization: pull toward joint midpoints
      if (nj > totalDim) {
        for (let c = 0; c < nj; c++) {
          const diff = qMid[c] - this._q[allJoints[c]]
          buf.qDiff[c] = this._kinematics.joints[this._joints[allJoints[c]]].prismatic
            ? diff : diff * THREE.MathUtils.DEG2RAD
        }
        la.multiplyInto(buf.pinvJ!, buf.pinv, buf.J)
        la.identityInto(buf.nullProj!)
        la.subtractInto(buf.nullProj!, buf.nullProj!, buf.pinvJ!)
        la.matVecMultiplyInto(buf.nullStep!, buf.nullProj!, buf.qDiff)
        for (let c = 0; c < nj; c++) buf.dq[c] += nullSpaceGain * buf.nullStep![c]
      }

      // Zero dq for locked joints so nothing (task or null-space) moves them
      if (lockedMask) {
        for (let c = 0; c < nj; c++) {
          if (lockedMask & (1 << c)) buf.dq[c] = 0
        }
      }

      for (let c = 0; c < nj; c++) {
        const ji = allJoints[c]
        const dqNative = this._kinematics.joints[this._joints[ji]].prismatic
          ? buf.dq[c] : buf.dq[c] * THREE.MathUtils.RAD2DEG
        this.setJointValue(this._joints[ji], this._q[ji] + dqNative)
      }
    }

    this._root.updateMatrixWorld()

    if (this.showVelocityEllipsoid) this.updateVelocityEllipsoid()
    if (this.showForceEllipsoid) this.updateForceEllipsoid()
    if (this.showAccelerationEllipsoid) this.updateAccelerationEllipsoid()
    if (this.showCenterOfMass) this.updateCenterOfMass()

    const delta = Date.now() - start
    console.log(`Whole-body IK: ${iteration} iters (${delta} ms).`)
  }
}
