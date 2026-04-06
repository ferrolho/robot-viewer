# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Robot Viewer is an interactive 3D web application for visualizing and manipulating robot models with real-time forward/inverse kinematics. It loads URDF robot models (with GLB meshes) from a CDN and provides an interactive Three.js scene with IK solvers, joint control, and various visualization tools (ellipsoids, point clouds, reachability).

## Build & Development Commands

- **Dev server:** `npm run dev` (Vite dev server with HMR)
- **Build:** `npm run build` (Vite production build → `dist/`)
- **Preview:** `npm run preview` (serve production build locally)
- **Lint:** `npm run lint` (ESLint)
- **Type check:** `npm run typecheck` (TypeScript)

## Architecture

Single-page app using TypeScript (no framework), bundled with Vite.

**Key source files:**
- `src/app.ts` — Main entry point: Three.js scene setup, UI event handlers, animation loop
- `src/Robot.ts` — Core robot class: FK/IK computation, Jacobian, joint control. Uses a loader-agnostic `RobotKinematics` interface with a URDF adapter (`robotKinematicsFromURDF`)
- `src/ModelLoader.ts` — Fetches model manifest from CDN, loads URDF + GLB meshes via `urdf-loader` and Three.js `GLTFLoader`
- `src/math_.ts` — Robotics math utilities (transform matrices, Jacobians)
- `src/IkSolver.ts` — IK solver type enum (Pseudo Inverse, Genetic Algorithm)
- `src/types.d.ts` — Type declarations for untyped dependencies
- Three.js addons imported from `three/addons/...` (OrbitControls, TransformControls, GLTFLoader, STLExporter, ConvexGeometry)

**Model hosting:** Robot models are processed and hosted in a separate repo ([ferrolho/robot-viewer-models](https://github.com/ferrolho/robot-viewer-models)) and served via `raw.githubusercontent.com` from the `dist` branch. The base URL can be overridden with the `VITE_MODELS_BASE_URL` env var.

**Output:** `dist/` is the Vite build output (gitignored). Static assets live in `public/`. Entry point is `index.html` at project root.

## Tech Stack

Three.js (3D rendering), urdf-loader (URDF parsing), mathjs (linear algebra), kinematics.js (analytical IK), TWEEN.js (animation), FileSaver (export).

## Coordinate Conventions

- Three.js uses **Y-up**; URDF/ROS uses **Z-up**. Loaded URDF robots are rotated -90° around X to convert.
- `Robot.ts` stores joint values in **degrees** internally. The URDF adapter converts degrees ↔ radians when calling `urdf-loader`'s `setJointValue` (which expects radians).

## Design Language

Industrial control panel aesthetic — functional, precise, no decorative excess.

**Theme:** Dark-first with light mode. CSS custom properties in `:root` / `[data-theme]`. Key tokens:
- Backgrounds: `--bg-dark` → `--bg-panel` → `--bg-surface` → `--bg-hover` (darkest to lightest)
- Accent: `--accent` (teal green `#22d3a7`), used sparingly for active states and interactive highlights
- Text: `--text` (primary), `--text-muted`, `--text-dim` (least prominent)
- Borders: `--border`, `--border-light`

**Typography:** `DM Sans` (body), `JetBrains Mono` (data values, kbd). No other fonts. Sizes: 10px labels, 12-13px body, 14-15px headings. Use `letter-spacing` and `text-transform: uppercase` for section labels.

**Layout:** 280px sidebar, grid-based. Compact spacing (6-16px). Sections separated by `border-bottom: 1px solid var(--border)`.

**Components:**
- Toggle rows: label + custom toggle switch (no native checkboxes)
- Buttons: solid accent (`--accent`) or outline (`--border-light` border)
- Model browser: two-level — brand tile grid (2 columns, logo + name + count) → robot list with back button
- Brand tiles: `var(--bg-surface)` background, `var(--border)` border, accent border on hover, logo with fallback to two-letter initials

**Interactions:** Subtle and fast — 0.15s backgrounds, 0.2s transforms. No bounce or spring animations. `scale(0.97)` on button active. Hover states change background and text color, never add shadows or glow.

**Icons:** Inline SVG, 16px, `stroke="currentColor" stroke-width="2"`. No icon library.

## Known Limitations

- Pseudo Inverse is the recommended IK solver; Genetic Algorithm is slow
- Analytical IK (via `kinematics` package) is currently disabled — requires extracting DH-like geometry from URDF joint origins (not yet implemented)
