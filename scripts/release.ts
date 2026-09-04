import { execFile as execFileCallback, spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const root = process.cwd();
const releaseTypes = ['patch', 'minor', 'major'] as const;

type ReleaseType = (typeof releaseTypes)[number];

type PackageManifest = {
  name?: unknown;
  version?: unknown;
};

try {
  await release();
} catch (error) {
  const message = getErrorMessage(error);

  console.error(`::error title=Release failed::${message.replaceAll('\n', ' ')}`);
  console.error(`Release failed: ${message}`);
  process.exitCode = 1;
}

async function release(): Promise<void> {
  const releaseType = process.argv[2];

  if (!isReleaseType(releaseType)) {
    throw new Error('Release type must be one of: patch, minor, major.');
  }

  await assertCleanWorkingTree();

  const startingCommit = await capture('git', ['rev-parse', 'HEAD']);
  const branch = process.env.GITHUB_REF_NAME || (await capture('git', ['branch', '--show-current']));

  if (!branch) {
    throw new Error('Unable to determine the release branch.');
  }

  const currentManifest = await readManifest();
  let published = false;

  try {
    await run('pnpm', ['version', releaseType, '--no-git-tag-version']);

    const nextManifest = await readManifest();
    const packageName = requireString(nextManifest.name, 'package.json name');
    const currentVersion = requireString(currentManifest.version, 'package.json version');
    const nextVersion = requireString(nextManifest.version, 'package.json version');
    const tag = `v${nextVersion}`;

    if (currentVersion === nextVersion) {
      throw new Error(`Version did not change from ${currentVersion}.`);
    }

    await assertVersionAvailable(packageName, nextVersion);
    await assertTagAvailable(tag);

    console.log(`Releasing ${packageName} ${currentVersion} -> ${nextVersion} (${releaseType})`);

    await run('git', ['add', 'package.json', 'pnpm-lock.yaml']);
    await run('git', ['commit', '-m', `chore: bump version to ${nextVersion}`]);

    console.log(`✓ Prepared ${packageName}@${nextVersion}`);

    await run('pnpm', ['publish', '--no-git-checks', '--provenance']);
    published = true;

    console.log(`✓ Published ${packageName}@${nextVersion}`);

    await run('git', ['tag', tag]);
    await run('git', ['push', '--atomic', 'origin', `HEAD:refs/heads/${branch}`, `refs/tags/${tag}`]);

    console.log(`✓ Pushed chore: bump version to ${nextVersion}`);
    console.log(`✓ Pushed ${tag}`);
  } catch (error) {
    if (!published) {
      await restore(startingCommit);
    }

    throw error;
  }
}

async function readManifest(): Promise<PackageManifest> {
  return JSON.parse(await readFile('package.json', 'utf8')) as PackageManifest;
}

async function assertCleanWorkingTree(): Promise<void> {
  const status = await capture('git', ['status', '--porcelain']);

  if (status) {
    throw new Error('Working tree must be clean before releasing.');
  }
}

async function assertVersionAvailable(packageName: string, version: string): Promise<void> {
  const registryUrl = `https://registry.npmjs.org/${encodeURIComponent(packageName)}/${encodeURIComponent(version)}`;
  const response = await fetch(registryUrl, {
    headers: {
      accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (response.status === 404) {
    console.log(`✓ ${packageName}@${version} is available on npm.`);
    return;
  }

  if (response.ok) {
    throw new Error(`${packageName}@${version} already exists on npm.`);
  }

  throw new Error(`Unable to verify ${packageName}@${version} on npm: HTTP ${response.status}.`);
}

async function assertTagAvailable(tag: string): Promise<void> {
  if (await succeeds('git', ['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`])) {
    throw new Error(`Git tag already exists locally: ${tag}`);
  }

  const remoteTag = await capture('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`]);

  if (remoteTag) {
    throw new Error(`Git tag already exists on origin: ${tag}`);
  }
}

async function restore(commit: string): Promise<void> {
  try {
    await run('git', ['reset', '--hard', commit]);
    console.log('✓ Restored repository after failed release.');
  } catch (error) {
    console.error(`Failed to restore repository: ${getErrorMessage(error)}`);
  }
}

function isReleaseType(value: string | undefined): value is ReleaseType {
  return releaseTypes.some((releaseType) => releaseType === value);
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid ${label}.`);
  }

  return value;
}

async function succeeds(command: string, args: string[]): Promise<boolean> {
  try {
    await execFile(command, args, {
      cwd: root,
      env: process.env,
    });

    return true;
  } catch {
    return false;
  }
}

async function capture(command: string, args: string[]): Promise<string> {
  const { stdout } = await execFile(command, args, {
    cwd: root,
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });

  return stdout.trim();
}

async function run(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: process.env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(signal ? `${command} terminated by signal ${signal}.` : `${command} exited with code ${code}.`));
    });
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
