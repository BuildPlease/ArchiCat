import { ConsoleOutput } from '@internal/console';

import type { ArchicatCliCommandLine, ArchicatCliCommandOptions, ArchicatCliCommandResult } from './commands/index';
import {
  runBuildCommand,
  runCheckCommand,
  runDoctorCommand,
  runGenerateCommand,
  runGraphCommand,
  runValidateCommand,
} from './commands/index';

// MARK: - Public

export async function runMain(argv = process.argv.slice(2)): Promise<void> {
  const [command, ...rest] = argv;

  try {
    const options = parseOptions(rest);
    const result = await runCommand(command, options);

    if (!result) {
      return;
    }

    printResult(result);
    process.exitCode = result.exitCode;
  } catch (error) {
    ConsoleOutput.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

// MARK: - Private command routing

async function runCommand(
  command: string | undefined,
  options: ArchicatCliCommandOptions,
): Promise<ArchicatCliCommandResult | undefined> {
  switch (command) {
    case 'build':
      return await runBuildCommand(options);
    case 'generate':
      return await runGenerateCommand(options);
    case 'validate':
      return await runValidateCommand(options);
    case 'check':
      return await runCheckCommand(options);
    case 'graph':
      return await runGraphCommand(options);
    case 'doctor':
      return await runDoctorCommand(options);
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      printHelp();
      return undefined;
    default:
      ConsoleOutput.error(`Unknown command: ${command}`);
      printHelp();
      return { exitCode: 1, lines: [] };
  }
}

// MARK: - Private output

function printResult(result: ArchicatCliCommandResult): void {
  for (const line of result.lines) {
    printLine(line);
  }
}

function printLine(line: ArchicatCliCommandLine): void {
  switch (line.kind) {
    case 'title':
      ConsoleOutput.title(line.product, line.command, line.rows ?? []);
      return;
    case 'panel':
      ConsoleOutput.panel(line.title, line.rows, line.badge);
      return;
    case 'success':
      ConsoleOutput.success(formatStatusLine(line));
      return;
    case 'info':
      if (line.message.length === 0) {
        ConsoleOutput.emptyLine();
        return;
      }

      ConsoleOutput.info(formatStatusLine(line));
      return;
    case 'warning':
      ConsoleOutput.warn(formatStatusLine(line));
      return;
    case 'error':
      ConsoleOutput.error(formatStatusLine(line));
      return;
  }
}

function formatStatusLine(line: Extract<ArchicatCliCommandLine, { kind: 'success' | 'info' | 'warning' | 'error' }>): string {
  return line.label ? ConsoleOutput.step(line.label, line.message) : line.message;
}

function printHelp(): void {
  ConsoleOutput.log([
    'ArchiCat',
    '',
    'Usage:',
    '  archicat build [--config archicat.config.ts]',
    '  archicat validate [--config archicat.config.ts]',
    '  archicat graph [--config archicat.config.ts]',
    '  archicat doctor [--config archicat.config.ts]',
    '',
    'Aliases:',
    '  archicat generate -> archicat build',
    '  archicat check    -> archicat validate',
    '',
  ].join('\n'));
}

// MARK: - Private options

function parseOptions(args: string[]): ArchicatCliCommandOptions {
  const options: { config?: string } = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--config' || arg === '-c') {
      const value = args[index + 1];

      if (!value) {
        throw new Error(`${arg} requires a value.`);
      }

      options.config = value;
      index += 1;
    }
  }

  return options;
}
