import path from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';

import { cleanupConsumerProjects, createConsumerProject, createLibrary, createModule } from '@test/fixtures/consumer-project';
import { assertFileExists } from '@test/fixtures/files';
import { hasDependencyOrigin, readBuildReport } from '@test/fixtures/reports';
import { runArchicat } from '@test/fixtures/run-archicat';

// MARK: - Tests

describe('report generation', () => {
  afterAll(() => {
    cleanupConsumerProjects();
  });

  test('should generate build report with modules, libraries, targets, and dependency origins', () => {
    const root = createReportProject();

    expectGenerate(root);
    expectReportFiles(root);

    const report = readBuildReport(root);

    expect(report.schemaVersion).toBe(2);
    expect(report.aliases).toEqual({ module: '#modules', library: '#library' });
    expect(report.targets).toEqual(expect.arrayContaining([
      'module.account.api',
      'module.account.impl',
      'module.media.api',
      'module.media.impl',
      'library.backend.api',
      'library.backend.impl',
    ]));
    expect(hasDependencyOrigin(report, 'derived')).toBe(true);
    expect(hasDependencyOrigin(report, 'declared')).toBe(true);
  });
});

// MARK: - Helpers

function createReportProject(): string {
  const root = createConsumerProject('generate-build-report', {
    config: {
      librariesInclude: ['./src/libraries'],
    },
  });

  createLibrary(root, { name: 'backend' });
  createModule(root, { name: 'account' });
  createModule(root, {
    name: 'media',
    dependencies: ['module.account.api', 'library.backend.api'],
  });

  return root;
}

function expectGenerate(root: string): void {
  const result = runArchicat(root, 'generate');

  expect(result.status, result.stderr).toBe(0);
}

function expectReportFiles(root: string): void {
  assertFileExists(path.join(root, '.archicat/reports/build.report.json'));
  assertFileExists(path.join(root, '.archicat/reports/graph.report.json'));
}
