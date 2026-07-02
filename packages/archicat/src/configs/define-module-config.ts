import type { ArchicatModuleContract, ArchicatModuleInput } from './module-config';
import { defineSurface } from './define-surface-config';

/**
 * @description Defines one Archicat module.
 */
export function defineModule(module: ArchicatModuleInput): ArchicatModuleContract {
  return Object.freeze({
    kind: 'module',
    name: module.name,
    api: defineSurface(module.api),
    impl: defineSurface(module.impl),
  });
}
