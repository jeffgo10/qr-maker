# Create GitHub PR from branch commits

Analyze commits and diffs on the current branch, draft a comprehensive PR title and description, push if needed, and open a pull request with `gh`. **Cleanup mode** syncs the default branch after a merged PR (fetch, checkout, pull, delete merged feature branch).

**Branch strategy:** `master` is the default integration/base branch for this repo. Feature PRs merge here.

## Mode — read trailing user text

| Trailing text | Mode |
|---|---|
| Empty | **Create** — analyze, push if needed, open PR **into `master`** |
| `cleanup` or `post-merge` | **Cleanup** — sync **`master`**, switch to it, delete merged feature branch |
| `draft only`, `preview`, or `dry run` | **Draft only** — show proposed title/body; do not push or create PR |
| `draft pr` or `as draft` | **Create draft PR** — same as Create but `gh pr create --draft` |
| Contains `base:` or `into:` (e.g. `base: main`) | Override base branch |
| Contains `title:` | Use as title hint or override (still polish for clarity) |
| Describes scope (e.g. "qr tests only") | Narrow summary to that scope; still list all commits in appendix if present |

**Default base branch:** `master` (fall back to `main` if that is the repo default).

If trailing text is **cleanup** (or **post-merge**), skip Create/Draft steps — run **Cleanup mode** only.

### Uncommitted changes (Create modes) — commit + PR immediately

When creating a PR and the working tree has product changes:

1. **Do not ask** whether to commit only, commit + PR, or cancel.
2. Create a feature branch if currently on `master` / `main` (descriptive `feat/` / `fix/` / `chore/` name from the diff).
3. Stage relevant files (exclude `.env*`, secrets, credentials, coverage artifacts).
4. Commit with a concise message matching repo style (HEREDOC; follow user committing-changes rules).
5. Continue the normal Create flow: push + open PR.

**Draft only** still does not commit or push — show the proposed title/body and note that uncommitted work would be committed on create.

If there are **no** commits ahead of base and no relevant uncommitted changes, stop and say there is nothing to PR.

### Typical invocations

```
/create-github-pr
/create-github-pr draft only
/create-github-pr as draft
/create-github-pr cleanup
/create-github-pr post-merge
/create-github-pr cleanup: keep branch
/create-github-pr title: Add browser-side QR generation tests
/create-github-pr preview: finder overlays only
/create-github-pr base: main
```

---

## Cleanup mode (after PR merged)

Use when a feature-branch PR is merged on GitHub and the local repo should match the base branch.

**Default:** delete merged local + remote feature branch. Use **keep branch** or **no delete** to skip branch removal.

### Cleanup — Step C1 — Pre-check

```bash
git status
git branch --show-current
git remote -v
```

Remember **previous branch** name when not already on base (for C3 delete).

Resolve **base branch:** `master` unless trailing text / `base:` overrides (e.g. `main`).

| Situation | Action |
|---|---|
| Uncommitted product changes | **Stop** — ask user to commit, stash, or discard before cleanup |
| Already on base branch | Skip checkout in C2; still fetch + pull; skip branch delete in C3 |
| On a feature branch | Remember branch name for delete in C3 |

### Cleanup — Step C2 — Sync and switch to base

```bash
git fetch origin
git checkout <base>          # skip if already on base
git pull origin <base>
```

Requires `network` / `git_write` permissions. Never force-pull or reset `--hard` unless the user explicitly requests it.

### Cleanup — Step C3 — Remove merged feature branch (default)

**Skip** only when trailing text includes **keep branch** or **no delete**.

Before deleting, confirm the branch was merged into base:

```bash
git branch --merged <base>
# or with gh:
gh pr list --state merged --head <branch> --json number,title,mergedAt,baseRefName
```

| Target | Command |
|---|---|
| Local branch (merged) | `git branch -d <branch>` |
| Local branch (not fully merged) | Do **not** delete; warn user |
| Remote branch (merged) | `git push origin --delete <branch>` |

If GitHub auto-deleted the remote branch on merge, `git push origin --delete` may 404 — report and continue.

Do not delete `master` / `main`.

