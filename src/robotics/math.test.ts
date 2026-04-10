import { describe, it, expect } from 'vitest'
import { clamp, tr2delta, transl } from './math.ts'

const TOL = 1e-10

function expectClose(actual: number, expected: number, tol = TOL) {
  expect(Math.abs(actual - expected)).toBeLessThan(tol)
}

// Helper: build a column-major 4x4 identity
function identityElements(): number[] {
  // prettier-ignore
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]
}

// Helper: build a column-major 4x4 transform with translation (tx, ty, tz) and identity rotation
function translationElements(tx: number, ty: number, tz: number): number[] {
  const e = identityElements()
  e[12] = tx; e[13] = ty; e[14] = tz
  return e
}

// Helper: column-major rotation about Z by angle (radians) + translation
function rotZTranslation(angle: number, tx: number, ty: number, tz: number): number[] {
  const c = Math.cos(angle), s = Math.sin(angle)
  // prettier-ignore
  return [
    c,  s, 0, 0,
   -s,  c, 0, 0,
    0,  0, 1, 0,
    tx, ty, tz, 1,
  ]
}

describe('clamp', () => {
  it('clamps below min', () => expect(clamp(-5, 0, 10)).toBe(0))
  it('clamps above max', () => expect(clamp(15, 0, 10)).toBe(10))
  it('passes through values in range', () => expect(clamp(5, 0, 10)).toBe(5))
  it('handles min == max', () => expect(clamp(5, 3, 3)).toBe(3))
})

describe('transl', () => {
  it('extracts translation from column-major 4x4', () => {
    const e = translationElements(1.5, -2.3, 4.7)
    const t = transl(e)
    expectClose(t.x, 1.5)
    expectClose(t.y, -2.3)
    expectClose(t.z, 4.7)
  })
})

describe('tr2delta', () => {
  it('returns zeros for identical transforms', () => {
    const e = identityElements()
    const delta = tr2delta(e, e)
    expect(delta.length).toBe(6)
    for (let i = 0; i < 6; i++) expectClose(delta[i], 0)
  })

  it('returns pure translation for translated identity', () => {
    const e0 = identityElements()
    const e1 = translationElements(1, 2, 3)
    const delta = tr2delta(e0, e1)
    expectClose(delta[0], 1)
    expectClose(delta[1], 2)
    expectClose(delta[2], 3)
    // rotation part should be zero
    expectClose(delta[3], 0)
    expectClose(delta[4], 0)
    expectClose(delta[5], 0)
  })

  it('returns only translation with partial="translational"', () => {
    const e0 = identityElements()
    const e1 = translationElements(1, 2, 3)
    const delta = tr2delta(e0, e1, 'translational')
    expect(delta.length).toBe(3)
    expectClose(delta[0], 1)
    expectClose(delta[1], 2)
    expectClose(delta[2], 3)
  })

  it('returns only rotation with partial="rotational"', () => {
    const e0 = identityElements()
    const angle = 0.1
    const e1 = rotZTranslation(angle, 5, 6, 7)
    const delta = tr2delta(e0, e1, 'rotational')
    expect(delta.length).toBe(3)
    // Small rotation about Z: dr ≈ [0, 0, sin(angle)/2... ] but exact formula is 0.5*(s21-s12, s02-s20, s10-s01)
    // For Rz(θ): vex(Rz - I) = [0, 0, sin(θ)]  →  0.5 * 2*sin(θ) = sin(θ)
    expectClose(delta[0], 0)
    expectClose(delta[1], 0)
    expectClose(delta[2], Math.sin(angle))
  })

  it('writes into pre-allocated output buffer', () => {
    const e0 = identityElements()
    const e1 = translationElements(4, 5, 6)
    const buf = new Float64Array(6)
    const result = tr2delta(e0, e1, '', buf)
    expect(result).toBe(buf)
    expectClose(buf[0], 4)
    expectClose(buf[1], 5)
    expectClose(buf[2], 6)
  })
})
