import path from 'node:path';

import type { ResolvedArchicatProject } from '@internal/model';

import { writeTextFile } from '@internal/generator/file-writer';

// MARK: - Graph type generation

export function generateGraphTypes(project: ResolvedArchicatProject): void {
  const allTargets = project.graph.targets.map((target) => target.key);
  const apiTargets = project.graph.targets.filter((target) => target.surface === 'api').map((target) => target.key);

  const content = `import 'archicat';

declare module 'archicat' {
${renderInterface('ArchicatModuleApiDependencies', apiTargets)}

${renderInterface('ArchicatModuleImplDependencies', allTargets)}

${renderInterface('ArchicatLibraryApiDependencies', apiTargets)}

${renderInterface('ArchicatLibraryImplDependencies', allTargets)}

${renderInterface('ArchicatAppDependencies', allTargets)}
}

export {};
`;

  writeTextFile(path.join(project.outDir, 'types', 'graph.d.ts'), content);
}

// MARK: - Graph type formatting

function renderInterface(name: string, entries: readonly string[]): string {
  const body = Array.from(new Set(entries)).sort((a, b) => a.localeCompare(b)).map((entry) => `    '${entry}': true;`).join('\n');

  return `  interface ${name} {\n${body}\n  }`;
}
