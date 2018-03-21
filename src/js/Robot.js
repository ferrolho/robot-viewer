import { IkSolverEnum } from './IkSolver.js'

const Kinematics = require('kinematics').default
const math = require('mathjs')
const THREE = require('three')

/**
 * Returns a number whose value is limited to the given range.
 *
 * Example: limit the output of this computation to between 0 and 255
 * (x * 255).clamp(0, 255)
 *
 * @param {Number} min The lower boundary of the output range
 * @param {Number} max The upper boundary of the output range
 * @returns A number in the range [min, max]
 * @type Number
 */
Number.prototype.clamp = function (min, max) {
  return Math.min(Math.max(this, min), max)
}

export class Robot {
  constructor (scene, dae, collada, tipLinks) {
    this._scene = scene
    this._dae = dae
    this._kinematics = collada.kinematics
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
    // this.printJointNames()
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
    var linegeometry = new THREE.Geometry()

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

    var line = new THREE.Line(linegeometry, material)
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
    return this._q
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
        this._q = q.slice(0)
        q = q.slice(0)
        for (const prop in this._kinematics.joints) {
          if (this._kinematics.joints.hasOwnProperty(prop)) {
            if (!this._kinematics.joints[prop].static) {
              this.setJointValue(prop, q.shift())
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
        this.moveTipToPoseWithPseudoInverse(goal, 1e-3)
        break
    }
  }

  moveTipToPoseWithPseudoInverse (goal, c = 0) {
    const tolerance = 1e-3

    const C = math.multiply(math.eye(6), c)
    // const Cinv = c === 0 ? math.zeros(6) : math.inv(C)

    // const W = math.diag([6, 5, 4, 3, 2, 1])
    const W = math.eye(this.degreesOfFreedom)
    const Winv = math.inv(W)

    let effToGoal = this.computeEffToGoalInfo(goal)
    let iteration = 0

    while (iteration < 100 &&
          (tolerance < math.sum(math.abs(effToGoal.pos)) ||
           tolerance < math.sum(math.abs(effToGoal.rot)))) {
      const J = this.computeJacobianNumerically()
      const Jt = math.transpose(J)
      const Jpinv = math.multiply(Winv, math.multiply(Jt, math.inv(math.add(math.multiply(J, math.multiply(Winv, Jt)), C))))
      const d_q = math.multiply(Jpinv, effToGoal.pos.concat(effToGoal.rot))

      for (let i = 0; i < this._joints.length; i++) { this.setJointValue(this._joints[i], this._q[i] + d_q.get([i])) }

      effToGoal = this.computeEffToGoalInfo(goal)
      iteration++
    }

    console.log(`Solved with ${iteration} iterations.`)
  }

  computeEffToGoalInfo (goal) {
    const eff_pos = new THREE.Vector3()
    const eff_quat = new THREE.Quaternion()
    this.getLinkPose(this.tipLinks[0]).decompose(eff_pos, eff_quat, new THREE.Vector3())
    const eff_rot = new THREE.Euler().setFromQuaternion(eff_quat)

    const effPosToGoal = new THREE.Vector3().subVectors(goal.position, eff_pos).toArray()
    const effRotToGoal = new THREE.Vector3().subVectors(goal.rotation, eff_rot).toArray()

    return { pos: effPosToGoal, rot: effRotToGoal }
  }

  computeJacobianNumerically () {
    const variation = 10 // In degrees, not in radians.

    let J = []

    for (let i = 0; i < this._joints.length; i++) {
      // Displace joint
      this.setJointValue(this._joints[i], this._q[i] + variation)

      const d_eff_pos = new THREE.Vector3()
      const d_eff_quat = new THREE.Quaternion()
      this.getLinkPose(this.tipLinks[0]).decompose(d_eff_pos, d_eff_quat, new THREE.Vector3())
      const d_eff_rot = new THREE.Euler().setFromQuaternion(d_eff_quat)

      // Save eff pose after displacement
      const d_eff = { position: d_eff_pos, rotation: d_eff_rot }

      // Undo joint displacement
      this.setJointValue(this._joints[i], this._q[i] - variation)

      const diff = this.computeEffToGoalInfo(d_eff)

      J.push(diff.pos.concat(diff.rot))
    }

    return math.transpose(J)
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
