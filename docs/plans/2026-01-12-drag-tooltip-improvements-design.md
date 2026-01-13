# Drag Tooltip Improvements Design

**Issue:** #306 (reopen)
**Date:** 2026-01-12
**Status:** Approved

## Summary

Improve the drag tooltip to visually represent the rack slot size and remove the browser's native drag ghost that shows the grip handle.

## Design Decisions

| Decision          | Choice                                                 |
| ----------------- | ------------------------------------------------------ |
| Sizing strategy   | Ergonomic with aspect ratio hints (not pixel-accurate) |
| Native drag ghost | Hide entirely with transparent `setDragImage()`        |
| Tooltip content   | Device name only, centered                             |
| Visual style      | Rack-slot style with category color accent             |

## Visual Specification

### Shape and Size

- **Fixed width:** `--drag-tooltip-width` (160px)
- **Height formula:** `--drag-tooltip-base-height + (u_height - 1) * --drag-tooltip-height-per-u`
  - Base height: 24px (`--space-6`)
  - Height per U: 14px (`--space-3-5`)
  - Minimum height: 24px (for 0.5U devices)
- **Examples:**
  - 1U → 24px
  - 2U → 38px
  - 4U → 66px
  - 8U → 122px

### Styling

- Background: `--colour-surface-overlay`
- Left border: 4px solid, using device's category color
- Border radius: `--radius-sm`
- Shadow: `--shadow-lg`
- Text: `--colour-text-inverse`, centered both axes
- Text overflow: ellipsis for long names

### Cursor Offset

Offset values defined as constants in the store:

- `TOOLTIP_OFFSET_X`: 16px (`--space-4`)
- `TOOLTIP_OFFSET_Y`: -8px (`--space-2` negative)

## Technical Implementation

### Files to Modify

1. **`src/lib/stores/dragTooltip.svelte.ts`**
   - Add `categoryColor: string` to `DragTooltipState`
   - Add `uHeight: number` to state (explicit, for height calc)
   - Update `showDragTooltip()` signature to accept these values

2. **`src/lib/components/DragTooltip.svelte`**
   - Remove U-height badge, keep only device name centered
   - Calculate height based on `uHeight` state
   - Apply category color to left border via inline style
   - Update CSS for rack-slot aesthetic

3. **`src/lib/components/DevicePaletteItem.svelte`**
   - Add `setDragImage()` call with transparent 1x1 image
   - Pass `device.colour` and `device.u_height` to `showDragTooltip()`

4. **`src/lib/components/RackDevice.svelte`**
   - Same `setDragImage()` and tooltip changes for repositioning

### Transparent Drag Image

Create once at module level to avoid per-drag allocation:

```typescript
// In dragdrop.ts or similar utility
const transparentImage = (() => {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return canvas;
})();

export function hideNativeDragGhost(dataTransfer: DataTransfer): void {
  dataTransfer.setDragImage(transparentImage, 0, 0);
}
```

## Edge Cases

| Case                   | Handling                                            |
| ---------------------- | --------------------------------------------------- |
| Long device names      | `text-overflow: ellipsis`, fixed width              |
| 0.5U devices           | Minimum height of 24px                              |
| Reduced motion         | Fade-in animation respects `prefers-reduced-motion` |
| Missing category color | Fallback to `--colour-primary`                      |

## Accessibility

- `role="tooltip"` retained
- `aria-live="polite"` retained
- `pointer-events: none` (no click interception)

## Visual Example

```
┌────────────────────────┐
│ ▌   Dell PowerEdge...  │  ← 2U device, ~38px tall
└────────────────────────┘
  ↑ 4px category color border
```

## Out of Scope

- Pixel-accurate sizing matching zoom level
- Showing device images in tooltip
- Animation during drag (beyond initial fade-in)
