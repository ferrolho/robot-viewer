import { IkSolverEnum, type IkSolverType } from './IkSolver.ts'
import * as math_ from './math_.ts'
import { type Partial } from './math_.ts'

import Kinematics from 'kinematics'
import { math } from './math_.ts'
import * as THREE from 'three'

interface ColladaJoint {
  static: boolean
  limits: { min: number; max: number }
  axis: THREE.Vector3
}

interface ColladaKinematics {
  joints: Record<string, ColladaJoint>
  setJointValue(name: string, value: number): void
}

export interface ColladaResult {
  scene: THREE.Group
  kinematics: ColladaKinematics
  library: {
    kinematicsModels: Record<string, KinematicsTree>
    physicsModels: Record<string, unknown>
  }
}

interface KinematicsTree {
  links: Array<{
    attachments: KinematicsAttachment[]
  }>
}

interface KinematicsAttachment {
  joint: string
  transforms: Array<{ obj: THREE.Vector3 }>
  links: Array<{
    attachments: KinematicsAttachment[]
  }>
}

interface GAIndividual {
  fitness: number | undefined
  q: number[]
}

const _quadrupeds = ['anybotics_anymal', 'iit_hyq']

export class Robot {
  id = ''
  showEllipsoids = false
  robotKin: Kinematics | null = null
  robotKinInitialized = false

  private _scene: THREE.Scene
  private _dae: THREE.Group
  private _kinematics: ColladaKinematics
  private _physics: unknown
  private _tipLinks: string[]
  private _degreesOfFreedom: number
  _joints: string[]
  private _q: number[]
  private _kinematicsGeometry: number[][]
  private _motionKeypoints: number[][] = []
  private _verbose = false

