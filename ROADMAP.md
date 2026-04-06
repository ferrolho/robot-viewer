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

### Phase 5: Drop Legacy Dependencies
- [x] Evaluate removing `numeric.js` — mathjs v15 has built-in `eig()` and `solve()`; would eliminate the `window.numeric` hack and `eval()` warnings
- [x] Remove `Number.prototype.clamp` polyfill — replace with a standalone `clamp()` utility
- [x] Replace jQuery + Materialize v0.100 (unmaintained) with vanilla JS + modern CSS
- [x] Custom sidebar panel with dark/light theme, ResizeObserver-driven canvas, fat grid lines

## Upcoming

### Phase 6: Code Quality
- [ ] Split `app.ts` into modules: scene setup, UI handlers, model loader, animation loop
- [ ] Enable `noImplicitAny` in tsconfig once mathjs types are tightened
- [ ] Add Playwright E2E tests for critical flows (load model, IK drag, reachability)

### Phase 7: URDF Migration — Model Processing Pipeline (new repo)
Create `ferrolho/robot-viewer-models` (name TBD) with a Python pipeline that:
- [ ] Scaffold repo (scripts/, robots.yaml, pyproject.toml, CI workflow)
- [ ] Pull URDF descriptions from upstream via `robot_descriptions` Python package
- [ ] Decimate meshes to two LODs (low ~5k tris, medium ~25k tris) with `trimesh`
- [ ] Convert meshes to Draco-compressed GLB via `gltf-transform`
- [ ] Rewrite URDF mesh paths to relative GLB references
- [ ] Generate `manifest.json` with model metadata (id, brand, name, tipLinks, dof, etc.)
- [ ] Validate each model (URDF parses, meshes exist, DOF matches)
- [ ] CI workflow: tag push → process models → commit to `dist` branch → jsDelivr serves via `cdn.jsdelivr.net/gh/...`
- [ ] Initial set: UR3/5/10, KUKA iiwa/KR series, Panda, ANYmal, TALOS, TIAGo, Valkyrie, iCub, HyQ

### Phase 8: URDF Migration — Viewer (feature branch on robot-viewer)
- [ ] Add `urdf-loader` dependency, remove `jszip`/`jszip-utils`
- [ ] New `src/ModelLoader.ts` — fetch manifest from CDN, load URDF+GLB via `URDFLoader`+`GLTFLoader`
- [ ] Refactor `src/Robot.ts` — replace COLLADA interfaces with loader-agnostic `RobotKinematics` interface; adapter converts URDF joints (radians) to internal convention (degrees)
- [ ] Replace `computeKinematicsGeometry` — extract link offsets from URDF joint origins; return null for non-6-DOF (analytical IK gracefully unavailable, pseudo-inverse fallback)
- [ ] Rewrite `src/app.ts` model loading — replace `loadModelZae` with URDF fetch; generate sidebar dynamically from manifest
- [ ] Update `index.html` — replace hardcoded brand `<details>` with single `<div id="models-list">`
- [ ] Update `src/types.d.ts` — add URDF/GLTF declarations, remove COLLADA/JSZip

### Phase 9: URDF Migration — Cleanup
- [ ] Remove `collada-robots-collection` submodule
- [ ] Update `.github/workflows/deploy.yml` — remove submodule checkout and asset copy (deploy drops from ~84 MB to <1 MB)
- [ ] Remove dead dependencies (`jszip`, `jszip-utils`)
- [ ] Delete `src/ColladaRobotsList.ts`
- [ ] Update `CLAUDE.md` and `README.md`
- [ ] Archive `ferrolho/collada-robots-collection` on GitHub (read-only, not deleted)

### Phase 10: Expand and Enhance
- [ ] Expand to all 179+ robots from robot-descriptions that pass validation
- [ ] LOD switching UI (auto: low on mobile, medium on desktop)
- [ ] Sidebar search and category filtering for large catalog
- [ ] Thumbnail generation for model list
- [ ] Optional: service worker for offline model caching
