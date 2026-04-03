import { create, all } from 'mathjs'
import numeric from 'numeric'

export const math = create(all)

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

/**
 * Import the math library numeric.js, http://numericjs.com/
 */
// Import numeric.js functions (eig, solve, etc.) into mathjs
math.import(numeric, {wrap: true, silent: true})

/**
 * Convert homogeneous transform to differential motion
 *
 * "is the differential motion (6x1) corresponding to
 * infinitessimal motion from pose T0 to T1 which are homogeneous
 * transformations (4x4). D=(dx, dy, dz, dRx, dRy, dRz) and is an approximation
 * to the average spatial velocity multiplied by time."
 *
 * @param {*} T0
 * @param {*} T1
 */
export function tr2delta (T0, T1, partial = '') {
  const t0 = math.subset(T0, math.index(math.range(0, 3), 3))
  const t1 = math.subset(T1, math.index(math.range(0, 3), 3))

  const R0 = math.subset(T0, math.index(math.range(0, 3), math.range(0, 3)))
  const R1 = math.subset(T1, math.index(math.range(0, 3), math.range(0, 3)))

  const dt = math.transpose(math.subtract(t1, t0)).toArray()[0]
  const dr = vex(math.subtract(math.multiply(R1, math.transpose(R0)), math.identity(3)))

  if (partial === 'translational') {
    return dt
  } else if (partial === 'rotational') {
    return dr
  } else {
    return math.concat(dt, dr)
  }
}

/**
 * Unpacks the translational part of a transformation matrix.
 *
 * @param   {Matrix}  T   An SE(3) homogeneous transform (4x4)
 * @returns {Vector3}     The translational part of a homogeneous transform T as a THREE.Vector3
 */
export function transl (T) {
  const v = math.transpose(math.subset(T, math.index(math.range(0, 3), 3))).toArray()[0]
  return { x: v[0], y: v[1], z: v[2] }
}

/**
 * Convert a skew-symmetric matrix to a vector.
 *
 * V = math.vex(S) is the vector (3x1) which has the skew-symmetric matrix S (3x3).
 *
 *    |  0   -vz  vy |
 *    |  vz   0  -vx |
 *    | -vy   vx  0  |
 *
 * Notes:
 * - This is the inverse of the function skew().
 * - No checking is done to ensure that the matrix is actually skew-symmetric.
 * - The function takes the mean of the two elements that correspond to each unique
 *   element of the matrix, i.e., vx = 0.5 * (S(3,2) - S(2,3))
 *
 * @param  {Matrix} S   The skew-symmetric matrix `S`
 * @return {Array}     The vector `V` (3x1)
 * @private
 */
export function vex (S) {
  if (math.deepEqual(math.size(S), [3, 3])) {
    return math.multiply(0.5, [
      math.subset(S, math.index(2, 1)) - math.subset(S, math.index(1, 2)),
      math.subset(S, math.index(0, 2)) - math.subset(S, math.index(2, 0)),
      math.subset(S, math.index(1, 0)) - math.subset(S, math.index(0, 1))])
  } else {
    throw new Error(`vex@Robot.js: Argument must be a 3,3 matrix (received ${math.size(S)})`)
  }
}
