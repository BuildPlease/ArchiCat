import { afterAll, describe, expect, test } from 'vitest';

import { cleanupConsumerProjects, createConsumerProject, createLibrary, createModule } from '@test/fixtures/consumer-project';
import { runArchicat } from '@test/fixtures/run-archicat';

describe('module imports', () => {
  afterAll(() => {
    cleanupConsumerProjects();
  });

  test('should allow alias imports when the target module api is declared', () => {
    const root = createConsumerProject('validate-declared-module-dependency');

    createModule(root, { name: 'account' });
    createModule(root, {
      name: 'media',
      dependencies: ['module.account.api'],
      implIndex: `
        import { accountApi } from '@module/account/api/index.js';
        export const mediaImpl = accountApi;
      `,
    });

    expect(runArchicat(root, 'generate').status).toBe(0);

    const result = runArchicat(root, 'validate');

    expect(result.status, result.stderr).toBe(0);
  });

  test('should allow module implementation to import own api without declaring itself', () => {
    const root = createConsumerProject('validate-own-api');

    createModule(root, {
      name: 'account',
      implIndex: `
        import { accountApi } from '@module/account/api/index.js';
        export const accountImpl = accountApi;
      `,
    });

    expect(runArchicat(root, 'generate').status).toBe(0);

    const result = runArchicat(root, 'validate');

    expect(result.status, result.stderr).toBe(0);
  });


  test('should allow declared implementation target imports', () => {
    const root = createConsumerProject('validate-declared-impl-dependency');

    createModule(root, { name: 'account' });
    createModule(root, {
      name: 'media',
      implDependencies: ['module.account.impl'],
      implIndex: `
        import { accountImpl } from '@module/account/impl/index.js';
        export const mediaImpl = accountImpl;
      `,
    });

    expect(runArchicat(root, 'generate').status).toBe(0);

    const result = runArchicat(root, 'validate');

    expect(result.status, result.stderr).toBe(0);
  });


  test('should reject root and surface barrel aliases', () => {
    const root = createConsumerProject('validate-explicit-surface-imports');

    createModule(root, { name: 'account' });
    createModule(root, {
      name: 'media',
      dependencies: ['module.account.api'],
      implIndex: `
        import { accountApi } from '@module/account';
        export const mediaImpl = accountApi;
      `,
    });

    const result = runArchicat(root, 'validate');

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/Unsupported Archicat alias/);
    expect(result.stderr).toMatch(/@module\/account\/api/);
  });

  test('should reject alias imports that are not declared as dependencies', () => {
    const root = createConsumerProject('validate-missing-dependency');

    createModule(root, { name: 'account' });
    createModule(root, {
      name: 'media',
      implIndex: `
        import { accountApi } from '@module/account/api/index.js';
        export const mediaImpl = accountApi;
      `,
    });

    const generateResult = runArchicat(root, 'generate');

    expect(generateResult.status).not.toBe(0);
    expect(generateResult.stderr).toMatch(/imports "module.account.api" but does not declare a dependency/);

    const result = runArchicat(root, 'validate');

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/imports "module.account.api" but does not declare a dependency/);
  });

  test('should reject cross-module source imports even when dependency is declared', () => {
    const root = createConsumerProject('validate-relative-source-import');

    createModule(root, { name: 'account' });
    createModule(root, {
      name: 'media',
      dependencies: ['module.account.api'],
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

  test('should validate library aliases as declared dependencies', () => {
    const root = createConsumerProject('validate-library-dependency', {
      config: {
        librariesInclude: ['./src/libraries'],
      },
    });

    createLibrary(root, { name: 'backend' });
    createModule(root, {
      name: 'media',
      dependencies: ['library.backend.api'],
      implIndex: `
        import { backendLibrary } from '@library/backend/api/index.js';
        export const mediaImpl = backendLibrary;
      `,
    });

    expect(runArchicat(root, 'generate').status).toBe(0);

    const result = runArchicat(root, 'validate');

    expect(result.status, result.stderr).toBe(0);
  });
});
