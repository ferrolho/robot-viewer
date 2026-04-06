import type { RobotJoint, RobotKinematics } from './Robot.ts'
import type { URDFRobot } from 'urdf-loader'
import * as THREE from 'three'

/**
 * Adapt a URDFRobot (from urdf-loader) to the RobotKinematics interface.
 *
 * Key convention: Robot internally stores joint values in degrees.
 * COLLADA's setJointValue accepted degrees. URDF's setJointValue expects radians.
 * This adapter converts degrees → radians on setJointValue, and
 * reports limits in degrees for consistency with the rest of the codebase.
 */
export function robotKinematicsFromURDF(urdf: URDFRobot): RobotKinematics {
  const joints: Record<string, RobotJoint> = {}

  for (const [name, joint] of Object.entries(urdf.joints)) {
    const isStatic = joint.jointType === 'fixed'
    joints[name] = {
      static: isStatic,
      limits: {
        min: joint.limit.lower * THREE.MathUtils.RAD2DEG,
        max: joint.limit.upper * THREE.MathUtils.RAD2DEG,
      },
      axis: joint.axis.clone(),
    }
  }

  return {
    joints,
    setJointValue(name: string, valueDeg: number): void {
      urdf.setJointValue(name, valueDeg * THREE.MathUtils.DEG2RAD)
    },
  }
}
