import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['iife'],
  globalName: 'ObservabilitySDK',
  dts: false,
  splitting: false,
  sourcemap: false,
  clean: true,
  minify: true,
  treeshake: true,
  noExternal: [/.*/],
  outDir: 'dist-cdn',
  outExtension() {
    return {
      js: '.min.js',
    };
  },
  esbuildOptions(options) {
    options.bundle = true;
    options.platform = 'browser';
    options.target = 'es2020';
    options.legalComments = 'none';
  },
});