/**
 * Lightweight linear algebra on flat Float64Array matrices.
 *
 * All "Into" variants write into a pre-allocated output to avoid GC pressure
 * in the IK hot loop. Convenience (allocating) wrappers are provided for
 * cold-path code.
 */

// ── Types ──

export interface Mat {
  readonly rows: number
  readonly cols: number
  readonly data: Float64Array // row-major: element (i,j) = data[i * cols + j]
}

// ── Construction ──

export function mat(rows: number, cols: number, data?: Float64Array): Mat {
  return { rows, cols, data: data ?? new Float64Array(rows * cols) }
}

export function zeros(rows: number, cols: number): Mat {
  return mat(rows, cols)
}

export function identity(n: number): Mat {
  const m = mat(n, n)
  for (let i = 0; i < n; i++) m.data[i * n + i] = 1
  return m
}

export function identityInto(out: Mat): void {
  out.data.fill(0)
  const n = out.cols
  for (let i = 0; i < out.rows; i++) out.data[i * n + i] = 1
}

/** Copy number[][] (row-major) into a flat Mat. */
export function fromRows(rows: number[][], out?: Mat): Mat {
  const r = rows.length
  const c = r > 0 ? rows[0].length : 0
  const m = out ?? mat(r, c)
  for (let i = 0; i < r; i++) {
    const row = rows[i]
    const offset = i * c
    for (let j = 0; j < c; j++) m.data[offset + j] = row[j]
  }
  return m
}

export function copyInto(dst: Mat, src: Mat): void {
  dst.data.set(src.data)
}

// ── Core in-place operations ──

/** out = A * B */
export function multiplyInto(out: Mat, A: Mat, B: Mat): void {
  const ar = A.rows, ac = A.cols, bc = B.cols
  const ad = A.data, bd = B.data, od = out.data
  od.fill(0)
  for (let i = 0; i < ar; i++) {
    const iOff = i * ac
    const oOff = i * bc
    for (let k = 0; k < ac; k++) {
      const a = ad[iOff + k]
      const kOff = k * bc
      for (let j = 0; j < bc; j++) {
        od[oOff + j] += a * bd[kOff + j]
      }
    }
  }
}

/** out = A * B^T  (avoids materialising the transpose) */
export function multiplyABtInto(out: Mat, A: Mat, B: Mat): void {
  const ar = A.rows, ac = A.cols, br = B.rows
  const ad = A.data, bd = B.data, od = out.data
  for (let i = 0; i < ar; i++) {
    const iOff = i * ac
    const oOff = i * br
    for (let j = 0; j < br; j++) {
      const jOff = j * ac
      let sum = 0
      for (let k = 0; k < ac; k++) sum += ad[iOff + k] * bd[jOff + k]
      od[oOff + j] = sum
    }
  }
}

/** out = A^T * B  (avoids materialising the transpose of A) */
export function multiplyAtBInto(out: Mat, A: Mat, B: Mat): void {
  const ar = A.rows, ac = A.cols, bc = B.cols
  const ad = A.data, bd = B.data, od = out.data
  od.fill(0)
  for (let k = 0; k < ar; k++) {
    const kOffA = k * ac
    const kOffB = k * bc
    for (let i = 0; i < ac; i++) {
      const a = ad[kOffA + i]
      const iOff = i * bc
      for (let j = 0; j < bc; j++) {
        od[iOff + j] += a * bd[kOffB + j]
      }
    }
  }
}

/** out = A + lambda * I  (A must be square) */
export function addScaledIdentityInto(out: Mat, A: Mat, lambda: number): void {
  out.data.set(A.data)
  const n = A.cols
  for (let i = 0; i < A.rows; i++) out.data[i * n + i] += lambda
}

/** out = A - B */
export function subtractInto(out: Mat, A: Mat, B: Mat): void {
  const d = A.data, bd = B.data, od = out.data
  for (let i = 0, len = d.length; i < len; i++) od[i] = d[i] - bd[i]
}

/** out = M * v */
export function matVecMultiplyInto(out: Float64Array, M: Mat, v: Float64Array): void {
  const r = M.rows, c = M.cols, d = M.data
  for (let i = 0; i < r; i++) {
    const off = i * c
    let sum = 0
    for (let j = 0; j < c; j++) sum += d[off + j] * v[j]
    out[i] = sum
  }
}

