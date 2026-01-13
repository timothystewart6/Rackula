# Skills System Improvements Design

**Date:** 2026-01-12
**Status:** Approved

---

## Problem Statement

The current skills system has several pain points:

| Problem                | Root Cause                                                    |
| ---------------------- | ------------------------------------------------------------- |
| Discovery inconsistent | Skill descriptions don't trigger for common tasks             |
| Worktree chaos         | Only dev-issue enforces discipline; no lifecycle skill        |
| Token waste            | Project skills duplicate logic instead of calling superpowers |
| Skill overlap          | No clear hierarchy between superpowers and project skills     |

## Design Principle

**Compose, don't modify.** Project skills orchestrate superpowers skills. CLAUDE.md provides routing guidance. Superpowers are upstream - we build on top, not modify.

---

## Deliverables

### 1. CLAUDE.md Additions

#### Skill Routing Table

Add after Quick Reference section:

```markdown
## Skill Routing

**Before starting any task, check if a skill applies:**

| Task Type                 | Skill                                          | Why                                   |
| ------------------------- | ---------------------------------------------- | ------------------------------------- |
| Bug/issue investigation   | `/superpowers:systematic-debugging`            | Prevents guessing, forces evidence    |
| New feature or component  | `/superpowers:brainstorming`                   | Explores requirements before code     |
| Multi-step implementation | `/superpowers:writing-plans` then `/dev-issue` | Plan first, execute with discipline   |
| Working on GitHub issue   | `/dev-issue <number>`                          | Full workflow with worktree isolation |
| Research question         | `/research-spike <number>`                     | Structured investigation              |
| Finishing a branch        | `/superpowers:finishing-a-development-branch`  | Merge/PR decision flow                |
| Worktree cleanup needed   | `/worktree-cleanup`                            | List and remove stale worktrees       |

**Default rule:** If uncertain, invoke `/superpowers:brainstorming` first.
```

#### bits-ui Documentation (per issue #528)

```markdown
### bits-ui Components

When implementing bits-ui components:

- Fetch docs: `WebFetch https://bits-ui.com/docs/components/{name}/llms.txt`
- Available: dialog, tabs, accordion, tooltip, popover, select, combobox
- Validate with Svelte MCP: `svelte-autofixer` tool
- Follow existing wrapper patterns in `src/lib/components/ui/`
```

---

### 2. New Skill: worktree-cleanup.md

**File:** `.claude/commands/worktree-cleanup.md`

````markdown
# Worktree Cleanup Workflow v1

Clean up stale worktrees and associated branches.

**Arguments:** `$ARGUMENTS` (optional: "list" for dry-run, "all" for cleanup all)

---

## When to Use

- End of work session
- Before starting new issue work
- When `git worktree list` shows multiple entries
- Proactively after merging PRs

**Triggers for Claude to invoke proactively:**

- Conversation mentions "clean up" or "tidy"
- More than 2 worktrees exist
- Starting `/dev-issue` and stale worktrees detected

---

## Workflow

### 1. Inventory

```bash
git worktree list
git branch -vv | grep -E "^\*|gone]"  # Find orphaned branches
```
````

### 2. Classify Each Worktree

| Status   | Criteria                          | Action          |
| -------- | --------------------------------- | --------------- |
| Active   | Has uncommitted changes           | Skip, warn user |
| Merged   | Branch merged to main             | Safe to remove  |
| Orphaned | Remote branch deleted             | Safe to remove  |
| Stale    | No commits in 7+ days, no open PR | Ask user        |

### 3. Cleanup (with confirmation)

```bash
# For each safe-to-remove worktree:
git worktree remove .worktree/<name>
git branch -d <branch>  # Delete local branch
git worktree prune
```

### 4. Summary

Report: removed N worktrees, kept M (with reasons).

---

## Integration

**References:** `superpowers:using-git-worktrees` for creation patterns
**Called by:** `/dev-issue` (at session end), manually when needed

````

---

### 3. New Skill: debug-with-memory.md

**File:** `.claude/commands/debug-with-memory.md`

```markdown
# Memory-Assisted Debugging Workflow v1

