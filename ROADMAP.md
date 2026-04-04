# Roadmap

## Phase 4: Type Safety

- [ ] Add `jsconfig.json` with `checkJs: true` for zero-cost type checking on existing JS
- [ ] Migrate `Robot.js` to TypeScript (most complex file, benefits most from types)
- [ ] Migrate `math_.js` to TypeScript (robotics math, shape mismatches are subtle)
- [ ] Migrate `app.js` to TypeScript
- [ ] Migrate remaining files (`IkSolver.js`, `ColladaRobotsList.js`)

## Phase 5: Drop Legacy Dependencies

- [ ] Evaluate removing `numeric.js` — mathjs v15 has built-in `eig()` and `solve()`; would eliminate the `window.numeric` hack and `eval()` warnings
- [ ] Remove `Number.prototype.clamp` polyfill — replace with a standalone `clamp()` utility
- [ ] Replace jQuery + Materialize v0.100 (unmaintained) with vanilla JS + modern CSS
- [ ] Consider `lil-gui` or `dat.gui` for the control panel (standard in Three.js projects)

## Phase 6: Code Quality

- [ ] Split `app.js` into modules: scene setup, UI handlers, model loader, animation loop
- [ ] Add `jsconfig.json` or `tsconfig.json` with strict mode once migration is complete
- [ ] Add Playwright E2E tests for critical flows (load model, IK drag, reachability)