// ── Vector operations ──

export function vecNorm(v: Float64Array, len?: number): number {
  const n = len ?? v.length
  let sum = 0
  for (let i = 0; i < n; i++) sum += v[i] * v[i]
  return Math.sqrt(sum)
}

export function vecScaleInPlace(v: Float64Array, alpha: number, len?: number): void {
  const n = len ?? v.length
  for (let i = 0; i < n; i++) v[i] *= alpha
}

// ── LU decomposition with partial pivoting ──

/**
 * In-place LU decomposition with partial pivoting.
 * Overwrites A.data with L (lower, unit diagonal) and U (upper).
 * Returns the sign of the permutation (+1 or -1) for determinant.
 */
export function luDecomposeInPlace(A: Mat, pivots: Int32Array): number {
  const n = A.rows, d = A.data
  let sign = 1

  for (let i = 0; i < n; i++) pivots[i] = i

  for (let k = 0; k < n; k++) {
    // Find pivot
    let maxVal = Math.abs(d[k * n + k])
    let maxRow = k
    for (let i = k + 1; i < n; i++) {
      const val = Math.abs(d[i * n + k])
      if (val > maxVal) { maxVal = val; maxRow = i }
    }

    if (maxRow !== k) {
      // Swap rows
      const kOff = k * n, mOff = maxRow * n
      for (let j = 0; j < n; j++) {
        const tmp = d[kOff + j]; d[kOff + j] = d[mOff + j]; d[mOff + j] = tmp
      }
      const tmp = pivots[k]; pivots[k] = pivots[maxRow]; pivots[maxRow] = tmp
      sign = -sign
    }

    const pivot = d[k * n + k]
    if (Math.abs(pivot) < 1e-30) continue

    for (let i = k + 1; i < n; i++) {
      const factor = d[i * n + k] / pivot
      d[i * n + k] = factor
      const iOff = i * n, kOff = k * n
      for (let j = k + 1; j < n; j++) {
        d[iOff + j] -= factor * d[kOff + j]
      }
    }
  }

  return sign
}

/** Solve LU * x = b in place (overwrites b). */
export function luSolveInPlace(LU: Mat, pivots: Int32Array, b: Float64Array): void {
  const n = LU.rows, d = LU.data

  // Apply permutation
  const pb = new Float64Array(n)
  for (let i = 0; i < n; i++) pb[i] = b[pivots[i]]

  // Forward substitution (L * y = pb)
  for (let i = 0; i < n; i++) {
    let sum = pb[i]
    const iOff = i * n
    for (let j = 0; j < i; j++) sum -= d[iOff + j] * pb[j]
    pb[i] = sum
  }

  // Back substitution (U * x = y)
  for (let i = n - 1; i >= 0; i--) {
    let sum = pb[i]
    const iOff = i * n
    for (let j = i + 1; j < n; j++) sum -= d[iOff + j] * pb[j]
    pb[i] = sum / d[iOff + i]
  }

  b.set(pb)
}

/** Compute A^{-1} by solving A * X = I column by column. LU must already be decomposed. */
export function luInvertInto(out: Mat, LU: Mat, pivots: Int32Array): void {
  const n = LU.rows
  const col = new Float64Array(n)
  for (let j = 0; j < n; j++) {
    col.fill(0)
    col[j] = 1
    luSolveInPlace(LU, pivots, col)
    for (let i = 0; i < n; i++) out.data[i * n + j] = col[i]
  }
}

/** Determinant from an already-decomposed LU. */
export function luDet(LU: Mat, sign: number): number {
  const n = LU.rows, d = LU.data
  let det = sign
  for (let i = 0; i < n; i++) det *= d[i * n + i]
  return det
}

// ── Convenience (allocating) wrappers for cold-path code ──

export function multiply(A: Mat, B: Mat): Mat {
  const out = mat(A.rows, B.cols)
  multiplyInto(out, A, B)
  return out
}

export function transpose(A: Mat): Mat {
  const out = mat(A.cols, A.rows)
  const ad = A.data, od = out.data
  const ar = A.rows, ac = A.cols
  for (let i = 0; i < ar; i++) {
    const iOff = i * ac
    for (let j = 0; j < ac; j++) od[j * ar + i] = ad[iOff + j]
  }
  return out
}

