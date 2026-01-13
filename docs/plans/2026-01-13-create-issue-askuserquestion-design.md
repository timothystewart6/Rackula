# Design: Improve /create-issue with AskUserQuestion

**Date:** 2026-01-13
**Status:** Approved
**Goal:** Convert text-based prompts to AskUserQuestion tool for better UX

---

## Overview

The `/create-issue` skill currently uses text-based menus and prompts. This design converts appropriate prompts to use the AskUserQuestion tool, providing structured options, descriptions, and multi-select capabilities.

---

## Prompts to Convert

### Converted to AskUserQuestion

| Step               | Current Prompt        | AskUserQuestion Fit                               |
| ------------------ | --------------------- | ------------------------------------------------- |
| Type Selection     | Text menu (1-4)       | Single-select, 4 options with descriptions        |
| Duplicate Check    | "Enter number or 'n'" | Single-select with found issues + "None of these" |
| Label Confirmation | "Confirm? [y/n/edit]" | Multi-select with suggested labels pre-described  |
| Priority           | "u/h/m/l/enter"       | Single-select, 4 priority levels + skip           |
| Milestone          | Text menu             | Single-select, 4 semantic options                 |
| Preview Confirm    | "[y/n]"               | Single-select: "Create" / "Edit" / "Cancel"       |
| Handoff Offer      | "[y/n]"               | Single-select: "Start now" / "Done for now"       |

### Remain as Free-Text

- Summary (one-line description)
- Type-specific details (expected/actual behavior, etc.)
- Acceptance criteria (multi-line)
- Test requirements (multi-line)

---

## AskUserQuestion Specifications

### Type Selection

```
header: "Issue type"
question: "What type of issue are you creating?"
multiSelect: false
options:
  - label: "Bug"
    description: "Something is broken or not working as expected"
  - label: "Feature"
    description: "New capability or functionality"
  - label: "Chore"
    description: "Refactoring, docs, tooling, maintenance"
  - label: "Spike"
    description: "Research or investigation before implementation"
```

### Duplicate Check

_Dynamic - only shown if matches found_

```
header: "Duplicates?"
question: "Are any of these existing issues duplicates?"
multiSelect: false
options:
  - label: "#42: Toast z-index issue"
    description: "open - matches 'toast', 'z-index'"
  - label: "#38: Modal layering bug"
    description: "closed"
  - label: "None of these"
    description: "Continue creating new issue"
```

### Priority

```
header: "Priority"
question: "What priority level?"
multiSelect: false
options:
  - label: "Urgent"
    description: "Blocking other work, needs immediate attention"
  - label: "High"
    description: "Important, should be addressed soon"
  - label: "Normal"
    description: "Standard priority (Recommended)"
  - label: "Low"
    description: "Nice to have, address when convenient"
```

### Label Confirmation

_Multi-select with dynamically generated options_

```
header: "Labels"
question: "Which labels should be applied?"
multiSelect: true
options:
  - label: "area:ui"
    description: "Detected from: 'toast', 'modal'"
  - label: "size:small"
    description: "Default for bug type"
  - label: "priority:high"
    description: "Detected from: 'blocking'"
  - label: "area:canvas"
    description: "Other relevant area"
```

### Preview Confirm

```
header: "Create?"
question: "Issue preview looks good?"
multiSelect: false
options:
  - label: "Create issue"
    description: "Submit to GitHub now"
  - label: "Edit details"
    description: "Go back and modify something"
  - label: "Cancel"
    description: "Discard and exit"
```

### Handoff Offer

```
header: "Next step"
question: "Issue created! What now?"
multiSelect: false
options:
  - label: "Start implementation"
    description: "Invoke /dev-issue to begin work"
  - label: "Done for now"
    description: "Return to normal conversation"
```

---

## Milestone Selection (Key Feature)

### Pre-fetch Logic

```bash
# Get current version from package.json
current_version=$(node -p "require('./package.json').version")

# Get open milestones
gh api repos/:owner/:repo/milestones --jq '.[] | select(.state=="open") | .title'
```

### Version Calculation

Parse `current_version` (e.g., `0.6.16`):

| Option     | Creates | Calculation                   |
| ---------- | ------- | ----------------------------- |
| Next       | v0.6.17 | Bump patch                    |
| Next Minor | v0.7.0  | Bump minor, reset patch       |
| Next Major | v1.0.0  | Bump major, reset minor+patch |

If milestone exists, use existing. If not, create it.

### AskUserQuestion

```
header: "Milestone"
question: "Which milestone should this issue target?"
multiSelect: false
options:
  - label: "Next (v0.7.0)"
    description: "Nearest open milestone"
  - label: "Next Minor (v0.8.0)"
    description: "Will create milestone if needed"
  - label: "Next Major (v1.0.0)"
    description: "Will create milestone if needed"
  - label: "None"
    description: "No milestone assignment"
```

_Labels dynamically show actual version numbers_

### Post-Selection Logic

If selected milestone doesn't exist:

```bash
gh api repos/:owner/:repo/milestones -f title="vX.Y.Z"
```

Then assign issue to that milestone.

---

## Mode-Specific Behavior

### Mode Triggering

Based on `$ARGUMENTS`:

| Invocation                      | Mode          | Example                         |
| ------------------------------- | ------------- | ------------------------------- |
| `/create-issue`                 | Interactive   | No args - full guided workflow  |
| `/create-issue 42`              | Triage        | Number - prepare existing issue |
| `/create-issue "Fix toast bug"` | Quick Capture | Quoted text - minimal friction  |

**Detection logic:**

```
if $ARGUMENTS is empty → Interactive
else if $ARGUMENTS matches /^\d+$/ → Triage
else → Quick Capture
```

### Interactive Mode (Full Workflow)

Uses ALL AskUserQuestion prompts:

- Type Selection
- Duplicate Check (if matches found)
- Priority
- Label Confirmation
- Milestone
- Preview Confirm
- Handoff Offer

Plus free-text collection for details, acceptance criteria, tests.

### Triage Mode (Existing Issue)

- Skips: Type Selection, Summary (already exists)
- Shows: Missing section prompts only
- Label question: Shows current labels + suggestions, multi-select to add/remove
- Milestone question: Same as interactive
- No preview (editing existing issue)

### Quick Capture Mode (Minimal Friction)

- Skips: Most questions entirely
- Shows only:
  - Duplicate Check (if matches found)
  - Brief confirmation (single yes/no style)
- Auto-infers: Type, labels from keywords
- Auto-assigns: `triage` label (needs full triage later)
- **No milestone question** - quick capture is for fast logging, not planning

---

## What Stays the Same

- Decision flow for mode selection
- Free-text inputs (summary, details, acceptance criteria)
- Label inference tables
- Issue body templates
- Error handling

---

## Implementation Notes

1. Update skill file at `.claude/commands/create-issue.md`
2. Replace text-based prompt instructions with AskUserQuestion tool calls
3. Add milestone version calculation logic
4. Add milestone creation logic
5. Test all three modes
