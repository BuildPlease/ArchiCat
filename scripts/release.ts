import { execFile as execFileCallback, spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const root = process.cwd();
const releaseType = process.argv[2];
const releaseTypes = new Set(['patch', 'minor', 'major']);

type ReleaseType = 'patch' | 'minor' | 'major';

type PackageManifest = {
  name?: unknown;
  version?: unknown;
};

try {
  if (!releaseType || !releaseTypes.has(releaseType)) {
    throw new Error('Release type must be one of: patch, minor, major.');
  }

  await assertCleanWorkingTree();

  const manifest = await readManifest();
  const packageName = requireString(manifest.name, 'package.json name');
  const currentVersion = requireString(manifest.version, 'package.json version');
  const nextVersion = bumpVersion(currentVersion, releaseType as ReleaseType);
  const tag = `v${nextVersion}`;

  await assertVersionAvailable(packageName, nextVersion);
  await assertTagAvailable(tag);

  console.log(`Releasing ${packageName} ${currentVersion} -> ${nextVersion} (${releaseType})`);

  await run('pnpm', ['version', releaseType, '--message', 'chore: release v%s']);

  const bumpedManifest = await readManifest();
  if (bumpedManifest.version !== nextVersion) {
    throw new Error(`pnpm version produced ${String(bumpedManifest.version)}; expected ${nextVersion}.`);
  }

  const branch = process.env.GITHUB_REF_NAME || (await runCapture('git', ['branch', '--show-current']));
  if (!branch) throw new Error('Unable to determine the current Git branch.');

  await run('git', ['push', '--atomic', 'origin', `HEAD:refs/heads/${branch}`, `refs/tags/${tag}`]);
  console.log(`✓ Pushed chore: release ${tag}`);
  console.log(`✓ Pushed ${tag}`);

  await run('pnpm', ['publish', '--no-git-checks', '--provenance']);
  console.log(`✓ Published ${packageName}@${nextVersion}`);
} catch (error) {
  const message = getErrorMessage(error);

  console.error(`::error title=Release failed::${message.replaceAll('\n', ' ')}`);
  console.error(`Release failed: ${message}`);

  process.exitCode = 1;
}

async function readManifest(): Promise<PackageManifest> {
  return JSON.parse(await readFile(path.resolve(root, 'package.json'), 'utf8')) as PackageManifest;
}

async function assertCleanWorkingTree(): Promise<void> {
  const status = await runCapture('git', ['status', '--porcelain']);
  if (status) throw new Error('Working tree must be clean before releasing.');
}

async function assertVersionAvailable(packageName: string, version: string): Promise<void> {
  const registryUrl = `https://registry.npmjs.org/${encodeURIComponent(packageName)}/${encodeURIComponent(version)}`;
  const response = await fetch(registryUrl, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });

  if (response.status === 404) {
    console.log(`✓ ${packageName}@${version} is available on npm.`);
    return;
  }

  if (response.ok) throw new Error(`${packageName}@${version} already exists on npm.`);

  throw new Error(`Unable to verify ${packageName}@${version} on npm: HTTP ${response.status}.`);
}

async function assertTagAvailable(tag: string): Promise<void> {
  if (await exists('git', ['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`])) {
    throw new Error(`Git tag already exists locally: ${tag}`);
  }

  const remoteTag = await runCapture('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`]);
  if (remoteTag) throw new Error(`Git tag already exists on origin: ${tag}`);
}

function bumpVersion(version: string, type: ReleaseType): string {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`Only stable SemVer versions are supported. Current version: ${version}`);

  let major = Number(match[1]);
  let minor = Number(match[2]);
  let patch = Number(match[3]);

  if (type === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (type === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }

  return `${major}.${minor}.${patch}`;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`Invalid ${label}.`);
  return value;
}

async function exists(command: string, args: string[]): Promise<boolean> {
  try {
    await execFile(command, args, { cwd: root, env: process.env, encoding: 'utf8' });
    return true;
  } catch {
    return false;
  }
}

async function run(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env: process.env, stdio: 'inherit' });

    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (code === 0) return resolve();
      reject(new Error(signal ? `${command} terminated by signal ${signal}.` : `${command} exited with code ${code}.`));
    });
  });
}

async function runCapture(command: string, args: string[]): Promise<string> {
  const { stdout } = await execFile(command, args, {
    cwd: root,
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });

  return stdout.trim();
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
