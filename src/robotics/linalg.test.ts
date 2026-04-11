import { describe, it, expect } from 'vitest'
import {
  mat, zeros, identity, fromRows, copyInto,
  multiplyInto, multiplyABtInto, multiplyAtBInto,
  addScaledIdentityInto, subtractInto, matVecMultiplyInto,
  vecNorm, vecScaleInPlace,
  luDecomposeInPlace, luSolveInPlace, luInvertInto, luDet,
  multiply, transpose, inv,
  sqrtm3x3Symmetric,
  mat4Multiply, mat4AxisAngle,
} from './linalg.ts'

const TOL = 1e-10

function expectClose(actual: number, expected: number, tol = TOL) {
  expect(Math.abs(actual - expected)).toBeLessThan(tol)
}

function expectMatClose(A: { data: Float64Array }, B: { data: Float64Array }, tol = TOL) {
  expect(A.data.length).toBe(B.data.length)
  for (let i = 0; i < A.data.length; i++) expectClose(A.data[i], B.data[i], tol)
}

describe('construction', () => {
  it('mat creates zero-filled matrix of correct size', () => {
    const m = mat(3, 4)
    expect(m.rows).toBe(3)
    expect(m.cols).toBe(4)
    expect(m.data.length).toBe(12)
    expect(m.data.every(v => v === 0)).toBe(true)
  })

  it('identity creates correct NxN identity', () => {
    const I = identity(3)
    expect(I.data).toEqual(new Float64Array([1, 0, 0, 0, 1, 0, 0, 0, 1]))
  })

  it('fromRows converts nested arrays', () => {
    const m = fromRows([[1, 2], [3, 4]])
    expect(m.rows).toBe(2)
    expect(m.cols).toBe(2)
    expect(m.data).toEqual(new Float64Array([1, 2, 3, 4]))
  })

  it('copyInto copies data', () => {
    const src = fromRows([[1, 2], [3, 4]])
    const dst = zeros(2, 2)
    copyInto(dst, src)
    expect(dst.data).toEqual(src.data)
  })
})

describe('multiply', () => {
  it('multiplies 2x3 * 3x2 correctly', () => {
    const A = fromRows([[1, 2, 3], [4, 5, 6]])
    const B = fromRows([[7, 8], [9, 10], [11, 12]])
    const out = zeros(2, 2)
    multiplyInto(out, A, B)
    // [1*7+2*9+3*11, 1*8+2*10+3*12] = [58, 64]
    // [4*7+5*9+6*11, 4*8+5*10+6*12] = [139, 154]
    expect(out.data).toEqual(new Float64Array([58, 64, 139, 154]))
  })

  it('A*B^T matches explicit transpose then multiply', () => {
    const A = fromRows([[1, 2], [3, 4]])
    const B = fromRows([[5, 6], [7, 8]])
    const Bt = transpose(B)
    const expected = multiply(A, Bt)
    const out = zeros(2, 2)
    multiplyABtInto(out, A, B)
    expectMatClose(out, expected)
  })

  it('A^T*B matches explicit transpose then multiply', () => {
    const A = fromRows([[1, 2], [3, 4], [5, 6]])
    const B = fromRows([[7, 8], [9, 10], [11, 12]])
    const At = transpose(A)
    const expected = multiply(At, B)
    const out = zeros(2, 2)
    multiplyAtBInto(out, A, B)
    expectMatClose(out, expected)
  })
})

describe('matrix-vector multiply', () => {
  it('computes M*v', () => {
    const M = fromRows([[1, 2], [3, 4]])
    const v = new Float64Array([5, 6])
    const out = new Float64Array(2)
    matVecMultiplyInto(out, M, v)
    expect(out[0]).toBe(17)
    expect(out[1]).toBe(39)
  })
})

describe('addScaledIdentityInto', () => {
  it('adds lambda*I to a matrix', () => {
    const A = fromRows([[1, 2], [3, 4]])
    const out = zeros(2, 2)
    addScaledIdentityInto(out, A, 10)
    expect(out.data).toEqual(new Float64Array([11, 2, 3, 14]))
  })
})

describe('subtractInto', () => {
  it('computes A - B', () => {
    const A = fromRows([[5, 6], [7, 8]])
    const B = fromRows([[1, 2], [3, 4]])
    const out = zeros(2, 2)
    subtractInto(out, A, B)
    expect(out.data).toEqual(new Float64Array([4, 4, 4, 4]))
  })
})

