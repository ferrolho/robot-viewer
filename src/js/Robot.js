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
}
