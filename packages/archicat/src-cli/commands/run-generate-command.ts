import { ArchicatPipeline, doctorStep, generateStep, validateStep } from '../pipeline/index';
import type { ArchicatCliCommandOptions, ArchicatCliCommandResult } from './command-result';

// MARK: - Public

export async function runGenerateCommand(options: ArchicatCliCommandOptions): Promise<ArchicatCliCommandResult> {
  return await ArchicatPipeline.make('generate').use(doctorStep()).use(validateStep()).use(generateStep()).run(options);
}
