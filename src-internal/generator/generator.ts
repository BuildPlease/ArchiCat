import fs from 'node:fs';
import path from 'node:path';

import { ArchicatDefaults } from '@src-internal/configuration';
import type { ResolvedArchicatProject } from '@src-internal/model';

import { resetDirectory } from './file-writer';
import { generateGraphTypes } from './generate-graph-types';
import { generateMirrors } from './generate-mirrors';
import { generateReport } from './generate-report';
import { generateTsconfig } from './generate-tsconfig';

// MARK: - Artifact generation

export function generateArtifacts(project: ResolvedArchicatProject): void {
  resetDirectory(project.rootDir, project.outDir);
  fs.mkdirSync(path.join(project.outDir, ArchicatDefaults.generated.modulesDirName), { recursive: true });
  fs.mkdirSync(path.join(project.outDir, ArchicatDefaults.generated.librariesDirName), { recursive: true });
  fs.mkdirSync(path.join(project.outDir, ArchicatDefaults.generated.typesDirName), { recursive: true });
  fs.mkdirSync(project.reportsDir, { recursive: true });
  generateMirrors(project.definitions);
  generateGraphTypes(project);
  generateTsconfig(project);
  generateReport(project);
}
