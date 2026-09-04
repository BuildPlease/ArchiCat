import consola from 'consola';

export interface CliOutputRow {
  readonly label: string;
  readonly value: string | number;
}

export class CliOutput {
  public log(message: string): void {
    consola.log(message);
  }

  public info(message: string): void {
    consola.info(message);
  }

  public success(message: string): void {
    consola.success(message);
  }

  public warning(message: string): void {
    consola.warn(message);
  }

  public error(message: string): void {
    consola.error(message);
  }

  public emptyLine(): void {
    consola.log('');
  }

  public title(product: string, command: string, rows: readonly CliOutputRow[] = []): void {
    consola.log([`${product} ${command}`, ...formatRows(rows)].join('\n'));
  }

  public panel(title: string, rows: readonly CliOutputRow[], badge?: string | number): void {
    const heading = badge === undefined ? title : `${title} (${badge})`;
    consola.log([heading, ...formatRows(rows)].join('\n'));
  }

  public step(label: string, message: string): string {
    return `${label}: ${message}`;
  }

  public duration(milliseconds: number): string {
    if (milliseconds < 1000) return `${milliseconds}ms`;

    const seconds = milliseconds / 1000;
    return `${seconds.toFixed(seconds < 10 ? 2 : 1)}s`;
  }
}

function formatRows(rows: readonly CliOutputRow[]): string[] {
  if (rows.length === 0) return [];

  const width = Math.max(...rows.map((row) => row.label.length));
  return rows.map((row) => `  ${row.label.padEnd(width)}  ${String(row.value)}`);
}
