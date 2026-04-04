# Roadmap

## Completed

### Phase 1: Vite Migration
- [x] Replace Grunt+Browserify+Babel with Vite
- [x] Move static assets to `public/`, index.html to root
- [x] Convert require() calls to ES module imports
- [x] Add GitHub Actions deploy workflow

### Phase 2: Three.js Update
- [x] Update Three.js from r92 to v0.183
- [x] Replace vendored extensions with official addons
- [x] Fix removed/renamed APIs (Geometry, Math, TransformControls)

### Phase 3: Dependency Cleanup
- [x] Update mathjs to v15
- [x] Replace tween.js with @tweenjs/tween.js
- [x] Bump file-saver, jszip, jszip-utils, stats.js, hammerjs
- [x] Replace gamepad.js submodule with native Gamepad API
- [x] Add ESLint

### Phase 4: TypeScript Migration
- [x] Migrate all source files to TypeScript
- [x] Add type declarations for untyped dependencies
- [x] Add `tsconfig.json` with strict mode
- [x] Add `npm run typecheck`

## Upcoming

### Phase 5: Drop Legacy Dependencies
- [ ] Evaluate removing `numeric.js` — mathjs v15 has built-in `eig()` and `solve()`; would eliminate the `window.numeric` hack and `eval()` warnings
- [ ] Remove `Number.prototype.clamp` polyfill — replace with a standalone `clamp()` utility
- [ ] Replace jQuery + Materialize v0.100 (unmaintained) with vanilla JS + modern CSS
- [ ] Consider `lil-gui` or `dat.gui` for the control panel (standard in Three.js projects)

### Phase 6: Code Quality
- [ ] Split `app.ts` into modules: scene setup, UI handlers, model loader, animation loop
- [ ] Enable `noImplicitAny` in tsconfig once mathjs types are tightened
- [ ] Add Playwright E2E tests for critical flows (load model, IK drag, reachability)
