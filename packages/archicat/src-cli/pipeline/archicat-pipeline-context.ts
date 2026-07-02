import { loadArchicatBuildContext } from '@internal/context';
import type { ResolvedArchicatProject } from '@internal/model';

import type { ArchicatCliCommandOptions } from '../commands/index';

// MARK: - Public

export class ArchicatPipelineContext {
  private project?: ResolvedArchicatProject;

  public constructor(public readonly options: ArchicatCliCommandOptions) {}

  public async getProject(): Promise<ResolvedArchicatProject> {
    this.project ??= await loadArchicatBuildContext(this.options.config);
    return this.project;
  }
}
