import { IkSolverEnum } from './IkSolver.js'
import * as math_ from './math_.js'

const Kinematics = require('kinematics').default
const math = require('mathjs')
const THREE = require('three')

const _quadrupeds = ['anybotics_anymal', 'iit_hyq']

export class Robot {
  constructor (scene, dae, collada, tipLinks) {
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

    // this.printLinkNames()
    this.printJointNames()
  }

  /**
   * Adds an ellipsoid A to the THREE.Scene as a THREE.Object3D with a name.
   *
   * @param {*} A     The ellisoid to be added to the Scene
   * @param {*} name  The name of the Object3D
   */
  plotEllipsoid (A, name) {
    const radius = name === 'velocity-ellipsoid' ? 0.3 : 0.05
    const geometry = new THREE.SphereGeometry(radius)
    const ps = geometry.vertices.map(p => p.toArray())
    const pe = math.multiply(math.sqrtm(A), math.transpose(ps))

    for (let i = 0; i < geometry.vertices.length; i++) {
      geometry.vertices[i].set(pe[0][i], pe[1][i], pe[2][i])
    }

    const lineSegments = new THREE.LineSegments(new THREE.WireframeGeometry(geometry))
    lineSegments.material.depthTest = false
    // lineSegments.material.linewidth = 2
    lineSegments.material.opacity = 0.5
    lineSegments.material.transparent = true

    lineSegments.material.color = ((name) => {
      switch (name) {
        case 'acceleration-ellipsoid': return new THREE.Color('yellow')
        case 'force-ellipsoid': return new THREE.Color('red')
        case 'velocity-ellipsoid': return new THREE.Color('blue')
        default: return new THREE.Color('black')
      }
    })(name)

    // Remove the last plotted ellipsoid from the scene
    this._scene.remove(this._scene.getObjectByName(name))

    const ellipsoid = lineSegments
    ellipsoid.name = name

    const eff = math_.transl(this.fkine(this.configuration))
    ellipsoid.position.set(eff.x, eff.y, eff.z)

    // Add new ellipsoid to the scene
    this._scene.add(ellipsoid)
  }

  updateAccelerationEllipsoid (eff_pos) {
    const J = this.jacob(this.configuration)
    const Jt = math.transpose(J)

    const M = this.computeInertia()
    const Minv = math.inv(M)

    let Mx = math.multiply(J, math.multiply(Minv, math.multiply(math.transpose(Minv), Jt)))
    Mx = math.resize(Mx, [3, 3])

    this.plotEllipsoid(Mx, 'acceleration-ellipsoid')

    if (this._verbose) { console.log(`Updated acceleration ellipsoid`) }
  }

  updateForceEllipsoid (eff_pos) {
    const J = this.jacob(this.configuration, 'translational')
    const Jt = math.transpose(J)
    const A = math.inv(math.multiply(J, Jt))

    this.plotEllipsoid(A, 'force-ellipsoid')

    if (this._verbose) { console.log(`Updated force ellipsoid`) }
  }

  updateVelocityEllipsoid (eff_pos) {
    const J = this.jacob(this.configuration, 'translational')
    const Jt = math.transpose(J)
    const A = math.multiply(J, Jt)

    this.plotEllipsoid(A, 'velocity-ellipsoid')

    if (this._verbose) { console.log(`Updated velocity ellipsoid`) }
  }

  computeInertia () {
    console.log('Robot.js@computeInertia: THIS IS NOT YET FUNCTIONAL !')
    return

    console.log(this._physics)
    return math.random(6, 6)
  }

  get motionKeypoints () {
    if (typeof this._motionKeypoints === 'undefined') { this._motionKeypoints = [] }
    return this._motionKeypoints
  }

  clearMotionKeypoints () {
    this._motionKeypoints = []
  }

  saveMotionKeypoint () {
    if (typeof this._motionKeypoints === 'undefined') { this._motionKeypoints = [] }
    this._motionKeypoints.push(this.configuration)
  }

