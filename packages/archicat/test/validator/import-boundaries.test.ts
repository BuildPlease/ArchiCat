import { afterAll, describe, expect, test } from 'vitest';

import { cleanupConsumerProjects, createConsumerProject, createModule } from '@test/fixtures/consumer-project';
import { runArchicat } from '@test/fixtures/run-archicat';

describe('import boundary validator', () => {
  afterAll(() => {
    cleanupConsumerProjects();
  });

  test('should reject cross-module source imports', () => {
    const root = createConsumerProject('validator-cross-module-source-import');

    createModule(root, { name: 'account' });
    createModule(root, {
      name: 'media',
      implDependencies: ['module.account.api'],
      implIndex: `
        import { accountApi } from '../../account/api/index.js';
        export const mediaImpl = accountApi;
      `,
    });

    const generateResult = runArchicat(root, 'generate');

    expect(generateResult.status).not.toBe(0);
    expect(generateResult.stderr).toMatch(/imports Module "account"/);

    const result = runArchicat(root, 'validate');

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/imports Module "account"/);
  });

  test('should reject same-definition cross-surface source imports', () => {
    const root = createConsumerProject('validator-cross-surface-source-import');

    createModule(root, {
      name: 'account',
      implIndex: `
        import { accountApi } from '../api/index.js';
        export const accountImpl = accountApi;
      `,
    });

    const generateResult = runArchicat(root, 'generate');

    expect(generateResult.status).not.toBe(0);
    expect(generateResult.stderr).toMatch(/imports Module "account" api through a source path/);

    const result = runArchicat(root, 'validate');

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/imports Module "account" api through a source path/);
  });
});
