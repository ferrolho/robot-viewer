import { create, all } from 'mathjs'
import numeric from 'numeric'

// mathjs types are overly complex for our usage; we use a loose type to avoid
// fighting MathType vs MathCollection narrowing across the codebase.
 
export const math: any = create(all)

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// Import numeric.js functions (eig, solve, etc.) into mathjs
math.import(numeric, { wrap: true, silent: true })

export type Partial = '' | 'translational' | 'rotational'

/**
 * Convert homogeneous transform to differential motion.
 *
 * Returns the differential motion (6x1) corresponding to infinitesimal motion
 * from pose T0 to T1 (4x4 homogeneous transforms).
 */
 
export function tr2delta(T0: any, T1: any, partial: Partial = ''): any {
  const t0 = math.subset(T0, math.index(math.range(0, 3), 3))
  const t1 = math.subset(T1, math.index(math.range(0, 3), 3))

  const R0 = math.subset(T0, math.index(math.range(0, 3), math.range(0, 3)))
  const R1 = math.subset(T1, math.index(math.range(0, 3), math.range(0, 3)))

  const dt = math.flatten(math.subtract(t1, t0)).toArray()
  const dr = vex(math.subtract(math.multiply(R1, math.transpose(R0)), math.identity(3)))

  if (partial === 'translational') {
    return dt
  } else if (partial === 'rotational') {
    return dr
  } else {
    return math.concat(dt, dr, 0)
  }
}

/**
 * Unpacks the translational part of a transformation matrix.
 */
 
export function transl(T: any): { x: number; y: number; z: number } {
  const v = math.flatten(math.subset(T, math.index(math.range(0, 3), 3))).toArray() as number[]
  return { x: v[0], y: v[1], z: v[2] }
}

/**
 * Convert a skew-symmetric matrix to a vector.
 *
 * V = vex(S) is the vector (3x1) from skew-symmetric matrix S (3x3).
 */
 
export function vex(S: any): any {
  if (math.deepEqual(math.size(S), [3, 3])) {
    return math.multiply(0.5, [
      math.subset(S, math.index(2, 1)) - math.subset(S, math.index(1, 2)),
      math.subset(S, math.index(0, 2)) - math.subset(S, math.index(2, 0)),
      math.subset(S, math.index(1, 0)) - math.subset(S, math.index(0, 1))])
  } else {
    throw new Error(`vex: Argument must be a 3x3 matrix (received ${math.size(S)})`)
  }
}
