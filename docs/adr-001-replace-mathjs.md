# ADR-001: Replace mathjs with hand-written linear algebra

**Status:** Accepted
**Date:** 2026-04-09

## Context

The whole-body IK solver (`moveTipsToPoses`) was hitting performance limits on
high-DOF robots. On atlas_v4 (30 joints, 4 tips), each solve built and solved a
24x30 stacked Jacobian system over 100 iterations, making ~2000 mathjs calls per
solve.

[mathjs](https://mathjs.org/) is a general-purpose symbolic math library. Every
operation goes through dynamic type dispatch, creates intermediate matrix
objects, and runs generic (non-size-specialised) algorithms. This per-call
overhead dominated the IK solve time — the actual floating-point arithmetic for
matrices this small (max 24x24 inverse) is trivial.

## Decision

Replace all mathjs usage with a purpose-built `src/robotics/linalg.ts` module:

- **`Mat` type**: flat `Float64Array` + row/col dimensions (row-major layout)
- **In-place operations**: `multiplyInto`, `multiplyABtInto`, `multiplyAtBInto`,
  `addScaledIdentityInto`, `matVecMultiplyInto`, `subtractInto` — all write into
  pre-allocated output buffers to avoid GC pressure
- **LU solver**: `luDecomposeInPlace` with partial pivoting,
  `luSolveInPlace`, `luInvertInto`, `luDet`
- **Pre-allocated workspace**: `SolverBuffers` class caches all working
  matrices/vectors for a given problem size, reused across IK iterations
- **3x3 matrix square root**: `sqrtm3x3Symmetric` via closed-form Cardano
  eigendecomposition (replaces `math.sqrtm` for ellipsoid visualisation)

`src/robotics/math.ts` was rewritten to operate directly on
`THREE.Matrix4.elements` (column-major `number[]`) instead of converting to
mathjs matrices. The `tr2delta` function now takes element arrays and an optional
pre-allocated output buffer.

mathjs was removed as a dependency entirely (`npm uninstall mathjs`), removing
10 transitive packages.

## Benchmark results

### Node.js (`npm run bench`) — atlas_v4 whole-body IK, 50 runs:

|         | mathjs   | linalg   | vs mathjs | linalg + joint cache | vs mathjs |
| ------- | -------: | -------: | --------: | -------------------: | --------: |
| min     |  63.4 ms |  12.6 ms |     -80%  |              12.0 ms |     -81%  |
| median  |  66.8 ms |  13.3 ms |     -80%  |              12.4 ms |     -81%  |
| mean    |  66.4 ms |  13.8 ms |     -79%  |              13.2 ms |     -80%  |
| p95     |  69.8 ms |  15.1 ms |     -78%  |              15.1 ms |     -78%  |
| max     | 123.1 ms |  30.2 ms |     -75%  |              28.4 ms |     -77%  |

### Browser (Chrome, console.log in-app) — atlas_v4 whole-body IK, 100 iterations:

| mathjs   | linalg   | vs mathjs | linalg + joint cache | vs mathjs |
| -------: | -------: | --------: | -------------------: | --------: |
| 71–74 ms | 19–20 ms |     -73%  |            10–12 ms  |     -85%  |

## Consequences

**Positive:**
- ~7x faster whole-body IK solves in-browser (72ms -> 11ms)
- Removed 10 npm packages from the dependency tree
- All matrix operations are now strongly typed (`Mat` interface, `Float64Array`)
  instead of `any`-typed mathjs wrappers
- Zero per-iteration allocations in the hot loop

**Trade-off:**
- ~320 lines of hand-written linear algebra (`linalg.ts`) to maintain. The
  operations are well-understood (LU decomposition, matrix multiply,
  Gram-Schmidt, Cardano eigenvalues) and the code has no external dependencies.