  constructor(scene: THREE.Scene, dae: THREE.Group, collada: ColladaResult, tipLinks: string[]) {
    this._scene = scene
    this._dae = dae
    this._kinematics = collada.kinematics
    this._physics = collada.library.physicsModels.pmodel0
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

    this._kinematicsGeometry = []
    this.computeKinematicsGeometry(collada.library.kinematicsModels.kmodel0)

    this._q = this.zeroConfiguration

    this.printJointNames()
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
        case 'acceleration-ellipsoid': return new THREE.Color('yellow')
        case 'force-ellipsoid': return new THREE.Color('red')
        case 'velocity-ellipsoid': return new THREE.Color('blue')
        default: return new THREE.Color('black')
      }
    })(name)

    const existing = this._scene.getObjectByName(name)
    if (existing) this._scene.remove(existing)

    const ellipsoid = lineSegments
    ellipsoid.name = name

    const eff = math_.transl(this.fkine(this.configuration))
    ellipsoid.position.set(eff.x, eff.y, eff.z)

    this._scene.add(ellipsoid)
  }

  updateAccelerationEllipsoid(): void {
    const J = this.jacob(this.configuration)
    const Jt = math.transpose(J)

    const M = this.computeInertia()
    const Minv = math.inv(M as any)

    let Mx = math.multiply(J, math.multiply(Minv, math.multiply(math.transpose(Minv as any), Jt)))
    Mx = math.resize(Mx, [3, 3])

    this.plotEllipsoid(Mx, 'acceleration-ellipsoid')
  }

  updateForceEllipsoid(): void {
    const J = this.jacob(this.configuration, 'translational')
    const Jt = math.transpose(J)
    const A = math.inv(math.multiply(J, Jt) as any)

    this.plotEllipsoid(A, 'force-ellipsoid')
  }

  updateVelocityEllipsoid(): void {
    const J = this.jacob(this.configuration, 'translational')
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

  computeKinematicsGeometry(tree: KinematicsTree | undefined): void {
    if (tree) {
      for (const attachment of tree.links[0].attachments) {
        if (this._joints.slice(1).includes(attachment.joint)) {
          const v = attachment.transforms[0].obj

          if (this._kinematicsGeometry.length < 4) {
            this._kinematicsGeometry.push([v.x, v.z, v.y])
          } else {
            this._kinematicsGeometry.push([0.0, v.x + v.y + v.z, 0.0])
            return
          }
        }

        this.computeKinematicsGeometry(attachment as unknown as KinematicsTree)
      }
    }
  }

  debugKinematicsGeometry(_scene: THREE.Scene): void {
    const material = new THREE.MeshLambertMaterial({ color: 0xff0000 })
    const sphereGeometry = new THREE.SphereGeometry(0.01)

    const points: THREE.Vector3[] = [new THREE.Vector3()]

    for (const point of this._kinematicsGeometry) {
      const newPoint = new THREE.Vector3(point[0], point[1], point[2])
      newPoint.add(points[points.length - 1])
      points.push(newPoint)
    }

    for (const point of points) {
      const sphere = new THREE.Mesh(sphereGeometry, material)
      sphere.position.set(point.x, point.y, point.z)
      this._scene.add(sphere)
    }

    const linegeometry = new THREE.BufferGeometry().setFromPoints(points)
    const line = new THREE.Line(linegeometry, material)
    this._scene.add(line)
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

  fkine(q: number[]): any {
    const q_backup = this.configuration

    this.configuration = q
    this._dae.updateMatrixWorld()

    const T = this.threejs2mathjsMatrix(this._dae.getObjectByName(this.tipLinks[0])!.matrixWorld)

    this.configuration = q_backup
    this._dae.updateMatrixWorld()

    return T
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
    value = math_.clamp(value, this._kinematics.joints[name].limits.min, this._kinematics.joints[name].limits.max)

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

  calculateFitness(goal: THREE.Object3D): number {
    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3()

    this.getLinkPose(this.tipLinks[0]).decompose(position, quaternion, scale)

    const euler = new THREE.Euler()
    euler.setFromQuaternion(quaternion)

    const positionDistance = position.distanceToSquared(goal.position)
    const goalRot = new THREE.Vector3(goal.rotation.x, goal.rotation.y, goal.rotation.z)
    const eulerVec = new THREE.Vector3(euler.x, euler.y, euler.z)
    const orientationDistance = goalRot.distanceToSquared(eulerVec)

    return 1 / (positionDistance + orientationDistance)
  }

  moveTipToPose(goal: THREE.Object3D, solverType: IkSolverType = IkSolverEnum.IK): void {
    switch (solverType) {
      case IkSolverEnum.IK:
        this.moveTipToPoseWithIK(goal)
        break
      case IkSolverEnum.GENETIC_ALGORITHM:
        console.log('Using GENETIC_ALGORITHM')
        this.moveTipToPoseWithGeneticAlgorithm(goal)
        break
      case IkSolverEnum.PSEUDO_INVERSE:
        this.moveTipToPoseWithPseudoInverse(goal)
        break
    }
  }

  moveTipToPoseWithPseudoInverse(goal: THREE.Object3D): void {
    const maxIterations = 50
    const tolerance = 1e-3
    const alpha = 0.2

    const Tf = this.threejs2mathjsMatrix(goal.matrixWorld)
    let errorPrev: any = math.ones(6)

    let q = this.configuration

    const partial: Partial = _quadrupeds.indexOf(this.id) > -1 ? 'translational' : ''
    let iteration = 0

    const start = Date.now()

    while (iteration < maxIterations) {
      const error = math_.tr2delta(this.fkine(q), Tf, partial)

      if ((math.norm(error) as number) <= tolerance) { break }

      if ((math.norm(error) as number) > 2 * (math.norm(errorPrev) as number)) {
        console.log(`Solution diverging at step ${iteration}, try reducing alpha`)
      }

      const dq = math.multiply(alpha, math.multiply(this.pseudoInverse(q, undefined, partial), error))

      q = (math.add(q, math.multiply(dq, THREE.MathUtils.RAD2DEG)) as any).toArray() as number[]

      errorPrev = error

      iteration++
    }

    const delta = Date.now() - start

    this.configuration = q

    if (this.showEllipsoids) {
      this.updateForceEllipsoid()
      this.updateVelocityEllipsoid()
    }

    console.log(`Solved with ${iteration} iterations (${delta} ms).`)
  }

  pseudoInverse(q: number[], c = 1e-3, partial: Partial = ''): any {
    const C = math.multiply(math.identity(partial === '' ? 6 : 3) as any, c)

    const W = math.identity(q.length) as any
    const Winv = math.inv(W)

    const J = this.jacob(q, partial)
    const Jt = math.transpose(J)

    return math.multiply(Winv, math.multiply(Jt, math.inv(math.add(math.multiply(J, math.multiply(Winv, Jt)), C) as any)))
  }

  jacob(q: number[], partial: Partial = ''): any {
    const dq = 1e-6 / 2

    const J: any[] = []

    for (let i = 0; i < this._joints.length; i++) {
      const q_less = q.slice()
      q_less[i] -= dq * THREE.MathUtils.RAD2DEG

      const q_more = q.slice()
      q_more[i] += dq * THREE.MathUtils.RAD2DEG

      const t0 = this.fkine(q_less)
      const tp = this.fkine(q_more)

      const dtdq = math.divide(math.subtract(tp, t0), dq)
      const drdq = math.subset(dtdq, math.index(math.range(0, 3), math.range(0, 3)))
      const r0 = math.subset(t0, math.index(math.range(0, 3), math.range(0, 3)))

      const v = math.flatten(math.subset(dtdq, math.index(math.range(0, 3), 3)) as any).toArray()
      const w = math_.vex(math.multiply(drdq, math.transpose(r0 as any)))

      if (partial === 'translational') {
        J.push(v)
      } else if (partial === 'rotational') {
        J.push(w)
      } else {
        J.push(math.concat(v as number[], w as number[], 0))
      }
    }

    return math.transpose(J)
  }

  initializeRobotKin(): void {
    this.robotKinInitialized = true
    this.robotKin = new Kinematics(this._kinematicsGeometry)
  }

  moveTipToPoseWithIK(goal: THREE.Object3D): void {
    if (!this.robotKinInitialized) { this.initializeRobotKin() }

    const result = this.robotKin!.inverse(
      goal.position.x, goal.position.y, -goal.position.z,
      goal.rotation.x, goal.rotation.y, -goal.rotation.z)

    if (!result.some((x: number) => Number.isNaN(x))) {
      this.configuration = result.map((x: number) => -x * THREE.MathUtils.RAD2DEG)
    }
  }

  moveTipToPoseWithGeneticAlgorithm(goal: THREE.Object3D, verbose = false): void {
    const generationSize = 8
    const elitesPerGen = 1
    const randsPerGen = 2

    let generation: GAIndividual[] = []

    {
      const fitness = this.calculateFitness(goal)
      generation.push({ fitness, q: this.configuration })
    }

    {
      const noisyQ: number[] = []
      for (const jointValue of this.configuration) {
        noisyQ.push(jointValue + THREE.MathUtils.randFloat(-5, 5))
      }
      this.configuration = noisyQ
      const fitness = this.calculateFitness(goal)
      generation.push({ fitness, q: this.configuration })
    }

    while (generation.length < generationSize) {
      const randomQ = this.randomConfiguration
      this.configuration = randomQ
      const fitness = this.calculateFitness(goal)
      generation.push({ fitness, q: randomQ })
    }

    if (verbose) console.log(generation)

    let iteration = 0
    let done = false
    while (!done) {
      if (verbose) console.log(`Iteration ${iteration}`)
      iteration++

      generation.sort((a, b) => (b.fitness ?? 0) - (a.fitness ?? 0))

      const best = generation[0]
      this.configuration = best.q
      if (verbose) console.log(`Best fitness: ${best.fitness}`)

      if ((best.fitness ?? 0) >= 1 / Math.pow(1e-3, 2)) {
        if (verbose) console.log('SOLUTION FOUND !')
        done = true
      } else if (iteration > 100) {
        if (verbose) console.log('Iterations limit reached.')
        done = true
      } else {
        const newGeneration: GAIndividual[] = []

        for (let i = 0; i < elitesPerGen; i++) {
          newGeneration.push(generation[i])
        }

        const opt: GAIndividual = { fitness: generation[0].fitness, q: generation[0].q.slice() }
        const maxOptIterations = 25
        const wiggleAmount = 2 * THREE.MathUtils.DEG2RAD

        for (let i = 0; i < maxOptIterations; i++) {
          const initialFitness = opt.fitness ?? 0
          const gains: number[] = []

          for (let j = 0; j < this.degreesOfFreedom; j++) {
            const currentQ = opt.q.slice(0)
            currentQ[j] += wiggleAmount
            this.configuration = currentQ
            const fitness = this.calculateFitness(goal)
            gains.push(fitness - initialFitness)
          }

          let jointToWiggle = -1
          let greatestAbsGain = 0
          for (let j = 0; j < gains.length; j++) {
            if (Math.abs(gains[j]) > greatestAbsGain) {
              greatestAbsGain = Math.abs(gains[j])
              jointToWiggle = j
            }
          }

          if (jointToWiggle > -1) {
            opt.q[jointToWiggle] += (gains[jointToWiggle] > 0 ? 1 : -1) * wiggleAmount
            this.configuration = opt.q
            opt.fitness = this.calculateFitness(goal)
          }
        }

        let rouletteSize = 0
        for (const individual of generation) {
          rouletteSize += individual.fitness ?? 0
        }
        if (verbose) console.log(rouletteSize)

        const selectIndividualWithRoulette = (): number => {
          let randomRouletteSpin = THREE.MathUtils.randFloat(0, rouletteSize)
          let selectedIndividualId = -1
          for (let i = 0; i < generation.length; i++) {
            const rouletteSliceSize = generation[i].fitness ?? 0
            if (randomRouletteSpin < rouletteSliceSize) {
              selectedIndividualId = i
              break
            } else {
              randomRouletteSpin -= rouletteSliceSize
            }
          }
          return selectedIndividualId
        }

        while (newGeneration.length < generationSize - randsPerGen) {
          const father = generation[selectIndividualWithRoulette()]
          const mother = generation[selectIndividualWithRoulette()]
          const parentsFitness = (father.fitness ?? 0) + (mother.fitness ?? 0)

          const child: GAIndividual = { fitness: undefined, q: [] }
          for (let gene = 0; gene < father.q.length; gene++) {
            child.q.push(((father.fitness ?? 0) * father.q[gene] + (mother.fitness ?? 0) * mother.q[gene]) / parentsFitness)
          }

          this.configuration = child.q
          child.fitness = this.calculateFitness(goal)
          newGeneration.push(child)
        }

        for (let i = 0; i < randsPerGen; i++) {
          const randomQ = this.randomConfiguration
          this.configuration = randomQ
          const fitness = this.calculateFitness(goal)
          newGeneration.push({ fitness, q: randomQ })
        }

        if (verbose) console.log(newGeneration)
        generation = newGeneration
      }
    }
  }
}
