# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Robot Viewer is an interactive 3D web application for visualizing and manipulating robot models with real-time forward/inverse kinematics. It loads COLLADA robot models and provides an interactive Three.js scene with IK solvers, joint control, and various visualization tools (ellipsoids, point clouds, reachability).

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
- `src/Robot.ts` — Core robot class: COLLADA loading, FK/IK computation, Jacobian, joint control
- `src/ColladaRobotsList.ts` — Catalog of 30+ robot model definitions (paths, joint configs)
- `src/math_.ts` — Robotics math utilities (transform matrices, Jacobians)
- `src/IkSolver.ts` — IK solver type enum (Pseudo Inverse, Genetic Algorithm)
- `src/types.d.ts` — Type declarations for untyped dependencies
- Three.js addons imported from `three/addons/...` (OrbitControls, TransformControls, ColladaLoader, STLExporter, ConvexGeometry)

**Output:** `dist/` is the Vite build output (gitignored). Static assets live in `public/`. Entry point is `index.html` at project root.

**Git submodules:**
- `collada-robots-collection/` — 30+ robot COLLADA models

## Tech Stack

Three.js (3D rendering), mathjs + numeric.js (linear algebra), kinematics.js (FK/IK), Materialize CSS + jQuery (UI), TWEEN.js (animation), JSZip + FileSaver (export).

## Known Limitations

- IK only works for robots with ≤6 DOF
- Pseudo Inverse is the recommended IK solver; Genetic Algorithm is slow
- Some model kinematics are broken (e.g., Dual Arm Husky)
