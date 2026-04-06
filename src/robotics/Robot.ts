import * as robotMath from './math.ts'
import { type Partial } from './math.ts'
import { math } from './math.ts'
import * as THREE from 'three'

export interface RobotJoint {
  static: boolean
  limits: { min: number; max: number }
  axis: THREE.Vector3
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
  private _dae: THREE.Object3D
  private _kinematics: RobotKinematics
  private _tipLinks: string[]
  private _tipJointIndices: number[][] = []
  private _degreesOfFreedom: number
  _joints: string[]
  private _q: number[]
  private _motionKeypoints: number[][] = []

  constructor(scene: THREE.Scene, sceneRoot: THREE.Object3D, kinematics: RobotKinematics, tipLinks: string[]) {
    this._scene = scene
    this._dae = sceneRoot
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

  private _computeTipJointIndices(): number[][] {
    const jointSet = new Set(this._joints)
    return this._tipLinks.map(tipName => {
      const ancestors = new Set<string>()
      let obj: THREE.Object3D | null = this._dae.getObjectByName(tipName) ?? null
      while (obj && obj !== this._dae) {
        if (jointSet.has(obj.name)) ancestors.add(obj.name)
        obj = obj.parent
      }
      const indices: number[] = []
      for (let i = 0; i < this._joints.length; i++) {
        if (ancestors.has(this._joints[i])) indices.push(i)
      }
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

  getLinkPose(linkName: string): THREE.Matrix4 {
    this._dae.updateMatrixWorld()
    return this._dae.getObjectByName(linkName)!.matrixWorld
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
    this._dae.updateMatrixWorld()

    const T = this.threejs2mathjsMatrix(this._dae.getObjectByName(this.tipLinks[tipIndex])!.matrixWorld)

    this.configuration = q_backup
    this._dae.updateMatrixWorld()

    return T
  }

  /** Read a tip link's world matrix using chain-only update (no full scene traversal). */
  private _fkineTip(tipIndex: number): THREE.Matrix4 {
    const tipObj = this._dae.getObjectByName(this._tipLinks[tipIndex])!
    tipObj.updateWorldMatrix(true, false)
    return tipObj.matrixWorld
  }

  updateShadowsState(castShadows: boolean): void {
    this._dae.traverse(function (child) {
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
    const tipObj = this._dae.getObjectByName(this._tipLinks[tipIndex])!
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
      const jointObj = this._dae.getObjectByName(jointName)!
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

  // ── IK Solvers ──

  moveTipToPose(goal: THREE.Object3D, tipIndex = 0): void {
    this.moveTipToPoseWithPseudoInverse(goal, tipIndex)
  }

  moveTipsToPoses(goals: THREE.Object3D[]): void {
    const maxIterations = 50
    const tolerance = 1e-3
    const alpha = 0.2
    const partial: Partial = this.category === 'quadruped' ? 'translational' : ''

    const start = Date.now()
    let totalIterations = 0

    // Solve each tip independently against only its relevant joints
    for (let ti = 0; ti < goals.length; ti++) {
      const jointIndices = this._tipJointIndices[ti]
      if (jointIndices.length === 0) continue

      const Tf = this.threejs2mathjsMatrix(goals[ti].matrixWorld)
      const nj = jointIndices.length

      for (let iteration = 0; iteration < maxIterations; iteration++) {
        const T0 = this.threejs2mathjsMatrix(this._fkineTip(ti))
        const error = robotMath.tr2delta(T0, Tf, partial)

        if ((math.norm(error) as number) <= tolerance) break

        const J = this.geometricJacobian(ti, partial, jointIndices)
        const Jm = math.matrix(J)
        const Jt = math.transpose(Jm)
        const dim = partial === '' ? 6 : 3
        const C = math.multiply(math.identity(dim) as any, 1e-3)
        const pinv = math.multiply(Jt, math.inv(math.add(math.multiply(Jm, Jt), C) as any))

        const dq = math.multiply(alpha, math.multiply(pinv, error))
        const dqArr: number[] = (dq as any).toArray ? (dq as any).toArray() : dq

        for (let k = 0; k < nj; k++) {
          const ji = jointIndices[k]
          this.setJointValue(this._joints[ji], this._q[ji] + dqArr[k] * THREE.MathUtils.RAD2DEG)
        }

        totalIterations++
      }
    }

    // Sync _dae scene graph once at the end
    this._dae.updateMatrixWorld()

    if (this.showVelocityEllipsoid) this.updateVelocityEllipsoid()
    if (this.showForceEllipsoid) this.updateForceEllipsoid()

    const delta = Date.now() - start
    console.log(`Multi-target IK: ${totalIterations} iterations (${delta} ms).`)
  }

  moveTipToPoseWithPseudoInverse(goal: THREE.Object3D, tipIndex = 0): void {
    const maxIterations = 50
    const tolerance = 1e-3
    const alpha = 0.2

    const Tf = this.threejs2mathjsMatrix(goal.matrixWorld)
    let errorPrev: any = math.ones(6)

    const partial: Partial = this.category === 'quadruped' ? 'translational' : ''
    const jointIndices = this._tipJointIndices[tipIndex]
    const nj = jointIndices.length
    let iteration = 0

    const start = Date.now()

    while (iteration < maxIterations) {
      const T0 = this.threejs2mathjsMatrix(this._fkineTip(tipIndex))
      const error = robotMath.tr2delta(T0, Tf, partial)

      if ((math.norm(error) as number) <= tolerance) { break }

      if ((math.norm(error) as number) > 2 * (math.norm(errorPrev) as number)) {
        console.log(`Solution diverging at step ${iteration}, try reducing alpha`)
      }

      const J = this.geometricJacobian(tipIndex, partial, jointIndices)
      const Jm = math.matrix(J)
      const Jt = math.transpose(Jm)
      const dim = partial === '' ? 6 : 3
      const C = math.multiply(math.identity(dim) as any, 1e-3)
      const pinv = math.multiply(Jt, math.inv(math.add(math.multiply(Jm, Jt), C) as any))

      const dq = math.multiply(alpha, math.multiply(pinv, error))
      const dqArr: number[] = (dq as any).toArray ? (dq as any).toArray() : dq

      for (let k = 0; k < nj; k++) {
        const ji = jointIndices[k]
        this.setJointValue(this._joints[ji], this._q[ji] + dqArr[k] * THREE.MathUtils.RAD2DEG)
      }

      errorPrev = error
      iteration++
    }

    const delta = Date.now() - start

    this._dae.updateMatrixWorld()

    if (this.showVelocityEllipsoid) this.updateVelocityEllipsoid()
    if (this.showForceEllipsoid) this.updateForceEllipsoid()

    console.log(`Solved with ${iteration} iterations (${delta} ms).`)
  }
}