  computeKinematicsGeometry (tree) {
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

        this.computeKinematicsGeometry(attachment)
      }
    }
  }

  debugKinematicsGeometry (scene) {
    const linegeometry = new THREE.Geometry()

    const material = new THREE.MeshLambertMaterial({ color: 0xff0000 })
    const sphereGeometry = new THREE.SphereGeometry(0.01)

    let points = [new THREE.Vector3()]

    for (const point of this._kinematicsGeometry) {
      let newPoint = new THREE.Vector3(point[0], point[1], point[2])
      newPoint.add(points[points.length - 1])
      points.push(newPoint)
    }

    // console.log('POINTS')
    // console.log(points)

    for (const point of points) {
      linegeometry.vertices.push(point)

      const sphere = new THREE.Mesh(sphereGeometry, material)
      sphere.position.set(point.x, point.y, point.z)
      this._scene.add(sphere)
    }

    const line = new THREE.Line(linegeometry, material)
    this._scene.add(line)
  }

  printLinkNames () {
    console.log('.dae links:')
    this._dae.traverse(function (child) {
      if (child instanceof THREE.Group) {
        console.log(child.name)
      }
    })
  }

  printJointNames () {
    console.log(this._joints)
  }

  get degreesOfFreedom () {
    return this._degreesOfFreedom
  }

  set degreesOfFreedom (value) {
    throw new Error('You cannot change the degrees of freedom of a robot.')
  }

  get tipLinks () { return this._tipLinks }

  getLinkPose (linkName) {
    this._dae.updateMatrixWorld()
    return this._dae.getObjectByName(linkName).matrixWorld
  }

  threejs2mathjsMatrix (T) {
    T = new THREE.Matrix4().copy(T).transpose()
    return math.matrix([
      T.elements.slice(0, 4),
      T.elements.slice(4, 8),
      T.elements.slice(8, 12),
      T.elements.slice(12, 16)])
  }

  fkine (q) {
    const q_backup = this.configuration

    this.configuration = q
    this._dae.updateMatrixWorld()

    const T = this.threejs2mathjsMatrix(this._dae.getObjectByName(this.tipLinks[0]).matrixWorld)

    this.configuration = q_backup
    this._dae.updateMatrixWorld()

    return T
  }

  updateShadowsState (castShadows) {
    this._dae.traverse(function (child) {
      if (child instanceof THREE.Mesh) {
        child.castShadow = castShadows
        child.receiveShadow = castShadows
      }
    })
  }

  /**
   * Get the current robot configuration $q$.
   *
   * @returns {Number[]} An $n$-sized array with the current joint positions of the robot.
   */
  get configuration () {
    return this._q.slice()
  }

  /**
   * Get the robot's nominal configuration (a.k.a. 'home' configuration).
   *
   * @returns {Number[]} An $n$-sized zero-filled array, where $n$ is equal to the degrees of freedom of the robot.
   */
  get zeroConfiguration () {
    return new Array(this._degreesOfFreedom + 1).join('0').split('').map(parseFloat)
  }

  /**
   * Get a random robot configuration.
   *
   * @returns {Number[]} Am $n$-sized array with random values inbetween joint limits.
   */
  get randomConfiguration () {
    let q = []

    for (const prop in this._kinematics.joints) {
      if (this._kinematics.joints.hasOwnProperty(prop)) {
        const joint = this._kinematics.joints[prop]
        if (!joint.static) {
          q.push(THREE.Math.randFloat(joint.limits.min, joint.limits.max))
        }
      }
    }

    return q
  }

  setJointValue (name, value) {
    value = value.clamp(this._kinematics.joints[name].limits.min, this._kinematics.joints[name].limits.max)

    this._kinematics.setJointValue(name, value)
    this._q[this._joints.indexOf(name)] = value
  }

  set configuration (q) {
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
    } catch (e) {
      console.log(e.name + ': ' + e.message)
    }
  }

  calculateFitness (goal) {
    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3()

    this.getLinkPose(this.tipLinks[0]).decompose(position, quaternion, scale)

    const euler = new THREE.Euler()
    euler.setFromQuaternion(quaternion)

    const positionDistance = position.distanceToSquared(goal.position)
    const orientationDistance = goal.rotation.toVector3().distanceToSquared(euler.toVector3())

    return 1 / (positionDistance + orientationDistance)
  }

  moveTipToPose (goal, solverType = IkSolverEnum.IK) {
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

  moveTipToPoseWithPseudoInverse (goal) {
    const maxIterations = 50
    const tolerance = 1e-3
    const alpha = 0.2

    const Tf = this.threejs2mathjsMatrix(goal.matrixWorld)
    let errorPrev = math.ones(6)

    let q = this.configuration
    // let q = this.zeroConfiguration

    const partial = _quadrupeds.indexOf(this.id) > -1 ? 'translational' : ''
    let iteration = 0

    const start = Date.now()

    while (iteration < maxIterations) {
      const error = math_.tr2delta(this.fkine(q), Tf, partial) // 8.13

      if (math.norm(error) <= tolerance) { break }

      if (math.norm(error) > 2 * math.norm(errorPrev)) {
        console.log(`Solution diverging at step ${iteration}, try reducing alpha`)
      }

      const dq = math.multiply(alpha, math.multiply(this.pseudoInverse(q, undefined, partial), error))

      q = math.add(q, math.multiply(dq, THREE.Math.RAD2DEG)).toArray()

      errorPrev = error

      iteration++
    }

    // milliseconds elapsed since start
    const delta = Date.now() - start

    this.configuration = q

    // this.updateAccelerationEllipsoid()
    this.updateForceEllipsoid()
    this.updateVelocityEllipsoid()

    console.log(`Solved with ${iteration} iterations (${delta} ms).`)
  }

  /**
   * Computes the pseudo inverse jacobian matrix `J^{\#}` of configuration `q`.
   *
   * J^{\#} = W^{-1} J^\top ( J W^{-1} J^\top + C )^{-1}
   *
   * @param {*} q
   * @param {*} c
   */
  pseudoInverse (q, c = 1e-3, partial = '') {
    const C = math.multiply(math.eye(partial === '' ? 6 : 3), c)
    // const Cinv = c === 0 ? math.zeros(6) : math.inv(C)

    // const W = math.diag([6, 5, 4, 3, 2, 1])
    const W = math.eye(q.length)
    const Winv = math.inv(W)

    const J = this.jacob(q, partial)
    const Jt = math.transpose(J)

    return math.multiply(Winv, math.multiply(Jt, math.inv(math.add(math.multiply(J, math.multiply(Winv, Jt)), C))))
  }

  /**
   * Computes the numerical jacobian `J` of a robot configuration `q`.
   *
   * @param  {Array}  q       A robot configuration `q`
   * @param  {String} partial An optional string specifying whether the returned jacobian
   *                          should contain the 'translational' or 'rotational' information
   * @return {Matrix}         The numeric jacobian of this robot's configuration
   */
  jacob (q, partial = '') {
    const dq = 1e-6 / 2

    let J = []

    for (let i = 0; i < this._joints.length; i++) {
      const q_less = q.slice()
      q_less[i] -= dq * THREE.Math.RAD2DEG

      const q_more = q.slice()
      q_more[i] += dq * THREE.Math.RAD2DEG

      const t0 = this.fkine(q_less)
      const tp = this.fkine(q_more)

      // central difference - https://en.wikipedia.org/wiki/Finite_difference#Forward,_backward,_and_central_differences
      const dtdq = math.divide(math.subtract(tp, t0), dq)
      const drdq = math.subset(dtdq, math.index(math.range(0, 3), math.range(0, 3)))
      const r0 = math.subset(t0, math.index(math.range(0, 3), math.range(0, 3)))

      const v = math.transpose(math.subset(dtdq, math.index(math.range(0, 3), 3))).toArray()[0]
      const w = math_.vex(math.multiply(drdq, math.transpose(r0)))

      if (partial === 'translational') {
        J.push(v)
      } else if (partial === 'rotational') {
        J.push(w)
      } else {
        J.push(math.concat(v, w))
      }
    }

    J = math.transpose(J)

    return J
  }

  initializeRobotKin () {
    this.robotKinInitialized = true

    // this.debugKinematicsGeometry(this._kinematicsGeometry)
    this.robotKin = new Kinematics(this._kinematicsGeometry)
  }

  moveTipToPoseWithIK (goal) {
    if (!this.robotKinInitialized) { this.initializeRobotKin() }

    const result = this.robotKin.inverse(
      goal.position.x, goal.position.y, -goal.position.z,
      goal.rotation.x, goal.rotation.y, -goal.rotation.z)

    if (!result.some(x => Number.isNaN(x))) {
      this.configuration = result.map(x => -x * THREE.Math.RAD2DEG)
    }
  }

  moveTipToPoseWithGeneticAlgorithm (goal, verbose = false) {
    const generationSize = 8
    const elitesPerGen = 1
    const randsPerGen = 2

    let generation = []

    // Add current pose to initial generation
    {
      const fitness = this.calculateFitness(goal)

      generation.push({ fitness: fitness, q: this.configuration })
    }

    // Add noisy current pose to initial generation (5 degrees noise)
    {
      const noisyQ = []
      for (const jointValue of this.configuration) {
        noisyQ.push(jointValue + THREE.Math.randFloat(-5, 5))
      }

      this.configuration = noisyQ

      const fitness = this.calculateFitness(goal)

      generation.push({ fitness: fitness, q: this.configuration })
    }

    // Create a random initial generation
    while (generation.length < generationSize) {
      const randomQ = this.randomConfiguration
      this.configuration = randomQ

      const fitness = this.calculateFitness(goal)

      generation.push({ fitness: fitness, q: randomQ })
    }

    if (verbose) console.log(generation)

    let iteration = 0
    let done = false
    while (!done) {
      if (verbose) console.log(`Iteration ${iteration}`)

      iteration++

      // Sort generation individuals by descending fitness
      generation.sort(function (a, b) {
        if (a.fitness > b.fitness) return -1
        if (a.fitness < b.fitness) return 1
        return 0
      })

      // Get the best individual of this generation.
      let best = generation[0]
      this.configuration = best.q
      // addSphereAtPose(this.getLinkPose(this.tipLinks[0]))
      if (verbose) console.log(`Best fitness: ${best.fitness}`)

      if (best.fitness >= 1 / Math.pow(1e-3, 2)) {
        if (verbose) console.log('SOLUTION FOUND !')
        done = true
      } else if (iteration > 100) {
        if (verbose) console.log('Iterations limit reached.')
        done = true
      } else {
        // Create next generation.
        let newGeneration = []

        // Transfer elites right away
        for (let i = 0; i < elitesPerGen; i++) {
          newGeneration.push(generation[i])
        }

        // Try to optimize the best one
        let opt = { fitness: generation[0].fitness, q: generation[0].q }
        const maxOptIterations = 25
        const wiggleAmount = 2 * THREE.Math.DEG2RAD

        for (let i = 0; i < maxOptIterations; i++) {
          const initialFitness = opt.fitness
          let gains = []

          for (let j = 0; j < this.degreesOfFreedom; j++) {
            let currentQ = opt.q.slice(0)
            currentQ[j] += wiggleAmount
            this.configuration = currentQ

            const fitness = this.calculateFitness(goal)

            gains.push(fitness - initialFitness)
          }

          // choose best joint to wiggle
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

            const fitness = this.calculateFitness(goal)

            opt.fitness = fitness
          }

          // if (verbose) console.log(gains)
        }

        // return

        // Start roulette
        let rouletteSize = 0
        for (const individual of generation) {
          rouletteSize += individual.fitness
        }
        if (verbose) console.log(rouletteSize)

        function selectIndividualWithRoulette () {
          let randomRouletteSpin = THREE.Math.randFloat(0, rouletteSize)

          let selectedIndividualId = -1
          for (let i = 0; i < generation.length; i++) {
            const rouletteSliceSize = generation[i].fitness

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

          const parentsFitness = father.fitness + mother.fitness

          let child = { fitness: undefined, q: [] }
          for (let gene = 0; gene < father.q.length; gene++) {
            child.q.push((father.fitness * father.q[gene] + mother.fitness * mother.q[gene]) / parentsFitness)
          }

          this.configuration = child.q

          child.fitness = this.calculateFitness(goal)

          newGeneration.push(child)
        }

        for (let i = 0; i < randsPerGen; i++) {
          const randomQ = this.randomConfiguration
          this.configuration = randomQ

          const fitness = this.calculateFitness(goal)

          newGeneration.push({ fitness: fitness, q: randomQ })
        }

        if (verbose) console.log(newGeneration)

        generation = newGeneration
      }
    }
  }
}
