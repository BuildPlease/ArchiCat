import { ArchicatPipeline, doctorStep } from '../pipeline/index';
import type { ArchicatCliCommandOptions, ArchicatCliCommandResult } from './command-result';

// MARK: - Public

export async function runDoctorCommand(options: ArchicatCliCommandOptions): Promise<ArchicatCliCommandResult> {
  return await ArchicatPipeline.make('doctor').use(doctorStep()).run(options);
}
