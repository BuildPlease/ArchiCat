import type { ArchicatCliCommandOptions, ArchicatCliCommandResult } from './command-result';
import { runBuildCommand } from './run-build-command';

// MARK: - Public

export async function runGenerateCommand(options: ArchicatCliCommandOptions): Promise<ArchicatCliCommandResult> {
  return await runBuildCommand(options);
}
