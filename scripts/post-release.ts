import { execFile as execFileCallback, spawn } from 'node:child_process';
import { appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const root = process.cwd();

const commitParser = 'conventional-commits-parser@7.1.2';
const commitSeparator = '\x1e';
const headerPattern = String.raw`^(\w*)(?:\(([\w$@.\-*/ ]*)\))?!?: (.*)$`;

const sections = {
  breaking: 'Breaking Changes',
  feat: 'Features',
  fix: 'Fixes',
  perf: 'Performance',
  refactor: 'Refactoring',
} as const;

type PackageManifest = {
  name?: unknown;
  version?: unknown;
};

type ParsedCommit = {
  type?: string | null;
  scope?: string | null;
  subject?: string | null;
  header?: string | null;
  notes?: Array<{ text?: string | null }>;
};

try {
  const manifest = await readJson<PackageManifest>(path.resolve(root, 'package.json'));
  const packageName = requireString(manifest.name, 'package.json name');
  const version = requireString(manifest.version, 'package.json version');
  const tag = `v${version}`;

  if (!(await exists('git', ['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`]))) {
    throw new Error(`Release tag does not exist: ${tag}`);
  }

  if (await exists('gh', ['release', 'view', tag, '--json', 'tagName'])) {
    throw new Error(`GitHub Release already exists: ${tag}`);
  }

  const previousTag = await findPreviousTag(tag);
  const notes = await generateReleaseNotes(previousTag, tag);

  await runCommand('gh', ['release', 'create', tag, '--verify-tag', '--title', tag, '--notes', notes]);
  await writeSummary(packageName, version, tag);
} catch (error) {
  const message = getErrorMessage(error);

  console.error(`::error title=Post release failed::${message.replaceAll('\n', ' ')}`);
  console.error(`Post-release failed: ${message}`);

  process.exitCode = 1;
}

async function findPreviousTag(currentTag: string): Promise<string | undefined> {
  const tags = await runCapture('git', ['tag', '--merged', 'HEAD', '--list', 'v[0-9]*', '--sort=-v:refname']);

  return tags
    .split('\n')
    .map((value) => value.trim())
    .find((value) => value && value !== currentTag);
}

async function generateReleaseNotes(previousTag: string | undefined, currentTag: string): Promise<string> {
  const range = previousTag ? `${previousTag}..${currentTag}` : currentTag;
  const log = await runCapture('git', ['log', '--no-merges', '--format=%H%x1f%B%x1e', range]);

  const commits = log
    .split('\x1e')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      const [hash = '', ...messageParts] = value.split('\x1f');
      return { hash: hash, message: messageParts.join('\x1f').trim() };
    });

  if (commits.length === 0) return 'No Conventional Commit changes were detected for this release.';

  const parsedCommits = await parseCommits(commits.map((commit) => commit.message));
  const entries: Partial<Record<keyof typeof sections, string[]>> = {};

  parsedCommits.forEach((commit, index) => {
    const source = commits[index];
    if (!source) return;

    const type = commit.type?.toLowerCase();
    const breaking = (commit.notes?.length ?? 0) > 0 || /^\w+(?:\([^)]*\))?!:/.test(commit.header ?? '');
    const section = breaking ? 'breaking' : type;
    if (!section || !(section in sections)) return;

    const breakingSubject = commit.notes
      ?.map((note) => note.text?.replace(/\s+/g, ' ').trim())
      .filter((value): value is string => Boolean(value))
      .join(' ');

    const subject = breaking ? breakingSubject || commit.subject : commit.subject;
    if (!subject) return;

    const scope = commit.scope ? `**${commit.scope}**: ` : '';
    const shortHash = source.hash.slice(0, 7);
    const commitReference = process.env.GITHUB_REPOSITORY
      ? `[\`${shortHash}\`](https://github.com/${process.env.GITHUB_REPOSITORY}/commit/${source.hash})`
      : `\`${shortHash}\``;

    const key = section as keyof typeof sections;
    (entries[key] ??= []).push(`- ${scope}${subject} (${commitReference})`);
  });

  const notes: string[] = [];

  for (const [type, title] of Object.entries(sections) as Array<[keyof typeof sections, string]>) {
    const sectionEntries = entries[type];
    if (!sectionEntries?.length) continue;
    notes.push(`## ${title}`, '', ...sectionEntries, '');
  }

  if (notes.length === 0) notes.push('No Conventional Commit changes were detected for this release.', '');

  if (previousTag && process.env.GITHUB_REPOSITORY) {
    notes.push(
      `**Full Changelog:** https://github.com/${process.env.GITHUB_REPOSITORY}/compare/${previousTag}...${currentTag}`,
    );
  }

  return notes.join('\n').trim();
}

async function parseCommits(messages: string[]): Promise<ParsedCommit[]> {
  const output = await runWithInput(
    'pnpm',
    [
      'dlx',
      commitParser,
      '--separator',
      commitSeparator,
      '--header-pattern',
      headerPattern,
      '--header-correspondence',
      'type,scope,subject',
    ],
    messages.join(commitSeparator),
  );

  const parsed: unknown = JSON.parse(output);
  if (!Array.isArray(parsed) || parsed.length !== messages.length) {
    throw new Error('Conventional Commit parser returned an unexpected result.');
  }

  return parsed as ParsedCommit[];
}

async function writeSummary(packageName: string, version: string, tag: string): Promise<void> {
  const line = `✓ ${packageName}@${version} → ${tag}`;
  console.log(`\n${line}\n`);

  if (!process.env.GITHUB_STEP_SUMMARY) return;
  await appendFile(process.env.GITHUB_STEP_SUMMARY, ['## Release summary', '', `- ${line}`, ''].join('\n'));
}

async function exists(command: string, args: string[]): Promise<boolean> {
  try {
    await execFile(command, args, { cwd: root, encoding: 'utf8' });
    return true;
  } catch {
    return false;
  }
}

async function runCommand(command: string, args: string[]): Promise<void> {
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
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });

  return stdout.trim();
}

async function runWithInput(command: string, args: string[], input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (code === 0) return resolve(stdout.trim());
      const reason = stderr.trim() || (signal ? `terminated by signal ${signal}` : `exited with code ${code}`);
      reject(new Error(`${command} ${args.join(' ')} failed: ${reason}`));
    });

    child.stdin.end(input);
  });
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, 'utf8')) as T;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`Invalid ${label}.`);
  return value;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
