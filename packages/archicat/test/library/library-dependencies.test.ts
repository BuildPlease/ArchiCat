import { afterAll, describe, expect, test } from 'vitest';

import { cleanupConsumerProjects, createConsumerProject, createLibrary, createModule } from '@test/fixtures/consumer-project';
import { runArchicat } from '@test/fixtures/run-archicat';

describe('library dependencies', () => {
  afterAll(() => {
    cleanupConsumerProjects();
  });

  test('should allow library implementation to depend on library api', () => {
    const root = createConsumerProject('library-impl-depends-library-api', {
      config: {
        librariesInclude: ['./src/libraries'],
      },
    });

    createLibrary(root, { name: 'error' });
    createLibrary(root, { name: 'cache', implDependencies: ['library.error.api'] });

    const result = runArchicat(root, 'generate');

    expect(result.status, result.stderr).toBe(0);
  });

  test('should allow library dependency on any declared Archicat target', () => {
    const root = createConsumerProject('library-gradle-like-dependencies', {
      config: {
        librariesInclude: ['./src/libraries'],
      },
    });

    createModule(root, { name: 'account' });
    createLibrary(root, { name: 'redis' });
    createLibrary(root, { name: 'cache', implDependencies: ['module.account.api', 'library.redis.impl'] });

    const result = runArchicat(root, 'generate');

    expect(result.status, result.stderr).toBe(0);
  });
});
