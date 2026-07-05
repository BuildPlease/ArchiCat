import path from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';

import type { ConsumerProjectOptions } from '@test/fixtures/consumer-project';
import { cleanupConsumerProjects, createConsumerProject, createModule } from '@test/fixtures/consumer-project';
import { readJson } from '@test/fixtures/files';
import { runArchicat } from '@test/fixtures/run-archicat';

// MARK: - Fixtures

const ARCHICAT_TYPES_INCLUDE = './types/**/*.d.ts';
const ACCOUNT_LEGACY_ALIAS = '@module/account';
const ACCOUNT_API_ALIAS = '@module/account/api';
const ACCOUNT_API_ALIAS_GLOB = '@module/account/api/*';
const ACCOUNT_IMPL_ALIAS = '@module/account/impl';
const ACCOUNT_IMPL_ALIAS_GLOB = '@module/account/impl/*';
const ACCOUNT_API_GLOB_PATH = '../src/modules/account/api/*';
const ACCOUNT_IMPL_GLOB_PATH = '../src/modules/account/impl/*';

const DECORATOR_BASE_TSCONFIG = `
  {
    "compilerOptions": {
      // Valid JSONC comment.
      "target": "ES2024",
      "experimentalDecorators": true,
      "emitDecoratorMetadata": true,
      "skipLibCheck": true
    }
  }
`;

const NODE_TSCONFIG = `
  {
    "extends": "./tsconfig.base.json",
    "compilerOptions": {
      "types": ["node"]
    }
  }
`;

const BASE_TSCONFIG_WITH_PATHS = `
  {
    "compilerOptions": {
      "target": "ES2024",
      "paths": {
        "@app/*": ["src/*"]
      }
    }
  }
`;

interface GeneratedTsconfig {
  extends?: string;
  compilerOptions: {
    paths: Record<string, string[]>;
    baseUrl?: unknown;
    experimentalDecorators?: unknown;
  };
  include?: string[];
  exclude?: string[];
}

// MARK: - Tests

describe('tsconfig generation', () => {
  afterAll(() => {
    cleanupConsumerProjects();
  });

  test('should generate TypeScript 6 compatible aliases without baseUrl', () => {
    const root = createProjectWithAccountModule('generate-tsconfig-paths');

    expectGenerate(root);

    const tsconfig = readGeneratedTsconfig(root);

    expect(tsconfig.compilerOptions.baseUrl).toBeUndefined();
    expect(tsconfig.compilerOptions.paths[ACCOUNT_LEGACY_ALIAS]).toBeUndefined();
    expect(tsconfig.compilerOptions.paths[ACCOUNT_API_ALIAS]).toBeUndefined();
    expectPath(tsconfig, ACCOUNT_API_ALIAS_GLOB, ACCOUNT_API_GLOB_PATH);
    expect(tsconfig.compilerOptions.paths[ACCOUNT_IMPL_ALIAS]).toBeUndefined();
    expectPath(tsconfig, ACCOUNT_IMPL_ALIAS_GLOB, ACCOUNT_IMPL_GLOB_PATH);
    expect(tsconfig.include).toEqual(['../src', ARCHICAT_TYPES_INCLUDE]);
  });

  test('should generate configured tsConfig layer and configured aliases', () => {
    const root = createLayerProject();

    expectGenerate(root);

    const tsconfig = readGeneratedTsconfig(root);

    expect(tsconfig.extends).toBe('../tsconfig.node.json');
    expectPath(tsconfig, '@app/*', '../src/*');
    expectPath(tsconfig, ACCOUNT_API_ALIAS_GLOB, ACCOUNT_API_GLOB_PATH);
    expect(tsconfig.include).toEqual([
      '../bootstrap.ts',
      '../src/app',
      '../src/modules',
      '../types',
      ARCHICAT_TYPES_INCLUDE,
    ]);
    expect(tsconfig.exclude).toEqual(['../node_modules', '../dist']);
    expect(tsconfig.compilerOptions.experimentalDecorators).toBeUndefined();
  });

  test('should reject base tsconfig paths in extends chain', () => {
    const root = createProjectWithAccountModule('generate-tsconfig-root-paths', {
      tsconfigBase: BASE_TSCONFIG_WITH_PATHS,
    });

    const result = runArchicat(root, 'generate');

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/Move aliases into archicat.config.ts alias/);
  });

  test('should reject typescript.tsConfig compilerOptions.paths', () => {
    const root = createProjectWithAccountModule('generate-tsconfig-user-paths', {
      config: {
        typescript: {
          tsConfig: {
            extends: './tsconfig.base.json',
            include: ['src'],
            compilerOptions: {
              paths: {
                '@app/*': ['src/*'],
              },
            },
          },
        },
      },
    });

    const result = runArchicat(root, 'generate');

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/typescript\.tsConfig\.compilerOptions\.paths is not supported/);
  });

  test('should reject configured aliases inside the reserved Archicat prefix', () => {
    const root = createProjectWithAccountModule('generate-tsconfig-conflict', {
      config: {
        alias: {
          '@module/*': './src/module/*',
        },
      },
    });

    const result = runArchicat(root, 'generate');

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/Alias conflict/);
  });
});

// MARK: - Helpers

function createLayerProject(): string {
  return createProjectWithAccountModule('generate-tsconfig-layer-alias', {
    config: {
      typescript: {
        tsConfig: {
          extends: './tsconfig.node.json',
          include: ['bootstrap.ts', 'src/app', 'src/modules', 'types'],
          exclude: ['node_modules', 'dist'],
        },
      },
      alias: {
        '@app/*': './src/*',
      },
    },
    tsconfigBase: DECORATOR_BASE_TSCONFIG,
    tsconfigNode: NODE_TSCONFIG,
  });
}

function createProjectWithAccountModule(
  name: string,
  options: ConsumerProjectOptions = {},
): string {
  const root = createConsumerProject(name, options);

  createModule(root, { name: 'account' });

  return root;
}

function expectGenerate(root: string): void {
  const result = runArchicat(root, 'generate');

  expect(result.status, result.stderr).toBe(0);
}

function expectPath(tsconfig: GeneratedTsconfig, alias: string, expected: string): void {
  expect(tsconfig.compilerOptions.paths[alias]).toEqual([expected]);
}

function readGeneratedTsconfig(root: string): GeneratedTsconfig {
  return readJson(path.join(root, '.archicat/tsconfig.json')) as GeneratedTsconfig;
}
