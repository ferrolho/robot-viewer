import type { RobotJoint, RobotKinematics } from './Robot.ts'
import type { URDFRobot } from 'urdf-loader'
import * as THREE from 'three'

/**
 * Adapt a URDFRobot (from urdf-loader) to the RobotKinematics interface.
 *
 * Key convention: Robot internally stores joint values in degrees.
 * urdf-loader's setJointValue expects radians, so this adapter converts
 * degrees → radians on setJointValue and reports limits in degrees for
 * consistency with the rest of the codebase.
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
    joints[name] = {
      static: isStatic,
      limits: {
        min: joint.limit.lower * THREE.MathUtils.RAD2DEG,
        max: joint.limit.upper * THREE.MathUtils.RAD2DEG,
      },
      effort: joint.limit.effort > 0 ? joint.limit.effort : undefined,
      axis: joint.axis.clone(),
      mimics: mimicParent,
      mimicMultiplier: mimicParent ? ((joint as any).multiplier ?? 1) : undefined,
      mimicOffset: mimicParent ? (((joint as any).offset ?? 0) * THREE.MathUtils.RAD2DEG) : undefined,
    }
  }

  return {
    joints,
    setJointValue(name: string, valueDeg: number): void {
      urdf.setJointValue(name, valueDeg * THREE.MathUtils.DEG2RAD)
    },
  }
}
