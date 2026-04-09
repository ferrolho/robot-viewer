export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export type Partial = '' | 'translational' | 'rotational'

/**
 * Convert homogeneous transform to differential motion.
 *
 * Operates directly on THREE.Matrix4.elements (column-major layout):
 *   e[0]=R00  e[4]=R01  e[8]=R02   e[12]=tx
 *   e[1]=R10  e[5]=R11  e[9]=R12   e[13]=ty
 *   e[2]=R20  e[6]=R21  e[10]=R22  e[14]=tz
 *
 * Returns dt (translational) and/or dr = vex(R1*R0^T - I) (rotational).
 */
export function tr2delta(
  e0: ArrayLike<number>,
  e1: ArrayLike<number>,
  partial: Partial = '',
  out?: Float64Array,
): Float64Array {
  const len = partial === '' ? 6 : 3

  const result = out && out.length >= len ? out : new Float64Array(len)

  if (partial === 'rotational') {
    // dr = vex(R1 * R0^T - I)
    vexR1R0tMinusI(e0, e1, result, 0)
    return result
  }

  // dt = t1 - t0
  result[0] = e1[12] - e0[12]
  result[1] = e1[13] - e0[13]
  result[2] = e1[14] - e0[14]

  if (partial === 'translational') return result

  // Full 6-vector: [dt; dr]
  vexR1R0tMinusI(e0, e1, result, 3)
  return result
}

/**
 * Compute dr = vex(R1 * R0^T - I) and write 3 values into `out` at `offset`.
 *
 * R1*R0^T elements (row i, col j) = sum_k R1(i,k) * R0(j,k)
 * Column-major: R(i,k) = e[k*4 + i]
 *
 * vex(S) = 0.5 * [S(2,1)-S(1,2), S(0,2)-S(2,0), S(1,0)-S(0,1)]
 * where S = R1*R0^T - I
 */
function vexR1R0tMinusI(
  e0: ArrayLike<number>,
  e1: ArrayLike<number>,
  out: Float64Array,
  offset: number,
): void {
  // S = R1 * R0^T  (only compute the 6 off-diagonal entries we need)
  // S(2,1) = R1(2,0)*R0(1,0) + R1(2,1)*R0(1,1) + R1(2,2)*R0(1,2)
  const s21 = e1[2] * e0[1] + e1[6] * e0[5] + e1[10] * e0[9]
  // S(1,2) = R1(1,0)*R0(2,0) + R1(1,1)*R0(2,1) + R1(1,2)*R0(2,2)
  const s12 = e1[1] * e0[2] + e1[5] * e0[6] + e1[9] * e0[10]
  // S(0,2) = R1(0,0)*R0(2,0) + R1(0,1)*R0(2,1) + R1(0,2)*R0(2,2)
  const s02 = e1[0] * e0[2] + e1[4] * e0[6] + e1[8] * e0[10]
  // S(2,0) = R1(2,0)*R0(0,0) + R1(2,1)*R0(0,1) + R1(2,2)*R0(0,2)
  const s20 = e1[2] * e0[0] + e1[6] * e0[4] + e1[10] * e0[8]
  // S(1,0) = R1(1,0)*R0(0,0) + R1(1,1)*R0(0,1) + R1(1,2)*R0(0,2)
  const s10 = e1[1] * e0[0] + e1[5] * e0[4] + e1[9] * e0[8]
  // S(0,1) = R1(0,0)*R0(1,0) + R1(0,1)*R0(1,1) + R1(0,2)*R0(1,2)
  const s01 = e1[0] * e0[1] + e1[4] * e0[5] + e1[8] * e0[9]

  out[offset] = 0.5 * (s21 - s12)
  out[offset + 1] = 0.5 * (s02 - s20)
  out[offset + 2] = 0.5 * (s10 - s01)
}

/**
 * Extract translation from a column-major 4x4 homogeneous transform.
 */
export function transl(e: ArrayLike<number>): { x: number; y: number; z: number } {
  return { x: e[12], y: e[13], z: e[14] }
}