Debug issues using systematic debugging enhanced with episodic memory search.

**Arguments:** `$ARGUMENTS` (required: brief description of the issue)

---

## When to Use

- Bug reports or test failures
- Unexpected behavior
- Error messages
- "This worked before" situations

**Proactive triggers:**
- Error message in conversation
- User says "bug", "broken", "not working", "regression"

---

## Workflow

### Phase 1: Memory Check (BEFORE investigating)

````

Use mem-search skill:

- Query: "<error keywords> OR <component name>"
- Type: bugfix, decision
- Limit: 10

```

**Purpose:** Recover past solutions, avoid repeating failed approaches.

### Phase 2: Systematic Debugging

**Invoke:** `superpowers:systematic-debugging`

Follow that skill exactly - it handles:
- Hypothesis formation
- Evidence gathering
- Root cause tracing

### Phase 3: Record Solution

After fix verified, solution auto-captured by claude-mem.

Ensure commit message includes:
- Root cause
- Fix approach
- What was tried and failed (if applicable)

---

## Key Principle

**Memory BEFORE investigation.** Don't spend 30 minutes debugging something you solved last week.

---

## Integration

**Orchestrates:** `superpowers:systematic-debugging`
**Uses:** `episodic-memory:search-conversations` or `claude-mem:mem-search`
**Called by:** Proactively when debugging triggers detected
```

---

### 4. Refactor dev-issue.md

Replace inline workflows with superpowers references:

| Current Section                | Replace With                                 |
| ------------------------------ | -------------------------------------------- |
| TDD Workflow (3c)              | `superpowers:test-driven-development`        |
| Error Recovery - Test Failures | `superpowers:systematic-debugging`           |
| Pre-Commit Verification (3d)   | `superpowers:verification-before-completion` |
| Create PR (3f)                 | Keep inline (project-specific PR format)     |
| Merge (3g)                     | `superpowers:finishing-a-development-branch` |

**Keep project-specific:**

- Issue locking protocol
- Worktree requirement (references `superpowers:using-git-worktrees`)
- Phase 1: Pre-flight
- Output format templates

**Estimated reduction:** ~150 lines

---

### 5. Refactor research-spike.md

Same pattern:

| Current Section    | Replace With                                 |
| ------------------ | -------------------------------------------- |
| Phase 3: Synthesis | `superpowers:brainstorming`                  |
| Phase 5: Wrap-up   | `superpowers:finishing-a-development-branch` |
| Error Recovery     | `superpowers:systematic-debugging`           |

**Add memory integration to Phase 1:**

```markdown
### 1e. Memory Context

**Use:** `episodic-memory:search-conversations`

Query: "#$ARGUMENTS OR <spike keywords>"
Load prior work on this spike or related topics.
```

**Estimated reduction:** ~100 lines

---

## Token Impact

| Artifact             | Current       | After         | Savings |
| -------------------- | ------------- | ------------- | ------- |
| dev-issue.md         | ~2,800 tokens | ~2,000 tokens | ~800    |
| research-spike.md    | ~3,400 tokens | ~2,800 tokens | ~600    |
| CLAUDE.md additions  | -             | ~400 tokens   | (cost)  |
| worktree-cleanup.md  | -             | ~350 tokens   | (cost)  |
| debug-with-memory.md | -             | ~300 tokens   | (cost)  |

**Net:** ~350 token reduction per session, plus better skill discovery.

---

## Implementation Order

1. **CLAUDE.md additions** - Skill routing table + bits-ui section
2. **worktree-cleanup.md** - New skill
3. **debug-with-memory.md** - New skill
4. **dev-issue refactor** - Replace inline with references
5. **research-spike refactor** - Same pattern

## Success Criteria

- Claude proactively invokes worktree-cleanup when >2 worktrees exist
- Claude invokes debug-with-memory when error keywords detected
- dev-issue runs successfully with skill references instead of inline
- No increase in session token usage
