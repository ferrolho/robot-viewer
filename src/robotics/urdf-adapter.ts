import type { RobotJoint, RobotKinematics } from './Robot.ts'
import type { URDFRobot } from 'urdf-loader'
import * as THREE from 'three'

/**
 * Adapt a URDFRobot (from urdf-loader) to the RobotKinematics interface.
 *
 * Key convention: revolute/continuous joints store values in degrees (converted
 * to/from radians at the urdf-loader boundary). Prismatic joints store values
 * in meters and are passed through to urdf-loader without conversion.
 */
export function robotKinematicsFromURDF(urdf: URDFRobot): RobotKinematics {
  const joints: Record<string, RobotJoint> = {}

  for (const [name, joint] of Object.entries(urdf.joints)) {
    // Mimic joints are driven automatically by urdf-loader when their
    // parent joint is set, so treat them as static to keep them out of
    // the controllable DOF list and random/zero configurations.
    const mimicParent = ('mimicJoint' in joint && (joint as any).mimicJoint != null)
      ? (joint as any).mimicJoint as string
      : undefined
    if (mimicParent) joint.ignoreLimits = true
    const isStatic = joint.jointType === 'fixed' || !!mimicParent
    const isPrismatic = joint.jointType === 'prismatic'
    joints[name] = {
      static: isStatic,
      prismatic: isPrismatic || undefined,
      limits: isPrismatic
        ? { min: joint.limit.lower, max: joint.limit.upper }  // meters
        : { min: joint.limit.lower * THREE.MathUtils.RAD2DEG, max: joint.limit.upper * THREE.MathUtils.RAD2DEG },
      effort: joint.limit.effort > 0 ? joint.limit.effort : undefined,
      axis: joint.axis.clone(),
      mimics: mimicParent,
      mimicMultiplier: mimicParent ? ((joint as any).multiplier ?? 1) : undefined,
      mimicOffset: mimicParent ? (((joint as any).offset ?? 0) * (isPrismatic ? 1 : THREE.MathUtils.RAD2DEG)) : undefined,
    }
  }

  return {
    joints,
    setJointValue(name: string, value: number): void {
      if (joints[name]?.prismatic) {
        // Prismatic joints: value is in meters — pass directly
        urdf.setJointValue(name, value)
      } else {
        // Revolute/continuous: value is in degrees — convert to radians
        urdf.setJointValue(name, value * THREE.MathUtils.DEG2RAD)
      }
    },
  }
}