export function inv(A: Mat): Mat {
  const n = A.rows
  const lu = mat(n, n)
  copyInto(lu, A)
  const pivots = new Int32Array(n)
  luDecomposeInPlace(lu, pivots)
  const out = mat(n, n)
  luInvertInto(out, lu, pivots)
  return out
}

// ── 3x3 matrix square root (for ellipsoid visualisation) ──

/**
 * Matrix square root of a 3x3 symmetric positive definite matrix.
 *
 * Uses the Denman-Beavers iteration, which converges quadratically and is
 * unconditionally stable for SPD matrices — no eigendecomposition needed.
 *
 *   Y₀ = A,   Z₀ = I
 *   Yₖ₊₁ = (Yₖ + Zₖ⁻¹) / 2
 *   Zₖ₊₁ = (Zₖ + Yₖ⁻¹) / 2
 *
 * Converges to Y∞ = √A.
 */
export function sqrtm3x3Symmetric(A: Mat): Mat {
  const Y = mat(3, 3)
  const Z = mat(3, 3)
  const tmp = mat(3, 3)
  Y.data.set(A.data)
  identityInto(Z)

  for (let iter = 0; iter < 8; iter++) {
    // Ynext = (Y + Z⁻¹) / 2,  Znext = (Z + Y⁻¹) / 2
    inv3x3Into(tmp, Z)
    const y0 = Y.data[0], y1 = Y.data[1], y2 = Y.data[2]
    const y3 = Y.data[3], y4 = Y.data[4], y5 = Y.data[5]
    const y6 = Y.data[6], y7 = Y.data[7], y8 = Y.data[8]
    for (let i = 0; i < 9; i++) Y.data[i] = 0.5 * (Y.data[i] + tmp.data[i])

    // Now compute Z⁻¹ from the old Y values we saved
    tmp.data[0] = y0; tmp.data[1] = y1; tmp.data[2] = y2
    tmp.data[3] = y3; tmp.data[4] = y4; tmp.data[5] = y5
    tmp.data[6] = y6; tmp.data[7] = y7; tmp.data[8] = y8
    inv3x3Into(tmp, tmp) // tmp = oldY⁻¹
    for (let i = 0; i < 9; i++) Z.data[i] = 0.5 * (Z.data[i] + tmp.data[i])
  }

  return Y
}

/** Analytical 3x3 matrix inverse via cofactor expansion. Overwrites `out`. */
function inv3x3Into(out: Mat, M: Mat): void {
  const d = M.data
  const a = d[0], b = d[1], c = d[2]
  const e = d[3], f = d[4], g = d[5]
  const h = d[6], i = d[7], j = d[8]

  const det = a * (f * j - g * i) - b * (e * j - g * h) + c * (e * i - f * h)
  const invDet = 1 / det

  out.data[0] = (f * j - g * i) * invDet
  out.data[1] = (c * i - b * j) * invDet
  out.data[2] = (b * g - c * f) * invDet
  out.data[3] = (g * h - e * j) * invDet
  out.data[4] = (a * j - c * h) * invDet
  out.data[5] = (c * e - a * g) * invDet
  out.data[6] = (e * i - f * h) * invDet
  out.data[7] = (b * h - a * i) * invDet
  out.data[8] = (a * f - b * e) * invDet
}

// ── Column-major 4×4 matrix helpers (SE(3) / Three.js convention) ──
//
// These operate on raw Float64Array(16) in column-major layout:
//   element (row i, col j) = data[j * 4 + i]
// This matches Three.js Matrix4.elements, making it cheap to copy data
// between these routines and the scene graph.

