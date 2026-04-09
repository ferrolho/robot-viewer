import { defineConfig } from 'vite'

export default defineConfig({
  base: '/robot-explorer/',
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  // TODO: remove resolve block once urdf-loader is back on npm (after gkjohnson/urdf-loaders#330 merges)
  // These are only needed because urdf-loader is a local symlink (file:../urdf-loaders/javascript)
  resolve: {
    preserveSymlinks: true,
    dedupe: ['three']
  }
})
