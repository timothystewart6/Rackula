# Toolbar Redesign

**Date:** 2026-01-14
**Status:** Approved
**Design Influence:** Tom Geismar — geometric simplicity, iconic forms, purposeful negative space

## Problem

The current toolbar collapsed everything into a single hamburger menu. This buries frequently-used actions and contradicts the Geismar-inspired minimal aesthetic we want — where each visible element has clear purpose.

## Design

### Layout Structure

Three zones with clear purpose:

```
┌──────────────────────────────────────────────────────────────────┐
│ [Logo+Text]      [+] [↶] [↷] [👁] [⛶]                [📁] [⚙️] │
│     ↑                    ↑                               ↑       │
│   brand            action cluster                    dropdowns   │
└──────────────────────────────────────────────────────────────────┘
```

- **Left:** Logo lockup (icon + "Rackula" text) — clickable for Help/About
- **Center:** Action cluster — icon-only buttons for frequent actions
- **Right:** Dropdown menus — File and Settings

### Center Action Cluster

Five icon-only buttons (36×36px hit targets, 18px icons):

| Icon | Action     | Notes                                             |
| ---- | ---------- | ------------------------------------------------- |
| `+`  | New Rack   | IconPlus                                          |
| `↶`  | Undo       | Disabled at 40% opacity when stack empty          |
| `↷`  | Redo       | Disabled at 40% opacity when stack empty          |
| `👁` | View Mode  | **Morphing icon** — cycles Labels → Images → Both |
| `⛶`  | Reset View | IconFitAll                                        |

**View mode morphing:**

- Labels mode → `IconLabel` (T icon)
- Images mode → `IconImage` (picture icon)
- Both mode → `IconImageLabel` (new combined icon)

### Icon Visual Treatment

All toolbar icons share:

- 36×36px hit target (accessibility)
- 18px icon size
- No borders at rest
- Transparent background
- `--colour-surface-hover` background on hover
- `--colour-text-muted` color, `--colour-text` on hover
- Disabled: 40% opacity, `cursor: not-allowed`

### File Dropdown

Trigger: Icon-only (folder/document icon, no chevron)

| Item   | Shortcut                 |
| ------ | ------------------------ |
| Save   | Ctrl+S                   |
| Load   | Ctrl+O                   |
| Export | Ctrl+E                   |
| Share  | (disabled when no racks) |

### Settings Dropdown

Trigger: Icon-only (gear icon, no chevron)

| Item             | Type                       |
| ---------------- | -------------------------- |
| Dark/Light Theme | Toggle item                |
| Show Annotations | Checkbox                   |
| Banana for Scale | Checkbox (moved from Help) |

### Dropdown Visual Treatment

- Dark overlay background (`--colour-surface-overlay`)
- No group headings — flat list for 3-4 items
- Keyboard shortcuts right-aligned in muted mono text
- Items close menu on select
- Hover highlights with `--colour-overlay-hover`
- Fade-in animation (respects reduced motion)

### Logo

Full lockup (icon + "Rackula" text) stays visible:

- Clickable — opens Help/About modal
- Tooltip: "About & Shortcuts (?)"
- Rainbow gradient on hover (existing behavior)
- DRackula prefix on dev environments (existing behavior)

## Implementation

### New Components

1. **`IconSettings.svelte`** — gear/cog icon for Settings dropdown trigger
2. **`IconImageLabel.svelte`** — combined icon for "Both" display mode

### Modified Components

1. **`Toolbar.svelte`** — new three-zone layout structure
2. **`ToolbarMenu.svelte`** → split into:
   - **`FileMenu.svelte`** — Save, Load, Export, Share
   - **`SettingsMenu.svelte`** — Theme, Annotations, Banana
3. **`HelpPanel.svelte`** — remove Banana for Scale toggle

### Deleted Components

- `ToolbarMenu.svelte` (replaced by FileMenu + SettingsMenu)

## Responsive Behavior

- On narrow screens (< 600px), "Rackula" text in logo hides (icon only)
- Action cluster icons remain visible at all breakpoints
- Dropdowns remain at right edge

## Accessibility

- All interactive elements have `aria-label`
- Focus rings use `--colour-focus-ring`
- Tooltips show keyboard shortcuts
- Disabled states properly communicated
- Reduced motion preference respected
