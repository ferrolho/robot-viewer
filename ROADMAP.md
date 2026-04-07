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
- [x] Copy original meshes (STL, DAE, OBJ) with textures to preserve materials
- [x] Rewrite URDF mesh paths to relative references
- [x] Generate `manifest.json` with model metadata (id, brand, name, tipLinks, dof, etc.)
- [x] Validate each model (URDF parses, meshes exist, DOF matches)
- [x] Dist branch served via `raw.githubusercontent.com` (switched from jsDelivr due to stale branch-cache issues)
  - **Note:** jsDelivr (`cdn.jsdelivr.net/gh/{user}/{repo}@{ref}/{path}`) is a zero-setup CDN that mirrors any public GitHub repo, but it caches branch-name → commit-SHA resolution aggressively. `@dist` kept resolving to a stale commit even after purging. It works reliably with **tags** or **commit SHAs** — if we want CDN speed back, tag releases in `robot-viewer-models` (e.g. `@v1`) and reference the tag instead of `@dist`.
- [x] Initial set: 12 robots from robot_descriptions
- [x] Xacro rendering via ROS Noetic Docker container for ABB and KUKA industrial robots
- [x] Expanded to 81 robots from 35+ brands (ABB IRB series, KUKA KR series, Unitree, Boston Dynamics, etc.)

### Phase 8: URDF Migration — Viewer (feature branch on robot-viewer)
- [x] Add `urdf-loader` dependency, remove `jszip`/`jszip-utils`
- [x] New `src/ModelLoader.ts` — fetch manifest from CDN, load URDF via `URDFLoader` with native STL/DAE mesh loading
- [x] Refactor `src/Robot.ts` — replace COLLADA interfaces with loader-agnostic `RobotKinematics` interface; adapter converts URDF joints (radians) to internal convention (degrees)
- [x] Remove `computeKinematicsGeometry` — analytical IK disabled for now; pseudo-inverse is the default
- [x] Rewrite `src/app.ts` model loading — replace `loadModelZae` with URDF fetch; generate sidebar dynamically from manifest
- [x] Update `index.html` — replace hardcoded brand `<details>` with single `<div id="models-list">`
- [x] Update `src/types.d.ts` — add URDF/GLTF declarations, remove COLLADA/JSZip
- [x] Fix Z-up (ROS) to Y-up (Three.js) coordinate conversion
- [x] Two-level brand gallery sidebar (brand tile grid → robot list with back button)

### Phase 9: URDF Migration — Cleanup
- [x] Remove `collada-robots-collection` submodule
- [x] Update `.github/workflows/deploy.yml` — remove submodule checkout and asset copy (deploy drops from ~84 MB to <1 MB)
- [x] Remove dead dependencies (`jszip`, `jszip-utils`)
- [x] Delete `src/ColladaRobotsList.ts`
- [x] Update `CLAUDE.md`
- [x] Archive `ferrolho/collada-robots-collection` on GitHub (read-only, not deleted)

### Phase 10: Expand and Enhance
- [x] Expand catalog: 81 robots from 35+ brands
- [x] Add ABB IRB series (10 models) and KUKA KR series (4 models) via xacro rendering in Docker
- [x] Dual-sidebar layout: robot gallery on left (360px, 3-column brand grid), settings on right (240px), both collapsible with re-expand buttons
- [x] Add brand logo icons for all 41 brands (GitHub org avatars)
- [x] Load a random robot on page load
- [x] Stats.js positioned inside 3D viewport (not overlapping sidebars)
- [ ] GLB conversion with material preservation (Blender headless or assimp) for smaller downloads and multi-LOD support
- [ ] LOD switching UI (auto: low on mobile, medium on desktop)
- [x] Sidebar search and category filtering for large catalog
- [x] i18n support with language picker dropdown (English, Japanese, Chinese)
- [ ] Thumbnail generation for model list
- [ ] Optional: service worker for offline model caching

### Known Issues
- [x] Closed-chain linkages (e.g. Robotiq parallel grippers) — mimic joints are now excluded from controllable DOFs and driven automatically by urdf-loader
- [ ] IK goal is only created for the first tipLink — robots with multiple end-effectors (hands, feet) only have one IK target
