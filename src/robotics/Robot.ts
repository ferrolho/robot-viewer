import * as robotMath from './math.ts'
import { type Partial } from './math.ts'
import { math } from './math.ts'
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

  constructor(scene: THREE.Scene, sceneRoot: THREE.Object3D, kinematics: RobotKinematics, tipLinks: string[]) {
    this._scene = scene
    this._root = sceneRoot
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
      let obj: THREE.Object3D | null = this._root.getObjectByName(tipName) ?? null
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

  plotEllipsoid(A: any, name: string): void {
    const geometry = new THREE.SphereGeometry(0.5)
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
    const ps: number[][] = []
    for (let i = 0; i < posAttr.count; i++) {
      ps.push([posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)])
    }
    const pe = math.multiply((math as any).sqrtm(A), math.transpose(ps)) as number[][]

    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setXYZ(i, pe[0][i], pe[1][i], pe[2][i])
    }
    posAttr.needsUpdate = true

    const lineSegments = new THREE.LineSegments(new THREE.WireframeGeometry(geometry))
    const mat = lineSegments.material as THREE.LineBasicMaterial
    mat.depthTest = false
    mat.opacity = 0.5
    mat.transparent = true

    mat.color = ((name: string) => {
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

    const eff = robotMath.transl(this.fkine(this.configuration))
    ellipsoid.position.set(eff.x, eff.y, eff.z)

    this._scene.add(ellipsoid)
  }

  updateAccelerationEllipsoid(): void {
    const J = this.geometricJacobian()
    const Jt = math.transpose(J)

    const M = this.computeInertia()
    const Minv = math.inv(M as any)

    let Mx = math.multiply(J, math.multiply(Minv, math.multiply(math.transpose(Minv as any), Jt)))
    Mx = math.resize(Mx, [3, 3])

    this.plotEllipsoid(Mx, 'acceleration-ellipsoid')
  }

  updateForceEllipsoid(): void {
    const J = this.geometricJacobian(0, 'translational')
    const Jt = math.transpose(J)
    const A = math.inv(math.multiply(J, Jt) as any)

    this.plotEllipsoid(A, 'force-ellipsoid')
  }

  updateVelocityEllipsoid(): void {
    const J = this.geometricJacobian(0, 'translational')
    const Jt = math.transpose(J)
    const A = math.multiply(J, Jt)

    this.plotEllipsoid(A, 'velocity-ellipsoid')
  }

  computeInertia(): any {
    console.log('Robot.ts@computeInertia: THIS IS NOT YET FUNCTIONAL !')
    return math.identity(6) as any
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

  getLinkPose(linkName: string): THREE.Matrix4 {
    this._root.updateMatrixWorld()
    const obj = this._root.getObjectByName(linkName)
    if (!obj) {
      console.warn(`Robot.getLinkPose: link "${linkName}" not found`)
      return new THREE.Matrix4()
    }
    return obj.matrixWorld
  }

  threejs2mathjsMatrix(T: THREE.Matrix4): any {
    T = new THREE.Matrix4().copy(T).transpose()
    return math.matrix([
      T.elements.slice(0, 4),
      T.elements.slice(4, 8),
      T.elements.slice(8, 12),
      T.elements.slice(12, 16)])
  }

  fkine(q: number[], tipIndex = 0): any {
    const q_backup = this.configuration

    this.configuration = q
    this._root.updateMatrixWorld()

    const T = this.threejs2mathjsMatrix(this._root.getObjectByName(this.tipLinks[tipIndex])!.matrixWorld)

    this.configuration = q_backup
    this._root.updateMatrixWorld()

    return T
  }

  /** Read a tip link's world matrix using chain-only update (no full scene traversal). */
  private _fkineTip(tipIndex: number): THREE.Matrix4 {
    const tipObj = this._root.getObjectByName(this._tipLinks[tipIndex])!
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
    const tipObj = this._root.getObjectByName(this._tipLinks[tipIndex])!
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

      const jointObj = this._root.getObjectByName(jointName)!
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
    const tipObj = this._root.getObjectByName(this._tipLinks[tipIndex])!

    // Forward perturbation
    this.setJointValue(jointName, origVal + eps)
    this._root.updateMatrixWorld(true)
    const T1 = this.threejs2mathjsMatrix(tipObj.matrixWorld)

    // Backward perturbation
    this.setJointValue(jointName, origVal - eps)
    this._root.updateMatrixWorld(true)
    const T0 = this.threejs2mathjsMatrix(tipObj.matrixWorld)

    // Restore original value
    this.setJointValue(jointName, origVal)
    this._root.updateMatrixWorld(true)

    const delta = robotMath.tr2delta(T0, T1, partial)
    const scale = 1 / (2 * eps * THREE.MathUtils.DEG2RAD)
    return (delta as number[]).map(v => v * scale)
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
  private _solveIk(tipIndex: number, Tf: any, jointIndices: number[], partial: Partial): number {
    const maxIterations = 50
    const tolerance = 1e-3
    const alpha = 0.2
    const lambdaMax = 0.04
    const manipThreshold = 0.01
    const nullSpaceGain = 0.5

    const nj = jointIndices.length
    const dim = partial === '' ? 6 : 3
    const hasNullSpace = nj > dim

    // Precompute joint midpoints for null-space bias
    let qMid: number[] | null = null
    if (hasNullSpace) {
      qMid = new Array(nj)
      for (let k = 0; k < nj; k++) {
        const ji = jointIndices[k]
        const joint = this._kinematics.joints[this._joints[ji]]
        qMid[k] = (joint.limits.min + joint.limits.max) / 2
      }
    }

    let iteration = 0

    for (; iteration < maxIterations; iteration++) {
      const T0 = this.threejs2mathjsMatrix(this._fkineTip(tipIndex))
      const error = robotMath.tr2delta(T0, Tf, partial)

      if ((math.norm(error) as number) <= tolerance) break

      const J = this.geometricJacobian(tipIndex, partial, jointIndices)
      const Jm = math.matrix(J)
      const Jt = math.transpose(Jm)
      const JJt = math.multiply(Jm, Jt)

      // Adaptive damping: increase near singularities
      const det = math.det(JJt) as number
      const w = Math.sqrt(Math.max(det, 0))
      const lambda = w < manipThreshold
        ? lambdaMax * (1 - (w / manipThreshold) ** 2)
        : 0
      const C = math.multiply(math.identity(dim) as any, Math.max(lambda, 1e-4))

      const pinv = math.multiply(Jt, math.inv(math.add(JJt, C) as any))

      // Primary task: move toward goal
      let dq = math.multiply(alpha, math.multiply(pinv, error))

      // Null-space regularization: pull toward joint midpoints
      if (hasNullSpace && qMid) {
        const I = math.identity(nj) as any
        const nullProj = math.subtract(I, math.multiply(pinv, Jm))
        const qDiff: number[] = new Array(nj)
        for (let k = 0; k < nj; k++) {
          qDiff[k] = (qMid[k] - this._q[jointIndices[k]]) * THREE.MathUtils.DEG2RAD
        }
        const nullStep = math.multiply(nullSpaceGain, math.multiply(nullProj, qDiff))
        dq = math.add(dq, nullStep)
      }

      const dqArr: number[] = (dq as any).toArray ? (dq as any).toArray() : dq

      for (let k = 0; k < nj; k++) {
        const ji = jointIndices[k]
        this.setJointValue(this._joints[ji], this._q[ji] + dqArr[k] * THREE.MathUtils.RAD2DEG)
      }
    }

    return iteration
  }

  moveTipToPose(goal: THREE.Object3D, tipIndex = 0): void {
    const partial: Partial = this.category === 'quadruped' || this.category === 'hand' ? 'translational' : ''
    const jointIndices = this._tipJointIndices[tipIndex]
    const Tf = this.threejs2mathjsMatrix(goal.matrixWorld)

    const start = Date.now()
    const iterations = this._solveIk(tipIndex, Tf, jointIndices, partial)
    const delta = Date.now() - start

    this._root.updateMatrixWorld()

    if (this.showVelocityEllipsoid) this.updateVelocityEllipsoid()
    if (this.showForceEllipsoid) this.updateForceEllipsoid()

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
    const partial: Partial = this.category === 'quadruped' || this.category === 'hand' ? 'translational' : ''
    const dimPerTip = partial === '' ? 6 : 3

    // Collect all unique joint indices across all tips (sorted)
    const allJointSet = new Set<number>()
    for (const indices of this._tipJointIndices) {
      for (const ji of indices) allJointSet.add(ji)
    }
    const allJoints = [...allJointSet].sort((a, b) => a - b)
    const nj = allJoints.length
    const totalDim = goals.length * dimPerTip

    // Map from global joint index to column in the stacked Jacobian
    const jointToCol = new Map<number, number>()
    for (let c = 0; c < nj; c++) jointToCol.set(allJoints[c], c)

    // Precompute goal transforms
    const Tfs = goals.map(g => this.threejs2mathjsMatrix(g.matrixWorld))

    // Precompute joint midpoints for null-space bias
    const qMid = new Array(nj)
    for (let c = 0; c < nj; c++) {
      const joint = this._kinematics.joints[this._joints[allJoints[c]]]
      qMid[c] = (joint.limits.min + joint.limits.max) / 2
    }

    const maxIterations = 100
    const tolerance = 1e-3
    const alpha = 0.5
    const lambda = 1e-3
    const nullSpaceGain = 0.1

    // Fixed damping matrix — stacked systems are inherently stable, so adaptive
    // det-based damping doesn't work (det of a 24×24 matrix is tiny even when
    // the system is well-conditioned).
    const C = math.multiply(math.identity(totalDim) as any, lambda)

    const start = Date.now()
    let iteration = 0

    for (; iteration < maxIterations; iteration++) {
      // Build stacked error and Jacobian
      const stackedError: number[] = new Array(totalDim)
      const stackedJ: number[][] = new Array(totalDim)
      for (let r = 0; r < totalDim; r++) stackedJ[r] = new Array(nj).fill(0)

      let maxTipError = 0

      for (let ti = 0; ti < goals.length; ti++) {
        const T0 = this.threejs2mathjsMatrix(this._fkineTip(ti))
        const error = robotMath.tr2delta(T0, Tfs[ti], partial)
        const errorArr: number[] = Array.isArray(error) ? error : error.toArray ? error.toArray() : error

        const rowOffset = ti * dimPerTip
        let tipError = 0
        for (let r = 0; r < dimPerTip; r++) {
          stackedError[rowOffset + r] = errorArr[r]
          tipError += errorArr[r] * errorArr[r]
        }
        maxTipError = Math.max(maxTipError, Math.sqrt(tipError))

        // Per-tip Jacobian — place columns into the correct stacked positions
        const tipJoints = this._tipJointIndices[ti]
        const J = this.geometricJacobian(ti, partial, tipJoints)
        for (let r = 0; r < dimPerTip; r++) {
          for (let c = 0; c < tipJoints.length; c++) {
            stackedJ[rowOffset + r][jointToCol.get(tipJoints[c])!] = J[r][c]
          }
        }
      }

      if (maxTipError <= tolerance) break

      const Jm = math.matrix(stackedJ)
      const Jt = math.transpose(Jm)
      const JJt = math.multiply(Jm, Jt)

      const pinv = math.multiply(Jt, math.inv(math.add(JJt, C) as any))

      let dq = math.multiply(alpha, math.multiply(pinv, stackedError))

      // Null-space regularization: pull toward joint midpoints
      if (nj > totalDim) {
        const I = math.identity(nj) as any
        const nullProj = math.subtract(I, math.multiply(pinv, Jm))
        const qDiff: number[] = new Array(nj)
        for (let c = 0; c < nj; c++) {
          qDiff[c] = (qMid[c] - this._q[allJoints[c]]) * THREE.MathUtils.DEG2RAD
        }
        dq = math.add(dq, math.multiply(nullSpaceGain, math.multiply(nullProj, qDiff)))
      }

      const dqArr: number[] = (dq as any).toArray ? (dq as any).toArray() : dq

      for (let c = 0; c < nj; c++) {
        const ji = allJoints[c]
        this.setJointValue(this._joints[ji], this._q[ji] + dqArr[c] * THREE.MathUtils.RAD2DEG)
      }
    }

    this._root.updateMatrixWorld()

    if (this.showVelocityEllipsoid) this.updateVelocityEllipsoid()
    if (this.showForceEllipsoid) this.updateForceEllipsoid()

    const delta = Date.now() - start
    console.log(`Whole-body IK: ${iteration} iters (${delta} ms).`)
  }
}