### Cleanup — Step C4 — Report

```markdown
## Post-merge cleanup

**Base branch:** `master` (up to date with `origin/master`)
**Previous branch:** `feat/…`
**Switched to:** `master`
**Local branch deleted:** yes / no / skipped (keep branch / unmerged)
**Remote branch deleted:** yes / no / skipped / already gone on GitHub

### Latest on master
`<short git log -3 --oneline>`
```

---

## Step 0 — `gh` pre-check (Create modes only; skip for Draft only and Cleanup)

```bash
command -v gh && gh auth status
```

| Result | Action |
|---|---|
| `gh` not found | After push (Step 4), print web fallback URL + install hint (`brew install gh`); do **not** fail the flow |
| `gh` found, not authed | Same fallback + `gh auth login` hint |
| `gh auth status` OK | Proceed with `gh pr create` in Step 5 |

**Web fallback URL** (derive owner/repo from `git remote -v`):

`https://github.com/<owner>/<repo>/compare/<base>...<branch>`

---

## Step 1 — Gather git context (run in parallel)

From repo root:

```bash
git status
git branch -vv
git remote -v
git log --oneline -15
```

Determine current branch, base (`master`/`main`), upstream tracking, then:

```bash
git fetch origin master 2>/dev/null || git fetch origin main 2>/dev/null || true
git log origin/<base>..HEAD --oneline
git diff origin/<base>...HEAD --stat
git diff origin/<base>...HEAD
```

If `origin/<base>` is unavailable, use local `<base>..HEAD`.

**Analyze ALL commits** on the branch since diverging from base — not only the latest commit.

---

## Step 2 — Draft PR title

- One line, **≤ 72 characters** when possible
- **Imperative mood** — "Add …", "Fix …", "Update …", "Refactor …"
- Lead with the **primary user-facing or architectural outcome**, not file names
- Bad: `updates` / `fix stuff` / `WIP`
- Good: `Add browser-side QR generation with Vitest coverage`

---

## Step 3 — Draft PR description

```markdown
## Summary

<2–4 sentences: what this PR does and why. Name major areas: web, api, tests, docs.>

## Changes

### Web
- …

### API
- …

### Docs / tooling
- …

## Commits

| SHA | Message |
|-----|---------|
| `abc1234` | … |

## Test plan

- [ ] `npm test`
- [ ] `npm run test:cov`
- [ ] Manual: open http://localhost:5401 — generate, center logo, finder marks, download PNG

## Notes / follow-ups

<Breaking changes, deferred work — or "None.">
```

Do **not** include secrets, tokens, or `.env` contents. Do **not** paste huge diffs.

---

## Step 4 — Branch, commit (if dirty), and push (Create modes only)

1. If on `master`/`main` for a feature flow: create a descriptive branch (`feat/…`, `fix/…`, `chore/…`).
2. If there are uncommitted product changes: stage relevant files, commit (HEREDOC), then continue.
3. If not pushed or ahead of origin:

```bash
git push -u origin HEAD
```

Never force-push to `master`/`main`.

---

## Step 5 — Create PR

```bash
gh pr create --base master --title "…" --body "$(cat <<'EOF'
## Summary
…
EOF
)"
```

Add `--draft` when mode is **Create draft PR**. Use `--base main` if that is the repo default.

If a PR already exists for this branch, report `gh pr view --json url,title,baseRefName` and offer `gh pr edit` if wanted.

If `gh` is missing/unauthed: report compare URL + proposed title/body for paste.

---

## Step 6 — Report

**Draft only / Created / Web fallback** — same reporting style as StickPak command: branch, base, title, URL or paste body, next step.

---

## Do not

- Ask commit-only vs commit+PR vs cancel when Create has uncommitted product changes — **commit + PR immediately**
- Include `.env` secrets in the PR body
- Open a feature PR from `master` into `master` without creating a feature branch first
- Use `--fill` blindly — always write a tailored summary from full branch analysis
- Run `git config` changes
- In **Cleanup** mode: `git reset --hard` or force-delete unmerged branches unless the user explicitly requests it
- In **Draft only**: commit, push, or create a PR
