const THREE = require('three')

export class Robot {
  constructor (dae, kinematics, tipLinks) {
    this._dae = dae
    this._kinematics = kinematics
    this._tipLinks = tipLinks

    // this.printLinkNames()

    this._degreesOfFreedom = 0

    for (const prop in this._kinematics.joints) {
      if (this._kinematics.joints.hasOwnProperty(prop)) {
        if (!this._kinematics.joints[ prop ].static) {
          this._degreesOfFreedom++
        }
      }
    }

    this._q = this.zeroConfiguration
  }

  printLinkNames () {
    this._dae.traverse(function (child) {
      if (child instanceof THREE.Group) {
        console.log(child.name)
      }
    })
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

  get configuration () {
    return this._q
  }

  get zeroConfiguration () {
    return new Array(this._degreesOfFreedom + 1).join('0').split('').map(parseFloat)
  }

  get randomConfiguration () {
    let q = []

    for (const prop in this._kinematics.joints) {
      if (this._kinematics.joints.hasOwnProperty(prop)) {
        const joint = this._kinematics.joints[ prop ]
        if (!joint.static) {
          q.push(THREE.Math.randFloat(joint.limits.min, joint.limits.max))
        }
      }
    }

    return q
  }

  set configuration (q) {
    this._q = q.slice(0)

    q = q.slice(0)

    try {
      if (q.length !== this.degreesOfFreedom) {
        throw new Error('set configuration (q): q must be the same size as the robot DoF.')
      } else {
        for (const prop in this._kinematics.joints) {
          if (this._kinematics.joints.hasOwnProperty(prop)) {
            if (!this._kinematics.joints[ prop ].static) {
              this._kinematics.setJointValue(prop, q.shift())
            }
          }
        }
      }
    } catch (e) {
      console.log(e.name + ': ' + e.message)
    }
  }

  moveTipToPose (goal, addSphereAtPose) {
    const generationSize = 20
    const elitesPerGen = 1
    const randsPerGen = 3

    let generation = []

    // Add current pose to initial generation
    {
      const tipPosition = new THREE.Vector3()
      tipPosition.setFromMatrixPosition(this.getLinkPose(this.tipLinks[0]))

      const fitness = 1 / tipPosition.distanceToSquared(goal)

      generation.push({ fitness: fitness, q: this.configuration })
    }

    // Add noisy current pose to initial generation
    {
      const noisyQ = []
      for (const jointValue of this.configuration) {
        noisyQ.push(jointValue + THREE.Math.randFloat(-5, 5))
      }

      this.configuration = noisyQ

      const tipPosition = new THREE.Vector3()
      tipPosition.setFromMatrixPosition(this.getLinkPose(this.tipLinks[0]))

      const fitness = 1 / tipPosition.distanceToSquared(goal)

      generation.push({ fitness: fitness, q: this.configuration })
    }

    // Create a random initial generation
    while (generation.length < generationSize) {
      const randomQ = this.randomConfiguration
      this.configuration = randomQ

      const tipPosition = new THREE.Vector3()
      tipPosition.setFromMatrixPosition(this.getLinkPose(this.tipLinks[0]))

      const fitness = 1 / tipPosition.distanceToSquared(goal)

      generation.push({ fitness: fitness, q: randomQ })
    }
    console.log(generation)

    let iteration = 0
    let done = false
    while (!done) {
      console.log(`Iteration ${iteration++}`)

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
      console.log(`Best fitness: ${best.fitness}`)

      if (best.fitness >= 1 / Math.pow(1e-3, 2)) {
        console.log('SOLUTION FOUND !')
        done = true
      } else if (iteration > 1e4) {
        console.log('Iterations limit reached.')
        done = true
      } else {
        // Create next generation.
        let newGeneration = []

        // Transfer elites right away
        for (let i = 0; i < elitesPerGen; i++) {
          newGeneration.push(generation[i])
        }

        let rouletteSize = 0
        for (const individual of generation) {
          rouletteSize += individual.fitness
        }
        console.log(rouletteSize)

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

          const tipPosition = new THREE.Vector3()
          tipPosition.setFromMatrixPosition(this.getLinkPose(this.tipLinks[0]))

          child.fitness = 1 / tipPosition.distanceToSquared(goal)

          newGeneration.push(child)
        }

        for (let i = 0; i < randsPerGen; i++) {
          const randomQ = this.randomConfiguration
          this.configuration = randomQ

          const tipPosition = new THREE.Vector3()
          tipPosition.setFromMatrixPosition(this.getLinkPose(this.tipLinks[0]))

          const fitness = 1 / tipPosition.distanceToSquared(goal)

          newGeneration.push({ fitness: fitness, q: randomQ })
        }

        console.log(newGeneration)

        generation = newGeneration
      }
    }
  }
}
