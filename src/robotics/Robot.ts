import * as robotMath from './math.ts'
import { type Partial } from './math.ts'
import * as la from './linalg.ts'
import { SolverBuffers } from './linalg.ts'
import * as THREE from 'three'

export interface RobotJoint {
  static: boolean
  limits: { min: number; max: number }
  axis: THREE.Vector3
  mimics?: string  // name of the parent joint this joint mimics
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
  showCenterOfMass = false

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
    const geometry = new THREE.SphereGeometry(0.5)
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
    const Jm = la.fromRows(this.geometricJacobian())
    const Jt = la.transpose(Jm)

    const M = this.computeInertia()
    const Minv = la.inv(M)

    // J * Minv * Minv^T * J^T — but Minv is symmetric so Minv^T = Minv
    const MinvJt = la.multiply(Minv, Jt)
    const full = la.multiply(Jm, la.multiply(Minv, MinvJt))

    // Extract top-left 3x3 block
    const Mx = la.mat(3, 3)
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        Mx.data[i * 3 + j] = full.data[i * full.cols + j]

    this.plotEllipsoid(Mx, 'acceleration-ellipsoid')
  }

  updateForceEllipsoid(): void {
    const Jm = la.fromRows(this.geometricJacobian(0, 'translational'))
    const JJt = la.multiply(Jm, la.transpose(Jm))
    this.plotEllipsoid(la.inv(JJt), 'force-ellipsoid')
  }

  updateVelocityEllipsoid(): void {
    const Jm = la.fromRows(this.geometricJacobian(0, 'translational'))
    this.plotEllipsoid(la.multiply(Jm, la.transpose(Jm)), 'velocity-ellipsoid')
  }

  computeInertia(): la.Mat {
    console.log('Robot.ts@computeInertia: THIS IS NOT YET FUNCTIONAL !')
    return la.identity(6)
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

  // ── Jacobian ──

  /**
   * Analytical geometric Jacobian for a single tip link.
   *
   * For each revolute joint i in the kinematic chain to the tip:
   *   J_linear[i]  = z_i × (p_ee − p_i)
   *   J_angular[i] = z_i
   *
   * where z_i is the joint axis in world frame and p_i, p_ee are world positions.
   * This is O(n) cross products after one chain-only FK pass — no finite differences.
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

      const jointObj = this._jointObjMap[jointName] ?? this._root.getObjectByName(jointName)!
      // Joint axis is defined in the joint's local frame — transform to world
      const localAxis = this._kinematics.joints[jointName].axis
      _rot.setFromMatrix4(jointObj.matrixWorld)
      _z.copy(localAxis).applyMatrix3(_rot).normalize()
      _p.setFromMatrixPosition(jointObj.matrixWorld)

      // z_i × (p_ee − p_i)
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
    const eps = 0.5 // degrees
    const jointName = this._joints[jointIdx]
    const origVal = this._q[jointIdx]
    const tipObj = this._getLink(this._tipLinks[tipIndex])!

    // Forward perturbation
    this.setJointValue(jointName, origVal + eps)
    this._root.updateMatrixWorld(true)
    const e1 = tipObj.matrixWorld.elements

    // Backward perturbation
    this.setJointValue(jointName, origVal - eps)
    this._root.updateMatrixWorld(true)
    const e0 = tipObj.matrixWorld.elements

    // Compute delta from the two poses
    const delta = robotMath.tr2delta(e0, e1, partial)

    // Restore original value
    this.setJointValue(jointName, origVal)
    this._root.updateMatrixWorld(true)

    const scale = 1 / (2 * eps * THREE.MathUtils.DEG2RAD)
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

      // JJt = J * J^T
      la.multiplyABtInto(buf.JJt, buf.J, buf.J)

      // Adaptive damping: increase near singularities
      la.copyInto(buf.luWork, buf.JJt)
      const sign = la.luDecomposeInPlace(buf.luWork, buf.pivots)
      const det = la.luDet(buf.luWork, sign)
      const w = Math.sqrt(Math.max(det, 0))
      const dampLambda = w < manipThreshold
        ? lambdaMax * (1 - (w / manipThreshold) ** 2)
        : 0

      // A = JJt + lambda*I
      la.addScaledIdentityInto(buf.A, buf.JJt, Math.max(dampLambda, 1e-4))

      // pinv = J^T * inv(A)
      la.luDecomposeInPlace(buf.A, buf.pivots)
      la.luInvertInto(buf.Ainv, buf.A, buf.pivots)
      la.multiplyAtBInto(buf.pinv, buf.J, buf.Ainv)

      // dq = alpha * pinv * error
      la.matVecMultiplyInto(buf.dq, buf.pinv, buf.error)
      la.vecScaleInPlace(buf.dq, alpha, nj)

      // Null-space regularization: pull toward joint midpoints
      if (hasNullSpace && qMid) {
        // qDiff = qMid - q (in radians)
        for (let k = 0; k < nj; k++) {
          buf.qDiff[k] = (qMid[k] - this._q[jointIndices[k]]) * THREE.MathUtils.DEG2RAD
        }
        // nullProj = I - pinv * J
        la.multiplyInto(buf.pinvJ!, buf.pinv, buf.J)
        la.identityInto(buf.nullProj!)
        la.subtractInto(buf.nullProj!, buf.nullProj!, buf.pinvJ!)
        // dq += gain * nullProj * qDiff
        la.matVecMultiplyInto(buf.nullStep!, buf.nullProj!, buf.qDiff)
        for (let k = 0; k < nj; k++) buf.dq[k] += nullSpaceGain * buf.nullStep![k]
      }

      for (let k = 0; k < nj; k++) {
        const ji = jointIndices[k]
        this.setJointValue(this._joints[ji], this._q[ji] + buf.dq[k] * THREE.MathUtils.RAD2DEG)
      }
    }

    return iteration
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

      // JJt = J * J^T
      la.multiplyABtInto(buf.JJt, buf.J, buf.J)

      // A = JJt + lambda*I
      la.addScaledIdentityInto(buf.A, buf.JJt, lambda)

      // pinv = J^T * inv(A)
      la.luDecomposeInPlace(buf.A, buf.pivots)
      la.luInvertInto(buf.Ainv, buf.A, buf.pivots)
      la.multiplyAtBInto(buf.pinv, buf.J, buf.Ainv)

      // dq = alpha * pinv * error
      la.matVecMultiplyInto(buf.dq, buf.pinv, buf.error)
      la.vecScaleInPlace(buf.dq, alpha, nj)

      // Null-space regularization: pull toward joint midpoints
      if (nj > totalDim) {
        for (let c = 0; c < nj; c++) {
          buf.qDiff[c] = (qMid[c] - this._q[allJoints[c]]) * THREE.MathUtils.DEG2RAD
        }
        la.multiplyInto(buf.pinvJ!, buf.pinv, buf.J)
        la.identityInto(buf.nullProj!)
        la.subtractInto(buf.nullProj!, buf.nullProj!, buf.pinvJ!)
        la.matVecMultiplyInto(buf.nullStep!, buf.nullProj!, buf.qDiff)
        for (let c = 0; c < nj; c++) buf.dq[c] += nullSpaceGain * buf.nullStep![c]
      }

      for (let c = 0; c < nj; c++) {
        const ji = allJoints[c]
        this.setJointValue(this._joints[ji], this._q[ji] + buf.dq[c] * THREE.MathUtils.RAD2DEG)
      }
    }

    this._root.updateMatrixWorld()

    if (this.showVelocityEllipsoid) this.updateVelocityEllipsoid()
    if (this.showForceEllipsoid) this.updateForceEllipsoid()
    if (this.showCenterOfMass) this.updateCenterOfMass()

    const delta = Date.now() - start
    console.log(`Whole-body IK: ${iteration} iters (${delta} ms).`)
  }
}
