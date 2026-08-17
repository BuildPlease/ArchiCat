// MARK: - Default configuration

export const ArchicatDefaults = Object.freeze({
  configFileName: 'archicat.config.ts',
  root: '.',
  outDir: '.archicat',
  alias: Object.freeze({}),
  generated: Object.freeze({
    reportsDirName: 'reports',
    buildReportFileName: 'build.report.json',
    graphReportFileName: 'graph.report.json',
    tsconfigFileName: 'tsconfig.json',
    typesInclude: './types/**/*.d.ts',
    ignoredDirectoryNames: Object.freeze(['node_modules', '.git', '.archicat', 'archicat-report', 'dist', 'build', 'coverage'] as const),
  }),
  typescript: Object.freeze({
    consumerTsconfigFileName: 'tsconfig.json',
    tsConfig: Object.freeze({
      include: Object.freeze([] as const),
      exclude: Object.freeze([] as const),
      files: Object.freeze([] as const),
    }),
  }),
  modules: Object.freeze({
    include: Object.freeze(['./src/modules'] as const),
    alias: '#modules',
  }),
  libraries: Object.freeze({
    include: Object.freeze([] as const),
    alias: '#library',
  }),
  apps: Object.freeze({
    include: Object.freeze([] as const),
  }),
});
