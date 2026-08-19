# Contributing to ArchiCat

ArchiCat is a standalone TypeScript architecture framework in the BuildPlease organization. Contributions should stay small, explicit, and consistent with the existing architecture.

## Setup

1. Fork [`BuildPlease/ArchiCat`](https://github.com/BuildPlease/ArchiCat) and clone it locally.
2. Use Node.js 24 or newer.
3. Enable Corepack:

   ```bash
   corepack enable
   ```

4. Install dependencies:

   ```bash
   pnpm install
   ```

5. Create a branch for your change.

## Structure

- `src/` — public framework API and configuration contracts.
- `src-cli/` — ArchiCat CLI entry points and commands.
- `src-internal/` — internal implementation that is not part of the public API.
- `test/` — framework tests and fixtures.
- `bin/` — executable package entry point.

Keep public contracts in `src/`. Internal implementation belongs in `src-internal/` unless it is intentionally part of the supported public API.

## Principles

Follow KISS, SOLID, DRY, and YAGNI. Prefer small, explicit changes with visible state, side effects, and failure paths. Add abstractions for real boundaries, stable contracts, or proven reuse.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/).

```text
feat: add architecture rule
fix: reject invalid dependency target
refactor: simplify graph resolution
docs: improve configuration guide
chore: update tooling
```

Use `!` or a `BREAKING CHANGE:` footer for breaking changes. Pull request titles should follow the same convention.

## Validation

Run the checks relevant to your change before opening a pull request:

```bash
pnpm build
pnpm typecheck
pnpm test
```

Do not hand-edit generated build output.

## Pull Requests

Keep pull requests focused and explain:

- what changed,
- why it changed,
- any public behavior or contract that changed,
- how the change was validated.
