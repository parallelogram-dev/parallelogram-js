import { defineConfig } from 'tsup'
export default defineConfig({
  entry: ['src/index.js'],
  format: ['esm','cjs'],
  dts: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false
})
