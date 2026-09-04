import { type UserConfig, defineConfig } from 'tsdown';

const baseConfig: UserConfig = {
  tsconfig: 'tsconfig.json',
  platform: 'node',
  target: 'esnext',

  hash: false,
  minify: false,
  shims: false,
  sourcemap: false,
  treeshake: true,

  deps: {
    onlyBundle: [],
  },
};

export default defineConfig([
  // MARK: - CLI entry
  {
    ...baseConfig,
    entry: {
      'cli/index': './src-cli/index.ts',
    },
    format: ['esm'],

    outDir: 'dist',
    clean: true,

    dts: false,
  },

  // MARK: - Source entry
  {
    ...baseConfig,
    entry: './src/index.ts',
    format: ['esm', 'cjs'],

    outDir: 'dist/src',
    clean: false,

    dts: true,
  },
]);
