# Contributing

This repository publishes reusable **projen project types** as a jsii library
(`@dsomega-boostrap/projen`). Most configuration is generated, so edit source
and `.projenrc.ts`, never generated files.

## Architecture: `_projects` vs `_lib`

- **`src/_projects/`** — complete, user-facing **project templates**. Each
  directory is one project type that downstream repositories instantiate in
  their `.projenrc.ts`.
- **`src/_lib/`** — **generic, reusable components and helpers**. Code here is
  internal and is not exported from the package entrypoint.
- A `_projects` project template is **constructed from `_lib` components and
  projen library components** (`TextFile`, `TomlFile`, `IniFile`, `SampleDir`,
  `Component`, and other projen primitives). Keep reusable generation logic in
  `_lib`; keep project-specific wiring in `_projects`.
- Every project template file uses the **`_project.ts` postfix** for
  differentiation: `src/_projects/<Name>/<Name>_project.ts`, re-exported by the
  directory's `index.ts` and then by `src/_projects/index.ts`.

```text
src/_projects/<Name>/
  <Name>_project.ts    # full project template (composed from _lib + projen)
  index.ts             # barrel re-export
src/_lib/<Domain>/
  <domain>.utils.ts    # generic reusable helpers/components
  <domain>.types.ts    # internal types
  <domain>.utils.test.ts
```

## Workflow

```bash
yarn install
npx projen            # after changing .projenrc.ts
npx jest --coverage=false
npx projen biome
npx projen compile    # jsii validation after public API changes
npx projen build      # before opening a PR
```

Do not hand-edit `package.json`, tsconfigs, `biome.jsonc`, `.projen/*`,
`.github/workflows/*`, `.gitignore`, or `docs/API.md`; regenerate them with
`npx projen`. Never edit or commit `lib/`, `dist/`, `coverage/`, or `.jsii`.

## Adding a project template

1. Create `src/_projects/<Name>/<Name>_project.ts` with the project class and
   its `<Name>Options` interface (TSDoc every public member).
2. Compose it from `_lib` components and projen primitives; do not write files
   directly.
3. Add `src/_projects/<Name>/index.ts` re-exporting the project file.
4. Add the re-export to `src/_projects/index.ts`.
5. Add tests under `src/` or `test/`, then run `npx projen compile` and
   `npx projen build`.

## Adding a generic component

Put reusable, project-agnostic logic under `src/_lib/<Domain>/` as
`<domain>.utils.ts` or `<domain>.types.ts`, with a colocated
`<domain>.utils.test.ts`. Do not export it from `src/index.ts` unless it is a
jsii-compatible type required by the public API.

## Commits and pull requests

- Commits: `[Type](Scope): Past-tense subject.` — types `Enh`, `Fix`, `Docs`,
  `Style`, `Refactor`, `Perf`, `Test`, `Build`, `Chore`, `Revert`, `Wip`,
  `Sync`.
- PR titles must start with `feat`, `fix`, or `chore`.
- Include regenerated `docs/API.md` when the public API changes.