describe('vector operations', () => {
  it('vecNorm computes L2 norm', () => {
    expectClose(vecNorm(new Float64Array([3, 4])), 5)
  })

  it('vecScaleInPlace scales in place', () => {
    const v = new Float64Array([1, 2, 3])
    vecScaleInPlace(v, 2)
    expect(v).toEqual(new Float64Array([2, 4, 6]))
  })
})

describe('LU decomposition', () => {
  it('solves a 3x3 linear system', () => {
    // A * x = b where A = [[2,1,1],[4,3,3],[8,7,9]], b = [1,1,1]
    const A = fromRows([[2, 1, 1], [4, 3, 3], [8, 7, 9]])
    const pivots = new Int32Array(3)
    luDecomposeInPlace(A, pivots)
    const b = new Float64Array([1, 1, 1])
    luSolveInPlace(A, pivots, b)
    // Verify: original A * x should = [1,1,1]
    const Aorig = fromRows([[2, 1, 1], [4, 3, 3], [8, 7, 9]])
    const check = new Float64Array(3)
    matVecMultiplyInto(check, Aorig, b)
    for (let i = 0; i < 3; i++) expectClose(check[i], 1)
  })

  it('computes determinant', () => {
    const A = fromRows([[1, 2], [3, 4]])
    const pivots = new Int32Array(2)
    const sign = luDecomposeInPlace(A, pivots)
    expectClose(luDet(A, sign), -2)
  })

  it('computes inverse such that A * A^-1 = I', () => {
    const A = fromRows([[4, 7], [2, 6]])
    const Acopy = mat(2, 2)
    copyInto(Acopy, A)
    const pivots = new Int32Array(2)
    luDecomposeInPlace(Acopy, pivots)
    const Ainv = zeros(2, 2)
    luInvertInto(Ainv, Acopy, pivots)
    const product = multiply(A, Ainv)
    expectMatClose(product, identity(2))
  })
})

describe('inv (convenience)', () => {
  it('inverts a 3x3 matrix', () => {
    const A = fromRows([[1, 2, 3], [0, 1, 4], [5, 6, 0]])
    const Ainv = inv(A)
    const product = multiply(A, Ainv)
    expectMatClose(product, identity(3))
  })
})

describe('transpose', () => {
  it('transposes a 2x3 matrix to 3x2', () => {
    const A = fromRows([[1, 2, 3], [4, 5, 6]])
    const At = transpose(A)
    expect(At.rows).toBe(3)
    expect(At.cols).toBe(2)
    expect(At.data).toEqual(new Float64Array([1, 4, 2, 5, 3, 6]))
  })
})

describe('sqrtm3x3Symmetric', () => {
  it('computes square root such that S * S ≈ A for a known SPD matrix', () => {
    // A = [[4, 2, 0], [2, 5, 1], [0, 1, 3]]  (symmetric positive definite)
    const A = fromRows([[4, 2, 0], [2, 5, 1], [0, 1, 3]])
    const S = sqrtm3x3Symmetric(A)
    const S2 = multiply(S, S)
    expectMatClose(S2, A, 1e-8)
  })

  it('square root of identity is identity', () => {
    const I = identity(3)
    const S = sqrtm3x3Symmetric(I)
    expectMatClose(S, I, 1e-12)
  })
})

// ── Column-major 4×4 helpers ──

// Helper: column-major 4×4 identity
function eye4(): Float64Array {
  const m = new Float64Array(16)
  m[0] = m[5] = m[10] = m[15] = 1
  return m
}

// Helper: column-major 4×4 translation matrix
function transMat4(tx: number, ty: number, tz: number): Float64Array {
  const m = eye4()
  m[12] = tx; m[13] = ty; m[14] = tz
  return m
}

