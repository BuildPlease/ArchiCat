import type { DependencyOwner, ParsedDependencyTarget } from './dependency-target';
import { formatTargetKind, parseDependencyTarget } from './parse-dependency-target';

// MARK: - Dependency rule validation

export function validateDeclaredDependency(owner: DependencyOwner, dependency: string, knownTargets: ReadonlySet<string>): void {
  const target = parseDependencyTarget(dependency);

  if (!target) {
    throw new Error(`${formatOwner(owner)} declares invalid dependency target "${dependency}".`);
  }

  if (!knownTargets.has(dependency)) {
    throw new Error(`${formatOwner(owner)} declares unknown dependency "${dependency}".`);
  }

  if (owner.kind === target.kind && owner.name === target.name) {
    throw new Error(`${formatOwner(owner)} cannot depend on itself: ${dependency}`);
  }

  if (!isAllowedDependency(owner, target)) {
    throw new Error(`${formatOwner(owner)} cannot depend on ${formatTargetKind(target)} target "${dependency}".`);
  }
}

export function isAllowedDependency(owner: DependencyOwner, target: ParsedDependencyTarget): boolean {
  switch (owner.surface) {
    case 'api':
      if (owner.kind === 'module') {
        return target.surface === 'api' && (target.kind === 'module' || target.kind === 'library');
      }

      if (owner.kind === 'library') {
        return target.surface === 'api' && target.kind === 'library';
      }

      return false;
    case 'impl':
      if (owner.kind === 'module') {
        return target.surface === 'api' && (target.kind === 'module' || target.kind === 'library');
      }

      if (owner.kind === 'library') {
        return target.surface === 'api' && target.kind === 'library';
      }

      return false;
    case 'app':
      return target.kind === 'module' || target.kind === 'library';
  }
}

export function formatOwner(owner: DependencyOwner): string {
  if (owner.kind === 'app') {
    return `App "${owner.name}"`;
  }

  return `${capitalize(owner.kind)} "${owner.name}" ${owner.surface}`;
}

// MARK: - Rule matching

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
