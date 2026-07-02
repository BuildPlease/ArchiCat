import path from 'node:path';

import { ConsoleOutput } from '@internal/console';

import type { ArchicatCliCommandLine, ArchicatCliCommandOptions, ArchicatCliCommandResult } from '../commands/index';
import { ArchicatPipelineContext } from './archicat-pipeline-context';

// MARK: - Public

export interface ArchicatPipelineStep {
  readonly name: string;
  run(context: ArchicatPipelineContext): Promise<ArchicatCliCommandResult>;
}

export class ArchicatPipeline {
  private readonly steps: ArchicatPipelineStep[] = [];

  private constructor(private readonly name: string) {}

  public static make(name: string): ArchicatPipeline {
    return new ArchicatPipeline(name);
  }

  public use(step: ArchicatPipelineStep): this {
    this.steps.push(step);
    return this;
  }

  public async run(options: ArchicatCliCommandOptions): Promise<ArchicatCliCommandResult> {
    const startedAt = Date.now();
    const context = new ArchicatPipelineContext(options);
    const project = await context.getProject();
    const titleLine: ArchicatCliCommandLine = {
      kind: 'title',
      product: 'ArchiCat',
      command: this.name,
      rows: [
        { label: 'config', value: formatPath(project.configFilePath) },
        { label: 'output', value: formatPath(project.outDir) },
      ],
    };
    const panelLines: ArchicatCliCommandLine[] = [];
    const stepLines: ArchicatCliCommandLine[] = [];

    for (const step of this.steps) {
      const result = await step.run(context);
      panelLines.push(...result.lines.filter((line) => line.kind === 'panel'));
      stepLines.push(...result.lines.filter((line) => line.kind !== 'panel'));

      if (result.exitCode !== 0) {
        stepLines.push({ kind: 'error', label: 'failed', message: `Failed in ${ConsoleOutput.duration(Date.now() - startedAt)}` });
        stepLines.push({ kind: 'info', message: '' });

        return { exitCode: result.exitCode, lines: [titleLine, ...panelLines, ...stepLines] };
      }
    }

    return {
      exitCode: 0,
      lines: [
        titleLine,
        ...panelLines,
        ...stepLines,
        { kind: 'success', label: 'done', message: `Completed in ${ConsoleOutput.duration(Date.now() - startedAt)}` },
        { kind: 'info', message: '' },
      ],
    };
  }
}

function formatPath(filePath: string): string {
  const relativePath = path.relative(process.cwd(), filePath);

  if (!relativePath || relativePath.startsWith('..')) {
    return filePath;
  }

  return relativePath;
}
