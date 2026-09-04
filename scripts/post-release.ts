import { execFile as execFileCallback, spawn } from 'node:child_process';
import { appendFile, readFile } from 'node:fs/promises';
import process from 'node:process';
import { promisify } from 'node:util';

import { ConventionalChangelog } from 'conventional-changelog';

const execFile = promisify(execFileCallback);
const root = process.cwd();

type PackageManifest = {
  name?: unknown;
  version?: unknown;
};

try {
  await postRelease();
} catch (error) {
  const message = getErrorMessage(error);

  console.error(`::error title=Post release failed::${message.replaceAll('\n', ' ')}`);
  console.error(`Post-release failed: ${message}`);
  process.exitCode = 1;
}

async function postRelease(): Promise<void> {
  const manifest = await readManifest();
  const packageName = requireString(manifest.name, 'package.json name');
  const version = requireString(manifest.version, 'package.json version');
  const tag = `v${version}`;

  await assertTagExists(tag);
  await assertReleaseAvailable(tag);

  const previousTag = await findPreviousTag(tag);
  const releaseNotes = await generateReleaseNotes(previousTag, tag);

  console.log(
    previousTag
      ? `Creating GitHub Release ${tag} from ${previousTag}...${tag}`
      : `Creating GitHub Release ${tag} from repository history`,
  );

  await runWithInput(
    'gh',
    ['release', 'create', tag, '--verify-tag', '--title', tag, '--notes-file', '-'],
    releaseNotes,
  );

  await writeSummary(packageName, version, tag);

  console.log(`✓ Created GitHub Release ${tag}`);
}

async function generateReleaseNotes(previousTag: string | undefined, currentTag: string): Promise<string> {
  const generator = new ConventionalChangelog()
    .readPackage()
    .loadPreset('conventionalcommits')
    .tags({ prefix: 'v' })
    .commits({
      ...(previousTag ? { from: previousTag } : {}),
      to: currentTag,
    });

  let releaseNotes = '';

  for await (const chunk of generator.write()) {
    releaseNotes += chunk;
  }

  const notes = releaseNotes.trim();

  return notes || 'No user-facing changes in this release.';
}

async function findPreviousTag(currentTag: string): Promise<string | undefined> {
  const tags = await capture('git', ['tag', '--merged', currentTag, '--list', 'v[0-9]*', '--sort=-v:refname']);

  return tags
    .split('\n')
    .map((tag) => tag.trim())
    .find((tag) => tag && tag !== currentTag);
}

async function assertTagExists(tag: string): Promise<void> {
  if (!(await succeeds('git', ['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`]))) {
    throw new Error(`Release tag does not exist: ${tag}`);
  }
}

async function assertReleaseAvailable(tag: string): Promise<void> {
  if (await succeeds('gh', ['release', 'view', tag, '--json', 'tagName'])) {
    throw new Error(`GitHub Release already exists: ${tag}`);
  }
}

async function readManifest(): Promise<PackageManifest> {
  return JSON.parse(await readFile('package.json', 'utf8')) as PackageManifest;
}

async function writeSummary(packageName: string, version: string, tag: string): Promise<void> {
  if (!process.env.GITHUB_STEP_SUMMARY) {
    return;
  }

  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    ['## Release summary', '', `- ${packageName}@${version}`, `- GitHub tag: ${tag}`, ''].join('\n'),
  );
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

async function runWithInput(command: string, args: string[], input: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: process.env,
      stdio: ['pipe', 'inherit', 'inherit'],
    });

    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(signal ? `${command} terminated by signal ${signal}.` : `${command} exited with code ${code}.`));
    });

    child.stdin.end(`${input}\n`);
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
