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

// ── 3x3 symmetric matrix square root (for ellipsoid visualisation) ──

/**
 * Matrix square root of a 3x3 symmetric positive semi-definite matrix.
 *
 * Uses closed-form eigendecomposition (Cardano's formula for the characteristic
 * polynomial), then computes V * diag(sqrt(lambda)) * V^T.
 */
export function sqrtm3x3Symmetric(A: Mat): Mat {
  const d = A.data
  // Symmetric entries: a=d[0], b=d[1]=d[3], c=d[2]=d[6], e=d[4], f=d[5]=d[7], g=d[8]
  const a = d[0], b = d[1], c = d[2]
  const e = d[4], f = d[5]
  const g = d[8]

  // Characteristic polynomial: lambda^3 - p*lambda^2 + q*lambda - r = 0
  const p = a + e + g // trace
  const q = a * e + a * g + e * g - b * b - c * c - f * f
  const r = a * e * g + 2 * b * f * c - a * f * f - e * c * c - g * b * b // determinant

  // Cardano's method for depressed cubic
  const p3 = p / 3
  const pp = p * p
  const qq = (pp - 3 * q) / 9
  const rr = (2 * pp * p3 - 9 * p * q + 27 * r) / 54

  let lambda0: number, lambda1: number, lambda2: number

  const qqq = qq * qq * qq
  if (rr * rr < qqq) {
    // Three real roots
    const sqrtQQ = Math.sqrt(qq)
    const theta = Math.acos(Math.max(-1, Math.min(1, rr / Math.sqrt(qqq)))) / 3
    lambda0 = -2 * sqrtQQ * Math.cos(theta) + p3
    lambda1 = -2 * sqrtQQ * Math.cos(theta + 2 * Math.PI / 3) + p3
    lambda2 = -2 * sqrtQQ * Math.cos(theta - 2 * Math.PI / 3) + p3
  } else {
    // Fallback (near-degenerate case)
    const sqrtR = Math.sqrt(Math.max(0, rr * rr - qqq))
    const A_ = -Math.sign(rr) * Math.cbrt(Math.abs(rr) + sqrtR)
    const B_ = Math.abs(A_) > 1e-30 ? qq / A_ : 0
    lambda0 = (A_ + B_) + p3
    lambda1 = lambda0
    lambda2 = lambda0
  }

  // Clamp eigenvalues to non-negative (SPD but may have floating-point noise)
  lambda0 = Math.max(0, lambda0)
  lambda1 = Math.max(0, lambda1)
  lambda2 = Math.max(0, lambda2)

  // Compute eigenvectors for each eigenvalue
  const vecs = [lambda0, lambda1, lambda2].map(lam => eigenvector3x3(a, b, c, e, f, g, lam))

  // Gram-Schmidt orthogonalise (eigenvalues may be repeated)
  orthonormalise3(vecs)

  // sqrtm = V * diag(sqrt(lambda)) * V^T
  const s0 = Math.sqrt(lambda0), s1 = Math.sqrt(lambda1), s2 = Math.sqrt(lambda2)
  const out = mat(3, 3)
  const od = out.data
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      od[i * 3 + j] = vecs[0][i] * s0 * vecs[0][j] +
                       vecs[1][i] * s1 * vecs[1][j] +
                       vecs[2][i] * s2 * vecs[2][j]
    }
  }
  return out
}

/** Find an eigenvector for a 3x3 symmetric matrix given an eigenvalue. */
function eigenvector3x3(
  a: number, b: number, c: number,
  e: number, f: number, g: number,
  lam: number
): number[] {
  // (A - lam*I) has a null space; find it via cross-product of two rows
  const r0 = [a - lam, b, c]
  const r1 = [b, e - lam, f]
  const r2 = [c, f, g - lam]

  // Try cross products of row pairs to find a non-zero vector
  const candidates = [
    cross(r0, r1),
    cross(r0, r2),
    cross(r1, r2),
  ]

  let best = candidates[0]
  let bestLen = len3(best)
  for (let i = 1; i < 3; i++) {
    const l = len3(candidates[i])
    if (l > bestLen) { best = candidates[i]; bestLen = l }
  }

  if (bestLen < 1e-30) return [1, 0, 0] // degenerate — return arbitrary unit vector

  const s = 1 / bestLen
  return [best[0] * s, best[1] * s, best[2] * s]
}

function cross(a: number[], b: number[]): number[] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

function len3(v: number[]): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
}

function orthonormalise3(vecs: number[][]): void {
  // Gram-Schmidt
  normalise3(vecs[0])
  subtract3(vecs[1], vecs[1], scale3(dot3(vecs[1], vecs[0]), vecs[0]))
  normalise3(vecs[1])
  subtract3(vecs[2], vecs[2], scale3(dot3(vecs[2], vecs[0]), vecs[0]))
  subtract3(vecs[2], vecs[2], scale3(dot3(vecs[2], vecs[1]), vecs[1]))
  normalise3(vecs[2])
}

function normalise3(v: number[]): void {
  const l = len3(v)
  if (l < 1e-30) return
  v[0] /= l; v[1] /= l; v[2] /= l
}

function dot3(a: number[], b: number[]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function scale3(s: number, v: number[]): number[] {
  return [v[0] * s, v[1] * s, v[2] * s]
}

function subtract3(out: number[], a: number[], b: number[]): void {
  out[0] = a[0] - b[0]; out[1] = a[1] - b[1]; out[2] = a[2] - b[2]
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