/** Column-major 4×4 multiply: out = a * b. All must be length-16 typed arrays. */
export function mat4Multiply(out: Float64Array, a: ArrayLike<number>, b: ArrayLike<number>): void {
  const a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3]
  const a4 = a[4], a5 = a[5], a6 = a[6], a7 = a[7]
  const a8 = a[8], a9 = a[9], a10 = a[10], a11 = a[11]
  const a12 = a[12], a13 = a[13], a14 = a[14], a15 = a[15]

  let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3]
  out[0] = a0*b0 + a4*b1 + a8*b2 + a12*b3
  out[1] = a1*b0 + a5*b1 + a9*b2 + a13*b3
  out[2] = a2*b0 + a6*b1 + a10*b2 + a14*b3
  out[3] = a3*b0 + a7*b1 + a11*b2 + a15*b3

  b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7]
  out[4] = a0*b0 + a4*b1 + a8*b2 + a12*b3
  out[5] = a1*b0 + a5*b1 + a9*b2 + a13*b3
  out[6] = a2*b0 + a6*b1 + a10*b2 + a14*b3
  out[7] = a3*b0 + a7*b1 + a11*b2 + a15*b3

  b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11]
  out[8] = a0*b0 + a4*b1 + a8*b2 + a12*b3
  out[9] = a1*b0 + a5*b1 + a9*b2 + a13*b3
  out[10] = a2*b0 + a6*b1 + a10*b2 + a14*b3
  out[11] = a3*b0 + a7*b1 + a11*b2 + a15*b3

  b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15]
  out[12] = a0*b0 + a4*b1 + a8*b2 + a12*b3
  out[13] = a1*b0 + a5*b1 + a9*b2 + a13*b3
  out[14] = a2*b0 + a6*b1 + a10*b2 + a14*b3
  out[15] = a3*b0 + a7*b1 + a11*b2 + a15*b3
}

/** Write a column-major 4×4 rotation matrix for `rad` radians about unit axis (ax, ay, az). */
export function mat4AxisAngle(out: Float64Array, ax: number, ay: number, az: number, rad: number): void {
  const c = Math.cos(rad), s = Math.sin(rad), t = 1 - c
  out[0]  = t*ax*ax + c;     out[1]  = t*ax*ay + s*az; out[2]  = t*ax*az - s*ay; out[3]  = 0
  out[4]  = t*ax*ay - s*az;  out[5]  = t*ay*ay + c;    out[6]  = t*ay*az + s*ax; out[7]  = 0
  out[8]  = t*ax*az + s*ay;  out[9]  = t*ay*az - s*ax; out[10] = t*az*az + c;    out[11] = 0
  out[12] = 0;                out[13] = 0;              out[14] = 0;              out[15] = 1
}

/** Write a column-major 4×4 translation matrix: identity + displacement along axis (ax,ay,az) by `dist`. */
export function mat4Translation(out: Float64Array, ax: number, ay: number, az: number, dist: number): void {
  out[0]  = 1; out[1]  = 0; out[2]  = 0; out[3]  = 0
  out[4]  = 0; out[5]  = 1; out[6]  = 0; out[7]  = 0
  out[8]  = 0; out[9]  = 0; out[10] = 1; out[11] = 0
  out[12] = ax * dist; out[13] = ay * dist; out[14] = az * dist; out[15] = 1
}

// ── Solver workspace ──

/**
 * Pre-allocated buffers for the IK solver. Cached on the Robot instance and
 * reused across iterations to avoid GC pressure.
 */
export class SolverBuffers {
  readonly totalDim: number
  readonly nj: number

  J: Mat
  JJt: Mat
  A: Mat         // overwritten by LU each iteration
  Ainv: Mat
  pinv: Mat      // nj x totalDim
  error: Float64Array
  dq: Float64Array
  qDiff: Float64Array
  pivots: Int32Array
  luWork: Mat    // copy of A for determinant computation

  // Null-space (only allocated when nj > totalDim)
  pinvJ: Mat | null
  nullProj: Mat | null
  nullStep: Float64Array | null

  constructor(totalDim: number, nj: number) {
    this.totalDim = totalDim
    this.nj = nj

    this.J = mat(totalDim, nj)
    this.JJt = mat(totalDim, totalDim)
    this.A = mat(totalDim, totalDim)
    this.Ainv = mat(totalDim, totalDim)
    this.pinv = mat(nj, totalDim)
    this.error = new Float64Array(totalDim)
    this.dq = new Float64Array(nj)
    this.qDiff = new Float64Array(nj)
    this.pivots = new Int32Array(totalDim)
    this.luWork = mat(totalDim, totalDim)

    if (nj > totalDim) {
      this.pinvJ = mat(nj, nj)
      this.nullProj = mat(nj, nj)
      this.nullStep = new Float64Array(nj)
    } else {
      this.pinvJ = null
      this.nullProj = null
      this.nullStep = null
    }
  }
}
