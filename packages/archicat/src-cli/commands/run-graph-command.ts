import { loadArchicatBuildContext } from '@internal/context';
import { formatProjectGraph } from '@internal/graph';

import type { ArchicatCliCommandOptions, ArchicatCliCommandResult } from './command-result';

// MARK: - Public

export async function runGraphCommand(options: ArchicatCliCommandOptions): Promise<ArchicatCliCommandResult> {
  const project = await loadArchicatBuildContext(options.config);

  return {
    exitCode: 0,
    lines: formatProjectGraph(project).map((message) => ({ kind: 'info', message })),
  };
}
