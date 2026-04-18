---
name: create-pr
description: >-
  Stage all changes, commit with a descriptive message inferred from the branch
  name and diff, then create a new GitHub PR or update the existing one for the
  current branch. Use when the user says "make a PR", "open a PR", "do a push",
  "push this up", "ship it", or otherwise asks to get the current work into a
  pull request.
---

# Create or Update PR

Automates the "I'm done, get this on GitHub" workflow: stage, commit, push, and
open/update a PR against the default branch. Prettier runs automatically via the
Husky `pre-commit` hook (lint-staged), so you do not need to run it manually.

## Prerequisites

- `gh` CLI installed and authenticated (`gh auth status`).
- Current branch is **not** the default branch (`master` / `main`). If it is,
  stop and ask the user for a new branch name before doing anything.
- `origin` remote points at the correct GitHub repo.

## Workflow

Copy this checklist and track progress as you go:

```
- [ ] 1. Verify working tree has changes and branch is not default
- [ ] 2. Gather context (branch name, diff, recent commits)
- [ ] 3. Stage all changes
- [ ] 4. Commit with descriptive title (let Husky run prettier)
- [ ] 5. Push branch to origin
- [ ] 6. Create new PR or update existing one
- [ ] 7. Return the PR URL to the user
```

### Step 1 — Verify state

Run in parallel:

- `git status --porcelain` — must be non-empty, otherwise tell the user there's
  nothing to commit and ask whether they still want a PR created from existing
  commits.
- `git branch --show-current` — must not be `master` or `main`. If it is, stop
  and ask the user for a feature branch name.

### Step 2 — Gather context

Run in parallel:

- `git branch --show-current` (already have it)
- `git diff --stat` and `git diff --cached --stat`
- `git log origin/HEAD..HEAD --oneline` (recent commits on this branch, if any)
- `git log -1 --format=%s` from the default branch for style reference

Use the branch name as the primary hint for intent. Common conventions:

| Branch prefix       | Likely commit type |
| ------------------- | ------------------ |
| `feat/`, `feature/` | `feat:`            |
| `fix/`, `bug/`      | `fix:`             |
| `chore/`            | `chore:`           |
| `docs/`             | `docs:`            |
| `refactor/`         | `refactor:`        |
| `test/`, `tests/`   | `test:`            |
| `ci/`, `build/`     | `ci:` / `build:`   |

If the branch name has no prefix, infer the type from the diff.

### Step 3 — Stage

```
git add -A
```

### Step 4 — Commit

Craft a single-line descriptive title (≤ 72 chars, imperative mood). Prefer
Conventional Commits style when the branch or diff makes the type obvious.

**Always pass the message via HEREDOC** so formatting is preserved:

```bash
git commit -m "$(cat <<'EOF'
<type>(<optional scope>): <imperative summary>
EOF
)"
```

If Husky's `pre-commit` hook modifies files (prettier reformat), the commit will
succeed with the reformatted content already included — no extra step needed.
If the commit **fails** due to the hook, fix the issue and create a **new**
commit. Never `--amend` unless the user explicitly asks.

### Step 5 — Push

```bash
git push -u origin HEAD
```

### Step 6 — Create or update the PR

First check whether a PR already exists for this branch:

```bash
gh pr view --json number,url,state
```

**If `gh pr view` errors with "no pull requests found"** → create one:

```bash
gh pr create --fill-first --body "$(cat <<'EOF'
## Purpose

<1–2 sentence outcome-focused summary>

## Implementation Notes

- <key decision / file / trade-off>
- <anything reviewers should look at first>
EOF
)"
```

The repo has a PR template at `.github/pull_request_template.md` with
`Purpose` and `Implementation Notes` sections — your body **must** use those
two headings so the template is effectively filled in.

**If a PR already exists** → update its body (the push already updated the
commits). Preserve any existing non-template content when reasonable:

```bash
gh pr edit --body "$(cat <<'EOF'
## Purpose

<updated summary reflecting all commits on the branch>

## Implementation Notes

- <updated bullets>
EOF
)"
```

Only update the title with `gh pr edit --title` if the scope of the branch has
clearly changed since the PR was opened.

### Step 7 — Report

Print the PR URL (`gh pr view --json url -q .url`) back to the user as the
final message.

## Trigger Phrases

Apply this skill when the user says any of:

- "make a PR" / "open a PR" / "create a PR"
- "do a push" / "push this up" / "push it up"
- "ship it" / "ship this"
- "update the PR" / "refresh the PR"

## Safety Rules

- **Never** force-push (`--force` / `--force-with-lease`) unless the user
  explicitly asks.
- **Never** skip hooks (`--no-verify`).
- **Never** commit files that look like secrets (`.env`, `*credentials*`,
  `*.pem`, `*.key`). Warn the user and stop if any are staged.
- **Never** run `git commit --amend` unless the user explicitly asks.
- If `gh` is not installed or not authenticated, stop and tell the user how to
  fix it (`winget install --id GitHub.cli` on Windows, then `gh auth login`).

## Example

User: "make a PR"

Branch: `feat/ingredient-search`
Diff: adds `searchIngredients` repo method + route + tests.

Commit title: `feat(ingredients): add searchIngredients repo method and route`

PR body:

```markdown
## Purpose

Add a search endpoint so the client can filter ingredients by name prefix.

## Implementation Notes

- New `searchIngredients(prefix)` method on `IngredientRepository` using an
  indexed `ILIKE` query.
- Wired into `GET /ingredients?search=` with validation.
- Unit tests cover empty prefix, no matches, and pagination.
```
