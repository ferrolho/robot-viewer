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
- [x] ~~Update mathjs to v15~~ → Removed mathjs entirely; replaced with hand-written `linalg.ts` for ~7x faster IK (see [ADR-001](docs/adr-001-replace-mathjs.md))
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
- [x] Split `app.ts` into modules: `scene.ts` (Three.js setup), `gallery.ts` (model browser), `app.ts` (state, UI, animation)
- [x] Enable `noImplicitAny` in tsconfig (mathjs is gone — main blocker was removed)
- [x] Add vitest test suite for linalg and math modules

### Phase 7: URDF Migration — Model Processing Pipeline (new repo)
Create [`ferrolho/robot-explorer-models`](https://github.com/ferrolho/robot-explorer-models) with a Python pipeline that:
- [x] Scaffold repo (scripts/, robots.yaml, pyproject.toml, CI workflow)
- [x] Pull URDF descriptions from upstream via `robot_descriptions` Python package
- [x] Copy original meshes (STL, DAE, OBJ) with textures to preserve materials
- [x] Rewrite URDF mesh paths to relative references
- [x] Generate `manifest.json` with model metadata (id, brand, name, tipLinks, dof, etc.)
- [x] Validate each model (URDF parses, meshes exist, DOF matches)
- [x] Dist branch served via `raw.githubusercontent.com` (switched from jsDelivr due to stale branch-cache issues)
  - **Note:** jsDelivr (`cdn.jsdelivr.net/gh/{user}/{repo}@{ref}/{path}`) is a zero-setup CDN that mirrors any public GitHub repo, but it caches branch-name → commit-SHA resolution aggressively. `@dist` kept resolving to a stale commit even after purging. It works reliably with **tags** or **commit SHAs** — if we want CDN speed back, tag releases in `robot-explorer-models` (e.g. `@v1`) and reference the tag instead of `@dist`.
- [x] Initial set: 12 robots from robot_descriptions
- [x] Xacro rendering via ROS Noetic Docker container for ABB and KUKA industrial robots
- [x] Expanded to 81 robots from 35+ brands (ABB IRB series, KUKA KR series, Unitree, Boston Dynamics, etc.)

### Phase 8: URDF Migration — Viewer (feature branch on robot-explorer)
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
- [ ] ~~GLB conversion with material preservation~~ — Deferred. See [analysis below](#glb-conversion-analysis)
- [x] Sidebar search and category filtering for large catalog
- [x] i18n support with language picker dropdown (English, Japanese, Chinese)
- [ ] Thumbnail generation for model list

### Phase 11: Robustness and UX
- [x] Support `?robot=<id>` URL param for shareable model links
- [x] Add OBJ and GLB mesh loader support for URDF models
- [x] Add `check-models` script to verify all CDN models use supported mesh formats
- [x] Add tipLink validation to `check-models` script
- [x] Auto-detect point contact tips based on kinematic chain length
- [x] Mobile gizmo toolbar for IK mode switching (translate/rotate, local/world frame toggle, keyboard shortcut tooltips)
- [x] Fix DAE mesh name collisions by using urdf-loader link map instead of `getObjectByName`
- [x] Replace unstable eigendecomposition sqrtm with Denman-Beavers iteration
- [x] Center of mass visualization using urdf-loader with inertial parsing
- [x] Switch urdf-loader from local fork to npm (upstream merged inertial parsing PR)
- [x] Fix Dependabot security alerts (bump vite to ^8.0.8)

### Known Issues
- [x] Closed-chain linkages (e.g. Robotiq parallel grippers) — mimic joints are now excluded from controllable DOFs and driven automatically by urdf-loader
- [x] IK goal is only created for the first tipLink — robots with multiple end-effectors (hands, feet) only have one IK target

---

### GLB Conversion Analysis

Investigated 2025-04-10. Current mesh hosting: ~973 MB of visual meshes across 81 models.

**Format distribution:** 877 STL, 570 DAE, 169 OBJ, 0 GLB.

**Sample model sizes (visual meshes only):**

| Model | Meshes | Size | Format |
|-------|--------|------|--------|
| finger_edu (ODRI) | 7 | 501 KB | STL |
| pr2 (Willow Garage) | 18 | 1.05 MB | DAE+STL |
| atlas_v4 (Boston Dynamics) | 23 | 3.83 MB | DAE |
| anymal_c (ANYbotics) | 19 | 4.83 MB | DAE |
| talos (PAL Robotics) | 25 | 5.98 MB | STL |
| ur5 (Universal Robots) | 7 | 6.35 MB | DAE |
| abb_irb4600 (ABB) | 7 | 3.97 MB | DAE |
| panda (Franka) | 10 | 10.03 MB | DAE |

**Expected savings:** DAE→GLB: 60-80%. STL→GLB: 40-60%. Fleet-wide: ~973 MB → ~250-400 MB.

**Decision: deferred.** The savings are meaningful but the pipeline cost (Blender headless or assimp in `robot-explorer-models` CI) is high relative to the benefit. Models load acceptably today. Revisit if the catalog grows significantly or users report slow load times.
