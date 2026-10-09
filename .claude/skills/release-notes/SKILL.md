---
name: release-notes
disable-model-invocation: true
description: Use when the user asks to enhance, refine, polish, or "look at" the release notes for a tag — typically a fresh CI-generated pre-release (e.g. `X.Y.Z-rc.N`) or a stable cut. Reads the auto-generated notes off the GitHub release, classifies and rewrites each bullet in this project's editorial voice, builds the `Deployment Changes` section from the README configuration tables, `AppSettings`, the Dockerfile and the OpenSpec specs, and saves a draft to `.claude/release-notes/`. Never edits GitHub directly.
allowed-tools: Read Grep Glob Bash(gh release view:*) Bash(gh release list:*) Bash(gh pr view:*) Bash(gh pr list:*) Bash(gh pr diff:*) Bash(git log:*) Bash(git show:*) Bash(git diff:*) Bash(git tag:*) Bash(git rev-parse:*) Bash(date:*) Write(.claude/release-notes/*) Bash(mkdir -p .claude/release-notes)
argument-hint: '[tag]'
arguments: tag
context: fork
agent: general-purpose
---

# Quick Apps Frontend release-notes enhancer

CI publishes a GitHub release for every tag on `epam/ai-dial-quickapps-frontend` (`development` → `X.Y.Z-rc.N`, `release-X.Y` → `X.Y.Z`). The body is generated from PR titles, so it carries dirt: conventional-commit prefixes instead of prose, the same change listed under both `BREAKING CHANGES` and `Features`, several PRs for one change, housekeeping commits with no PR (`clear code`, `update deps`), and an `## Other` section that mixes real maintainer-relevant items with tooling churn. This skill does the editorial pass on one tag, as a local draft.

You are running in a forked, isolated context. Read and research freely — only the final summary reaches the main conversation. All writes happen in this fork; the draft lands at `.claude/release-notes/<tag>-draft.md`.

## When to use

- "Enhance the release notes for `<tag>`"
- "Look at the latest pre-release notes and refine them"
- "The CI just published `<tag>`, make it readable"

Do **not** trigger on "what changed in <version>?" — that is a recall question, not a notes-editing task.

## Inputs

`tag` = `$tag` — the GitHub release tag to enhance (e.g. `X.Y.Z-rc.N`, `X.Y.Z`). If empty, pick the most recent tag from `gh release list --limit 5` and confirm with the user before editing.

## Workflow

### 1. Resolve target and reference styles

1. `gh release view <tag> --json body,name,tagName,isPrerelease` — capture the raw CI notes.
2. `gh release list --limit 10` — locate the previous tag of the same kind (last stable for a stable release, the predecessor `rc` for a delta `rc.N+1`).
3. `gh release view <prev-stable-tag> --json body` and `gh release view <prev-rc-tag> --json body` (when relevant) — these are the style anchors. Match their terseness: one line per bullet.
4. `git log <prev-tag>..<tag> --oneline` — full commit list, to spot commits with no PR (hotfixes, `chore:` updates) that CI listed as bare lines.

### 2. Pull source context for each bullet

For every bullet in the raw notes:

1. Parse out the trailing `#<issue> (#<PR>)` or `(#<PR>)`. If only a PR number is present, that's the canonical reference; if both, keep `#<issue> (#<PR>)` order.
2. `gh pr view <PR> --json title,body,labels,files` — read the body, not just the title; the _why_ lives there.
3. For bullets with no PR number, find the commit via `git log <prev-tag>..<tag> --oneline` and `git show <hash>`. Fold it into a related entry or drop it.
4. For behavior changes, read the matching spec under `openspec/specs/<capability>/` (and any archived change under `openspec/changes/archive/`) to get the headline framing and the exact observable behavior. `openspec/specs/` is the normative source; PR titles are not.

### 3. Cross-check deployment-relevant sources

This app is a static Vite SPA served by `chat-api`; it has no server code or build-time env vars of its own. Runtime config is chat-api's, documented for this deployment in the README. Build the `Deployment Changes` section from these, not from PR titles:

- `git diff <prev-tag>..<tag> -- README.md` — the `## Configuration` tables (Server, DIAL core, Auth, Themes, Iframe embedding, CSP, Default model, QuickApps-specific settings, OpenTelemetry) are the curated operator reference.
- `git diff <prev-tag>..<tag> -- .env.template Dockerfile` — new, renamed or removed variables and runtime-image changes. A change of the chat-api base image or a `ai-dial-chat` dependency bump in the Dockerfile can change operator-visible behavior; read what it pulls in.
- `git diff <prev-tag>..<tag> -- src/types/dial-entities.ts` — the `AppSettings` interface. Its keys map 1:1 onto the `CUSTOM_CLIENT_VARIABLES` JSON keys (`allowedOrigin`, `dialAdminHost`, `dialChatHost`, …). Added or removed keys are deployment changes.
- `git diff <prev-tag>..<tag> -- openspec/specs/host-integration openspec/specs/auth openspec/specs/deployment_docker-image` — the externally observable host contract (entry-URL query parameters, `postMessage` messages, sign-in flow) and the image contract.
- `[Unreleased]` / the matching version in `CHANGELOG.md` — the maintainers' own breaking-change and migration notes. Reuse their wording for migration steps rather than inventing new ones, but verify the names against the code and README. Note when the CHANGELOG version heading does not match the tag being released (report it, do not fix it).

Names and defaults: the README table and `.env.template` win over PR bodies; where README and code disagree (e.g. `src/utils/dial-client.ts` reads a different key), the code wins and the mismatch goes to the editorial notes. There is no feature-flag registry in this repo — optional UI features are gated through `CUSTOM_CLIENT_VARIABLES` keys or chat-api env vars; document them as environment variables or settings keys, not as "feature flags".

### 4. Classify each bullet (move things between sections, drop the noise)

CI keys the section off the conventional-commit prefix in the PR title, which is unreliable. Reclassify by actual user impact:

| Where CI put it                                                           | Where it belongs                                                       | Rule                                                                                       |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `Features` and `BREAKING CHANGES` (same PR, feat with `!`)                | `BREAKING CHANGES` only, with the migration step                       | Don't list one change twice.                                                               |
| `Other` starting with a `feat`/`fix`-style user-visible change            | `Features` / `Fixes`                                                   | A change that lost its slot because the title had no conventional prefix.                  |
| `Features` / `Fixes` for a regression introduced and fixed in the same range | drop, or fold into the feature entry                                | Don't surface a transient bug.                                                             |
| `Other` for a CVE/security bump                                           | `Fixes`                                                                | Security items are user-relevant.                                                          |
| Several PRs / orphan commits on one change                                | one folded entry under the right section                               | Cite all PR numbers: `(#101, #102)`.                                                       |
| `Docs` entries                                                            | drop, unless README configuration or an OpenSpec contract changed      | Operators care about contract and config, not documentation churn.                         |

**Drop entirely** — no consumer-visible effect:

- Pure refactors, formatting, lint, tsconfig, `vite.config`, `vitest` / test-only changes, test coverage tooling.
- i18n housekeeping (namespace renames, dropping unused keys) — but new or changed user-visible strings and new locales stay.
- OpenSpec scaffolding and spec archiving (`chore: archive specs`), `docs/` planning files, `.claude/` skills and rules, CODEOWNERS, issue/PR templates, repo-ignore tweaks.
- Lockfile-only commits, `update deps`, `update lock file`, routine dependency bumps with no CVE and no visible behavior delta.
- `Merge branch …` commits, `clear code`, `[skip ci]` housekeeping, `Tmp` / placeholder entries.
- CI workflow changes — unless a maintainer must act (keep one line under `CI`, e.g. an `epam/ai-dial-ci` bump).

**Keep in `Other`** — items operators or embedders care about even if they aren't features:

- `@epam/ai-dial-ui-kit`, `@epam/ai-dial-*` package or `chat-api` base-image bumps that change visible styling or behavior.
- Changes to the `postMessage` / entry-URL contract that aren't breaking.
- Container image, port, health-check or runtime changes.

Test: _would an operator deploying this image, or an engineer embedding the editor in `ai-dial-chat`, care?_ If no, drop it.

### 5. Rewrite each kept bullet

The raw form is `* <conventional-prefix(scope)>: <PR title> (Issue #<N>) (#<PR>)`. Rewrite to:

```
* <Active-voice description of what changed> — <brief why-it-matters or what-it-replaces> (Issue #<N>) (#<PR>)
```

Rules, in order of importance:

1. **One line per bullet.** Match the terseness of the previous published release. Longer detail goes to the editorial-notes file (§8).
2. **Drop the conventional prefix** (`feat(scope):`, `fix(scope):`) and replace it with prose naming the surface (add-on details popup, Advanced Settings, Skills row, Tools tab).
3. **Drop branch-style phrasing.** `(add-ons) hide the trash button after…` → `Hide the add-on trash button once …`.
4. **Use an em-dash `—` for the "why" clause**, only when the why isn't obvious from the first half.
5. **Backticks for code identifiers**: env vars (`DEFAULT_DEPLOYMENT`, `CORS_ORIGIN`), `CUSTOM_CLIENT_VARIABLES` keys (`allowedOrigin`), query parameters (`applicationName`), `postMessage` event names, file paths, package names.
6. **Keep references at the end**: `(Issue #<N>) (#<PR>)`, or `(#<PR>)` when there is no issue. They auto-link on the release page. Several issues in one PR: `(Issue #11, #12) (#101)`.
7. **Flag regressions** restoring previously-working behavior with `(regression fix)`.
8. **Quote CVE IDs verbatim** for security upgrades.
9. **No `[Preview]`, `[Overlay]` or `[Theme]` prefixes** — this repo has none of those surfaces. Use `[Host]` only for changes to the contract with the embedding host (entry-URL parameters, `postMessage` messages, handshake).

#### Example transformations

Illustrative only — the names and numbers below are placeholders, not real changes.

```
# Dropping the scope, naming the surface:
- * feat(add-ons): show header in add-on details (#101)
+ * Show the catalog header in the add-on details popup (#101)

# Folding several PRs on one change:
- * feat(settings): move option A into Advanced Settings (Issue #11) (#102)
- * feat(settings): move option B into Advanced Settings (#103)
+ * Move options A and B into Advanced Settings (Issue #11) (#102, #103)

# Breaking change that CI lists in two sections — keep it once, with the migration step:
- * feat(host-integration)!: read <param> from the entry URL (#104)   [in both sections]
+ * [Host] Read `<param>` from the entry-URL query parameter instead of `CUSTOM_CLIENT_VARIABLES` — upgrade the host first (#104)

# Security bump -> Fixes, phrased as user impact (only if the PR cites a CVE; otherwise drop):
- * Bump <package> from 1.0.0 to 1.0.1 (#105)
+ * Upgrade `<package>` to `1.0.1` to address <CVE-ID from the advisory> (#105)

# Reverts whose original is in the same range — drop both. Revert of an earlier release — keep as a roll-back:
+ * Roll back <feature> shipped in `X.Y.Z` — restores <previous behavior> (#106)

# Housekeeping, no PR — drop:
- * clear code [skip ci]
- * update lock file
```

### 6. Build the `Deployment Changes` section

Add this section **only** when the range changes at least one env var, `CUSTOM_CLIENT_VARIABLES` key, URL/`postMessage` contract, port, cookie name, image runtime or default behavior. Include only the subsections that have entries:

```markdown
## Deployment Changes

### New environment variables

<table: Variable | Required | Default | Description>

### Renamed / deprecated environment variables

> [!CAUTION]
> Still works, but will be removed in future versions.

<table: Old variable | New variable or location | Notes>

### Removed environment variables

<table: Variable | Reason>

### Settings keys (`CUSTOM_CLIENT_VARIABLES`)

<table: Key | Change | Description>

### Host integration changes

> [!IMPORTANT]
> <what the embedding host (`ai-dial-chat` / admin) must change, and the required order of upgrades>

### Behavioral changes

> [!NOTE]
> <one line: what changes at runtime after redeploying this image, with no operator action>

- **<Feature>** — <what changes> (#<PR>)
```

**Telling the subsections apart:**

- **Behavioral changes** — "How does the editor behave differently at runtime once I redeploy?" Changed defaults (e.g. default orchestrator temperature, default model selection), changed error handling, new default-on UI. Operator does nothing.
- **Host integration changes** — "What does the embedding host have to change?" Entry-URL parameters, `postMessage` events, handshake, `allowedOrigin` / CSP expectations. If a change needs a coordinated upgrade (e.g. `ai-dial-chat` first), say which side goes first.
- **Settings keys / env-var tables** — "What do I edit in my deployment config?" Rename mappings, new required values, new cookie names, OAuth redirect URI path changes.

What does **not** belong here: per-user editor behavior and UI changes. Those stay in the `Features` bullet where they are introduced.

Descriptions and defaults come from the README table row when it exists, else from `.env.template`, else from the code. Cite defaults verbatim. If the change is breaking, also point at the matching `CHANGELOG.md` section rather than restating a long migration.

### 7. Pre-release / delta handling

- For `-rc.N` with `N ≥ 1`, the release covers only what changed since the previous rc — do **not** re-summarize predecessors. Each tag has its own GitHub release page.
- Drop sections with no entries in the delta. Do **not** add a "since the previous rc" header or preamble.

### 8. Save the draft (and optional editorial companion)

Create `.claude/release-notes/` if missing, then write:

- **`.claude/release-notes/<tag>-draft.md`** — final notes, ready to paste into the GitHub release body. No preamble or commentary.
- **`.claude/release-notes/<tag>-editorial-notes.md`** _(optional)_ — only when there are calls worth surfacing:
  - The commit/tag range used and why.
  - Rename mapping (raw → enhanced) for non-trivial rewrites.
  - Dropped items, one line of reason each.
  - Open questions (e.g. the `CHANGELOG.md` heading version doesn't match the tag; an env-var name that differs between README and code).

### 9. Never touch GitHub

This skill **never** runs `gh release edit`, `gh release create` or any other write against the repo. Draft files are the only output. Applying a draft is a separate, explicit request from the user.

## Output format

`.claude/release-notes/<tag>-draft.md` follows this shape; omit empty sections:

```markdown
## BREAKING CHANGES

- <change — migration step>

## Features

- <one bullet per change>

## Fixes

- <one bullet per change>

## CI

- <only when a maintainer needs to know>

## Other

- <only operator-, embedder- or maintainer-relevant items>

## Deployment Changes

### …
```

Section order: `BREAKING CHANGES` → `Features` → `Fixes` → `CI` → `Other` → `Deployment Changes`. Subsection order inside `Deployment Changes`: New env vars → Renamed/deprecated → Removed → Settings keys → Host integration → Behavioral changes.

## Return to the main conversation

Return a summary of five lines or fewer:

- The draft path.
- Bullet counts per section after enhancement.
- Reclassifications and drops (count, with one example).
- Whether `Deployment Changes` was added and which subsections.
- Open questions for the user.

## Safety rails

- **Never edit GitHub.** Drafts only.
- **Never change old release notes.** Previously published releases (including the predecessor rc and stable tags used as style anchors) are read-only references. Only the single target tag gets a local draft.
- **Never invent items.** Every kept bullet maps to a PR or a commit hash in the range.
- **Never silently drop or rename a PR reference.**
- **Verify names from source**: README tables, `.env.template`, `AppSettings`, and the OpenSpec specs, not from PR bodies.
- **Don't consolidate pre-release notes** into the stable notes unless asked.
- **Match the terseness of the predecessor's notes.**

## Maintenance

If the raw CI notes show a pattern this skill doesn't handle (a new section CI emits, a scope that misroutes items, a rewrite the user keeps asking for), surface it in the return summary and offer to update this `SKILL.md`; don't edit it without confirmation.
