import { compactConfig } from './compact-config';
import type { ArchicatConfig, ArchicatConfigInput } from './archicat-config';

type TypeScriptInput = NonNullable<ArchicatConfigInput['typescript']>;
type TsConfigInput = NonNullable<TypeScriptInput['tsConfig']>;
type PrefixInput = NonNullable<ArchicatConfigInput['prefixes']>;
type DefinitionRootInput = NonNullable<ArchicatConfigInput['modules']>;

/**
 * @description Defines the root Archicat config.
 */
export function defineArchicatConfig(config: ArchicatConfigInput = {}): ArchicatConfig {
  return compactConfig({
    root: config.root,
    outDir: config.outDir,
    typescript: config.typescript ? freezeTypeScriptConfig(config.typescript) : undefined,
    alias: config.alias ? Object.freeze({ ...config.alias }) : undefined,
    prefixes: config.prefixes ? freezePrefixConfig(config.prefixes) : undefined,
    modules: config.modules ? freezeDefinitionRootConfig(config.modules) : undefined,
    libraries: config.libraries ? freezeDefinitionRootConfig(config.libraries) : undefined,
    apps: config.apps ? freezeDefinitionRootConfig(config.apps) : undefined,
  });
}

// MARK: - Config freezing

function freezeTypeScriptConfig(config: TypeScriptInput): NonNullable<ArchicatConfig['typescript']> {
  return compactConfig({
    tsConfig: config.tsConfig ? freezeTsConfig(config.tsConfig) : undefined,
  });
}

function freezeTsConfig(config: TsConfigInput): NonNullable<NonNullable<ArchicatConfig['typescript']>['tsConfig']> {
  return compactConfig({
    extends: config.extends,
    include: config.include ? Object.freeze([...config.include]) : undefined,
    exclude: config.exclude ? Object.freeze([...config.exclude]) : undefined,
    files: config.files ? Object.freeze([...config.files]) : undefined,
    compilerOptions: config.compilerOptions ? Object.freeze({ ...config.compilerOptions }) : undefined,
  });
}

function freezePrefixConfig(config: PrefixInput): NonNullable<ArchicatConfig['prefixes']> {
  return compactConfig({
    module: config.module,
    library: config.library,
  });
}

function freezeDefinitionRootConfig(config: DefinitionRootInput): NonNullable<ArchicatConfig['modules']> {
  return compactConfig({
    include: config.include ? Object.freeze([...config.include]) : undefined,
  });
}
