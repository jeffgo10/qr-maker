---
name: handoff
description: Compact the current Cursor session into a handoff doc for the next agent (rules, skills, git, env).
argument-hint: "Next session focus (optional): e.g. finish QR tests, open PR, minimal"
disable-model-invocation: true
---

# Handoff — compact session for the next Cursor agent

Summarize the current chat into a **handoff document** a fresh Cursor agent can use to continue without re-discovering context. Save the file **outside the repo** (OS temp directory), not in the workspace.

## Mode — read trailing user text

| Trailing text | Mode |
|---|---|
| Empty | **Full handoff** — goal, progress, blockers, env, suggested next steps |
| Describes next focus (e.g. "finish finder overlay bug", "open PR only") | **Tailored** — same structure, but prioritize that focus in Goal + Next steps |
| "minimal" or "short" | **Minimal** — Goal, Current state, Next 3 steps, Critical paths only; skip long appendix |
| "with transcript" | **Full + transcript ref** — include path to this session's agent transcript if discoverable |

If ambiguous, default to **Full handoff**.

---

## Step 1 — Gather context (do not guess)

Collect facts from the session and repo before writing:

1. **User intent** — what they asked for; what changed mid-session.
2. **Trailing text** — next-session focus from Step 0 mode table.
3. **Git** (when relevant):
   ```bash
   git branch --show-current
   git status --short
   git log -5 --oneline
   ```
4. **Changed files** — list paths touched or discussed; do not paste full diffs.
5. **Terminals** — if dev servers matter, note ports (`web :5401`, `api :3401`).
6. **Cursor artifacts** — rules, commands, skills, MCP servers that matter for continuation.
7. **External refs** — PRs, issues — link or path only.

**Do not duplicate** content already in README, plans, commits, or diffs. **Reference by path or URL**.

**Redact** API keys, tokens, passwords, `.env` values, and PII.

---

## Step 2 — Write the handoff file

### Output location

| OS | Directory |
|---|---|
| macOS / Linux | `$TMPDIR` or `/tmp` |
| Windows | `%TEMP%` |

**Filename:** `cursor-handoff-<repo-basename>-<YYYYMMDD-HHMM>.md`  
Example: `/tmp/cursor-handoff-qr-maker-20260807-1000.md`

Tell the user the **full absolute path** when done.

### Document template

```markdown
# Cursor handoff — <short title>

**Generated:** <ISO date/time>
**Repo:** <absolute workspace path>
**Branch:** <branch> (<clean | dirty>)
**Next session focus:** <from user trailing text or "continue current task">

## Goal

<1–3 sentences>

## Current state

<Bullets: done / in progress / broken>

## Key decisions & constraints

<Non-obvious choices, rejected approaches>

## Files & artifacts (reference only)

| Path | Relevance |
|---|---|
| `path/to/file` | <one line> |

## Environment & dev notes

<Ports, env var *names* only, local services>

## Blockers & open questions

<What only the user can answer>

## Suggested next steps

1. <Concrete action>
2. …

## Cursor continuation guide

### Rules to read first

- `.cursor/rules/<file>.mdc` — <why>

### Suggested slash commands

- `/command-name` — <when to use>

### Suggested skills

| Skill | Path | When |
|---|---|---|
| <name> | `~/.cursor/skills-cursor/<skill>/SKILL.md` | <trigger> |

### Recommended Cursor mode

<Agent | Plan | Debug> — <one line why>
```

---

## Step 3 — Beacon defaults (this repo)

| Topic | Read first |
|---|---|
| Project overview | `.cursor/rules/beacon-project.mdc`, `README.md` |
| Local ports / commands | `.cursor/rules/beacon-local-dev.mdc` |
| Clean code / CSS breakpoints | `.cursor/rules/clean-code.mdc` |
| UI/UX | `.cursor/rules/UI-UX/design-core.mdc` |
| Browser QR logic | `web/src/lib/qr.ts` |
| Open PR | `/create-github-pr` |

---

## Step 4 — Quality bar

- [ ] Next agent can act in **≤2 minutes** without re-reading the whole chat
- [ ] Every file mention is a **path**, not a pasted blob
- [ ] **Next steps** are actionable (verb + target)
- [ ] No secrets in the saved file
- [ ] User receives the **absolute path** to the handoff file

Do **not** commit the handoff file to git unless the user explicitly asks.
