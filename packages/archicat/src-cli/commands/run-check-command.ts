import type { ArchicatCliCommandOptions, ArchicatCliCommandResult } from './command-result';
import { runValidateCommand } from './run-validate-command';

// MARK: - Public

export async function runCheckCommand(options: ArchicatCliCommandOptions): Promise<ArchicatCliCommandResult> {
  return await runValidateCommand(options);
}