describe('mat4Multiply', () => {
  it('A * I = A', () => {
    const A = transMat4(3, 5, 7)
    const out = new Float64Array(16)
    mat4Multiply(out, A, eye4())
    expect(out).toEqual(A)
  })

  it('I * A = A', () => {
    const A = transMat4(3, 5, 7)
    const out = new Float64Array(16)
    mat4Multiply(out, eye4(), A)
    expect(out).toEqual(A)
  })

  it('composes two translations correctly', () => {
    const A = transMat4(1, 2, 3)
    const B = transMat4(10, 20, 30)
    const out = new Float64Array(16)
    mat4Multiply(out, A, B)
    // Translation should be the sum
    expectClose(out[12], 11)
    expectClose(out[13], 22)
    expectClose(out[14], 33)
    // Rotation part should stay identity
    expectClose(out[0], 1); expectClose(out[5], 1); expectClose(out[10], 1)
  })

  it('matches hand-computed rotation * translation', () => {
    // 90° rotation about Z (column-major)
    const R = new Float64Array(16)
    R[0] = 0; R[1] = 1; R[4] = -1; R[5] = 0; R[10] = 1; R[15] = 1
    const T = transMat4(1, 0, 0)
    const out = new Float64Array(16)
    mat4Multiply(out, R, T)
    // Rotated translation: R * [1,0,0] = [0,1,0]
    expectClose(out[12], 0)
    expectClose(out[13], 1)
    expectClose(out[14], 0)
  })
})

describe('mat4AxisAngle', () => {
  it('zero angle produces identity', () => {
    const out = new Float64Array(16)
    mat4AxisAngle(out, 0, 0, 1, 0)
    const I = eye4()
    for (let i = 0; i < 16; i++) expectClose(out[i], I[i])
  })

  it('90° about Z matches known rotation', () => {
    const out = new Float64Array(16)
    mat4AxisAngle(out, 0, 0, 1, Math.PI / 2)
    // Column 0: [cos90, sin90, 0, 0] = [0, 1, 0, 0]
    expectClose(out[0], 0);  expectClose(out[1], 1)
    // Column 1: [-sin90, cos90, 0, 0] = [-1, 0, 0, 0]
    expectClose(out[4], -1); expectClose(out[5], 0)
    // Column 2: [0, 0, 1, 0]
    expectClose(out[10], 1)
    // No translation
    expectClose(out[12], 0); expectClose(out[13], 0); expectClose(out[14], 0)
    expectClose(out[15], 1)
  })

  it('90° about X matches known rotation', () => {
    const out = new Float64Array(16)
    mat4AxisAngle(out, 1, 0, 0, Math.PI / 2)
    // X axis unchanged
    expectClose(out[0], 1); expectClose(out[1], 0); expectClose(out[2], 0)
    // Y → Z
    expectClose(out[4], 0); expectClose(out[5], 0); expectClose(out[6], 1)
    // Z → -Y
    expectClose(out[8], 0); expectClose(out[9], -1); expectClose(out[10], 0)
  })

  it('180° about Y flips X and Z', () => {
    const out = new Float64Array(16)
    mat4AxisAngle(out, 0, 1, 0, Math.PI)
    expectClose(out[0], -1); expectClose(out[5], 1); expectClose(out[10], -1)
  })

  it('R(axis, a) * R(axis, b) = R(axis, a+b) for same axis', () => {
    const a = 0.7, b = 1.1
    const Ra = new Float64Array(16)
    const Rb = new Float64Array(16)
    const Rab = new Float64Array(16)
    const composed = new Float64Array(16)
    mat4AxisAngle(Ra, 0, 0, 1, a)
    mat4AxisAngle(Rb, 0, 0, 1, b)
    mat4AxisAngle(Rab, 0, 0, 1, a + b)
    mat4Multiply(composed, Ra, Rb)
    for (let i = 0; i < 16; i++) expectClose(composed[i], Rab[i], 1e-9)
  })

  it('rotation about arbitrary axis is orthogonal (R^T * R = I)', () => {
    // Normalized axis
    const len = Math.sqrt(1 + 4 + 9)
    const ax = 1/len, ay = 2/len, az = 3/len
    const R = new Float64Array(16)
    mat4AxisAngle(R, ax, ay, az, 1.23)
    // Transpose the 3×3 rotation part and multiply
    const Rt = new Float64Array(16)
    // Transpose: Rt[j*4+i] = R[i*4+j] for i,j in 0..2
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        Rt[j*4+i] = R[i*4+j]
    Rt[15] = 1
    const product = new Float64Array(16)
    mat4Multiply(product, Rt, R)
    const I = eye4()
    for (let i = 0; i < 16; i++) expectClose(product[i], I[i], 1e-9)
  })
})
