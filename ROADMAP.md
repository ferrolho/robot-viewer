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
Create [`ferrolho/robot-viewer-models`](https://github.com/ferrolho/robot-viewer-models) with a Python pipeline that:
- [x] Scaffold repo (scripts/, robots.yaml, pyproject.toml, CI workflow)
- [x] Pull URDF descriptions from upstream via `robot_descriptions` Python package
- [x] Decimate meshes to two LODs (low ~5k tris, medium ~25k tris) with `trimesh`
- [x] Convert meshes to GLB via `trimesh` (Draco compression optional via `gltf-transform`)
- [x] Rewrite URDF mesh paths to relative GLB references
- [x] Generate `manifest.json` with model metadata (id, brand, name, tipLinks, dof, etc.)
- [x] Validate each model (URDF parses, meshes exist, DOF matches)
- [x] CI workflow: tag push → process models → commit to `dist` branch → jsDelivr serves via `cdn.jsdelivr.net/gh/...`
- [x] Initial set: UR3/5/10, KUKA iiwa, Panda, ANYmal C, TALOS, TIAGo, Valkyrie, iCub, HyQ, NEXTAGE (12 robots)

### Phase 8: URDF Migration — Viewer (feature branch on robot-viewer)
- [x] Add `urdf-loader` dependency, remove `jszip`/`jszip-utils`
- [x] New `src/ModelLoader.ts` — fetch manifest from CDN, load URDF+GLB via `URDFLoader`+`GLTFLoader`
- [x] Refactor `src/Robot.ts` — replace COLLADA interfaces with loader-agnostic `RobotKinematics` interface; adapter converts URDF joints (radians) to internal convention (degrees)
- [x] Remove `computeKinematicsGeometry` — analytical IK disabled for now; pseudo-inverse is the default
- [x] Rewrite `src/app.ts` model loading — replace `loadModelZae` with URDF fetch; generate sidebar dynamically from manifest
- [x] Update `index.html` — replace hardcoded brand `<details>` with single `<div id="models-list">`
- [x] Update `src/types.d.ts` — add URDF/GLTF declarations, remove COLLADA/JSZip
- [x] Fix Z-up (ROS) to Y-up (Three.js) coordinate conversion

### Phase 9: URDF Migration — Cleanup
- [x] Remove `collada-robots-collection` submodule
- [x] Update `.github/workflows/deploy.yml` — remove submodule checkout and asset copy (deploy drops from ~84 MB to <1 MB)
- [x] Remove dead dependencies (`jszip`, `jszip-utils`)
- [x] Delete `src/ColladaRobotsList.ts`
- [x] Update `CLAUDE.md`
- [ ] Archive `ferrolho/collada-robots-collection` on GitHub (read-only, not deleted)

### Phase 10: Expand and Enhance
- [ ] Expand to all 179+ robots from robot-descriptions that pass validation
- [ ] LOD switching UI (auto: low on mobile, medium on desktop)
- [ ] Sidebar search and category filtering for large catalog
- [ ] Thumbnail generation for model list
- [ ] Optional: service worker for offline model caching
