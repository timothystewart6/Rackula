# 1/3 RU Positioning System Design

**Date:** 2026-01-14 (Updated: 2026-01-18)
**Discussion:** [#631](https://github.com/RackulaLives/Rackula/discussions/631)
**Status:** Approved (Revised)

## Problem

Standard server racks have 3 mounting holes per rack unit. The current 1/2U fine-movement increment (Shift+Arrow) is physically impossible on most racks. Users need 1/3U positioning to align devices with actual hole positions.

## Solution: 1/3U Internal Units

Store positions internally as multiples of 1/3U, matching the physical hole spacing in standard racks. Each rack unit has exactly 3 holes, so 3 internal units per U is the natural choice.

**Key insight:** 1/2U is a device HEIGHT (e.g., brush strips), not a mounting POSITION. Devices always mount at hole positions (1/3U). The 1/2U height just means the device occupies half a rack unit of vertical space.

### Position Mapping

| Human Position | Internal Units |
| -------------- | -------------- |
| U1 (bottom)    | 3              |
| U1 + 1/3       | 4              |
| U1 + 2/3       | 5              |
| U2             | 6              |
| U42            | 126            |

### Device Heights

Device heights like 0.5U convert to floats in internal units (1.5). This is acceptable for collision calculations:

| Device Height | Internal Units |
| ------------- | -------------- |
| 0.5U          | 1.5 (float)    |
| 1U            | 3              |
| 2U            | 6              |

### Conversion Helpers

```typescript
const UNITS_PER_U = 3;

function toInternalUnits(humanU: number): number {
  return humanU * UNITS_PER_U;
}

function toHumanUnits(internal: number): number {
  return internal / UNITS_PER_U;
}

function formatPosition(internal: number): string {
  const wholeU = Math.floor(internal / UNITS_PER_U);
  const fraction = internal % UNITS_PER_U;

  const fractionMap: Record<number, string> = {
    0: "",
    1: "⅓",
    2: "⅔",
  };

  return `U${wholeU}${fractionMap[fraction] ?? ""}`;
}
```

## Keyboard Movement

| Shortcut      | Movement | Internal Units |
| ------------- | -------- | -------------- |
| Arrow Up/Down | 1U       | 3              |
| Shift + Arrow | 1/3U     | 1              |

## Migration

### File Format

The `version` field tracks the app version. Layouts saved before 0.7.0 use U values directly; 0.7.0+ uses internal units.

- Old: `position: 1` = U1, `position: 1.5` = U1.5
- New: `position: 3` = U1, `position: 4` = U1⅓

### Auto-Migration on Load

```typescript
function migratePosition(oldPosition: number): number {
  // Old format: positions in 1-100 range (U values)
  // New format: positions in 3-300 range (internal units, 3x larger)
  return oldPosition * UNITS_PER_U;
}

function needsMigration(version: string | undefined): boolean {
  // Layouts before 0.7.0 use old U-value positions
  if (!version) return true;
  return compareVersions(version, "0.7.0") < 0;
}
```

Heuristic fallback: If any rack-level device has `position >= 1 && position < UNITS_PER_U`, it's old format.

### Backward Compatibility

- **Old Rackula loading new files:** Positions appear 3x higher (graceful degradation)
- **New Rackula loading old files:** Auto-converts seamlessly

## UI Display

Affected locations:

1. Device inspector panel (position field) - shows U1⅓ format
2. Rack U-number labels - remain whole numbers only
3. Device hover tooltip - if showing position
4. CSV export - position column uses human format

## Implementation Issues

1. **Core Position System** - Update UNITS_PER_U constant and docs (Small)
2. **Migration Layer** - Auto-convert on load with 3x multiplier (Small)
3. **Keyboard Movement** - Change Shift+Arrow to 1/3U (1 internal unit) (Small)
4. **UI Position Formatting** - Update formatPosition() helper (Small)
5. **Tests** - Update ~200 assertions with new position values (Medium)

## Revision History

- **2026-01-14:** Original design with 1/6U internal units
- **2026-01-18:** Simplified to 1/3U after realizing 1/6U doesn't map to physical reality (racks have 3 holes, not 6). Removed "Nerd Mode" phase 2. Device heights with 1/2U now convert to floats, which is acceptable for calculations.
