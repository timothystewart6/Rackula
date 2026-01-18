# 1/3U Internal Units Refactoring Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor internal position units from 1/6U to 1/3U to match physical rack hole spacing (3 holes per U).

**Architecture:** Change `UNITS_PER_U` from 6 to 3. Positions become integers representing hole positions. Device heights (e.g., 0.5U) convert to floats in internal units, which is acceptable for collision calculations.

**Tech Stack:** TypeScript, Vitest, Zod schemas

---

## Background

The original 1/6U system was designed as the LCM of 1/2 and 1/3 to support both half-unit devices and third-unit positioning. However, racks only have 3 holes per U, making 1/6U precision physically meaningless. This refactoring simplifies to 1/3U (3 internal units per U), matching actual mounting positions.

**Key insight:** 1/2U is a device HEIGHT property, not a mounting POSITION. Devices are always mounted at holes (1/3U positions). The 1/2U height just means the device occupies half a rack unit of vertical space.

---

## Task 1: Update Constant and Documentation

**Files:**

- Modify: `src/lib/types/constants.ts:71-75`
- Modify: `src/lib/utils/position.ts:1-15` (docs only)
- Modify: `src/lib/types/index.ts:542-546` (docs only)

**Step 1: Update the constant**

```typescript
// src/lib/types/constants.ts, lines 71-75
/**
 * Number of internal units per rack unit (1U).
 * Positions are stored as multiples of 1/3U (3 holes per U).
 * Device heights may convert to floats (e.g., 0.5U = 1.5 internal units).
 */
export const UNITS_PER_U = 3;
```

**Step 2: Update position.ts documentation**

```typescript
// src/lib/utils/position.ts, lines 1-15
/**
 * Position Conversion Utilities
 *
 * Internal positions are stored as multiples of 1/3U, matching the 3 holes
 * per rack unit in standard racks.
 *
 * Position mapping:
 * | Human | Internal |
 * |-------|----------|
 * | U1    | 3        |
 * | U1⅓   | 4        |
 * | U1⅔   | 5        |
 * | U2    | 6        |
 * | U42   | 126      |
 *
 * Note: Device heights like 0.5U convert to 1.5 internal units (floats OK).
 */
```

**Step 3: Update types/index.ts PlacedDevice documentation**

```typescript
// src/lib/types/index.ts, around line 542-546
/**
 * Position in internal units (1/3U = one hole).
 * - Rack-level devices: position from bottom (e.g., 3 = U1, 6 = U2)
 * @see UNITS_PER_U for the internal units constant (3 units per 1U)
 */
```

**Step 4: Commit**

```bash
git add src/lib/types/constants.ts src/lib/utils/position.ts src/lib/types/index.ts
git commit -m "refactor: change UNITS_PER_U from 6 to 3 (1/3U internal units)

Matches physical rack hole spacing (3 holes per U). Device heights
like 0.5U now convert to floats in internal units, which is acceptable
for collision calculations.

Closes discussion #631"
```

---

## Task 2: Update Position Tests

**Files:**

- Modify: `src/tests/position.test.ts`

**Step 1: Update UNITS_PER_U test**

```typescript
// Line 12
expect(UNITS_PER_U).toBe(3);
```

**Step 2: Update whole unit conversion tests**

```typescript
// Lines 18-20
expect(toInternalUnits(1)).toBe(3);
expect(toInternalUnits(2)).toBe(6);
expect(toInternalUnits(42)).toBe(126);
```

**Step 3: Update half-unit tests (now return floats)**

```typescript
// Lines 24-26 - These now return floats
expect(toInternalUnits(0.5)).toBe(1.5);
expect(toInternalUnits(1.5)).toBe(4.5);
expect(toInternalUnits(2.5)).toBe(7.5);
```

**Step 4: Update third-unit tests**

```typescript
// Lines 31-33 - Now whole numbers!
expect(toInternalUnits(1 / 3)).toBe(1);
expect(toInternalUnits(1 + 1 / 3)).toBe(4);
expect(toInternalUnits(2 / 3)).toBe(2);
```

**Step 5: Update reverse conversion tests**

```typescript
// Lines 45-47
expect(toHumanUnits(3)).toBe(1);
expect(toHumanUnits(6)).toBe(2);
expect(toHumanUnits(126)).toBe(42);

// Lines 51-53
expect(toHumanUnits(1.5)).toBe(0.5);
expect(toHumanUnits(4.5)).toBe(1.5);
expect(toHumanUnits(1)).toBeCloseTo(1 / 3);
```

**Step 6: Update round-trip tests**

Update all expectations that assumed UNITS_PER_U = 6. Round-trips for whole and 1/3 units should be exact. Round-trips for 1/2 units now involve floats.

**Step 7: Run tests**

```bash
npm run test -- src/tests/position.test.ts
```

Expected: All tests pass

**Step 8: Commit**

```bash
git add src/tests/position.test.ts
git commit -m "test: update position tests for UNITS_PER_U = 3"
```

---

## Task 3: Update Schema Migration

**Files:**

- Modify: `src/lib/schemas/index.ts`

**Step 1: Find and update migration function**

The migration multiplies old positions by `UNITS_PER_U`. Since UNITS_PER_U is now 3, old U values will be multiplied by 3 (not 6). This is correct behavior.

**Step 2: Update migration detection comments**

```typescript
// Around line 741-747 and 757-770
// Update comments that reference "position < 6" to "position < 3"
// Old format detection: position values 1-100 range
// New format: position values 3-300 range (3x larger)
// If position >= 1 and < 3, it's definitely old format (U1 or U2 in old format)
```

**Step 3: Update heuristic threshold**

```typescript
// The heuristic for detecting old format needs adjustment
// Old: position < 6 means old format (U1 in new format was 6)
// New: position < 3 means old format (U1 in new format is 3)
// BUT position 1 and 2 are valid OLD positions (U1, U2)
// Better heuristic: position >= 1 && position < UNITS_PER_U
```

**Step 4: Run schema tests**

```bash
npm run test -- src/tests/schemas.test.ts
```

**Step 5: Commit**

```bash
git add src/lib/schemas/index.ts
git commit -m "refactor: update migration heuristics for UNITS_PER_U = 3"
```

---

## Task 4: Update Collision and Movement Tests

**Files:**

- Modify: `src/tests/collision.test.ts`
- Modify: `src/tests/device-movement.test.ts`

**Step 1: Update collision test position values**

All hardcoded position values need halving (6→3 per U):

- Position 6 (U1) → Position 3
- Position 12 (U2) → Position 6
- Position 30 (U5) → Position 15
- Position 60 (U10) → Position 30
- Position 252 (U42) → Position 126

**Step 2: Update boundary calculations**

- maxValidTop for 42U rack: was 257, now 128 (42\*3 + 2)
- maxValidTop for 11U rack: was 71, now 35 (11\*3 + 2)

**Step 3: Update device-movement test values**

Similar position value updates.

**Step 4: Run tests**

```bash
npm run test -- src/tests/collision.test.ts src/tests/device-movement.test.ts
```

**Step 5: Commit**

```bash
git add src/tests/collision.test.ts src/tests/device-movement.test.ts
git commit -m "test: update collision and movement tests for UNITS_PER_U = 3"
```

---

## Task 5: Update Keyboard Tests

**Files:**

- Modify: `src/tests/keyboard.test.ts`

**Step 1: Update movement expectations**

- 1U movement: was 6 internal units, now 3
- Shift+Arrow (1/3U): was 2 internal units, now 1

**Step 2: Update position value expectations**

All position values that assumed UNITS_PER_U = 6 need updating.

**Step 3: Run tests**

```bash
npm run test -- src/tests/keyboard.test.ts
```

**Step 4: Commit**

```bash
git add src/tests/keyboard.test.ts
git commit -m "test: update keyboard tests for UNITS_PER_U = 3"
```

---

## Task 6: Update Schema/Migration Tests

**Files:**

- Modify: `src/tests/schemas.test.ts`

**Step 1: Update position migration test expectations**

```typescript
// Old: position 10 * 6 = 60
// New: position 10 * 3 = 30
```

**Step 2: Update heuristic detection tests**

Tests that check "position < 6 means old format" need updating.

**Step 3: Run tests**

```bash
npm run test -- src/tests/schemas.test.ts
```

**Step 4: Commit**

```bash
git add src/tests/schemas.test.ts
git commit -m "test: update schema migration tests for UNITS_PER_U = 3"
```

---

## Task 7: Update Remaining Test Files

**Files:**

- Modify: `src/tests/layout-store.test.ts`
- Modify: `src/tests/layout-undo-redo.test.ts`
- Modify: `src/tests/container-collision.test.ts`
- Modify: `src/tests/DeviceDetails.test.ts`
- Modify: `src/tests/dragdrop.test.ts`
- Modify: `src/tests/factories.ts` (if needed)

**Step 1: Search for hardcoded position values**

Use grep to find remaining hardcoded values:

```bash
rg "position.*[0-9]+" src/tests/ --type ts
```

**Step 2: Update each file**

Apply the same pattern: divide position values by 2 where they represent internal units.

**Step 3: Run full test suite**

```bash
npm run test:run
```

**Step 4: Commit**

```bash
git add src/tests/
git commit -m "test: update all remaining tests for UNITS_PER_U = 3"
```

---

## Task 8: Update E2E Fixtures

**Files:**

- Modify: `e2e/fixtures/legacy-layout-v0.6.yaml` (if exists)

**Step 1: Verify fixture positions**

E2E fixtures should use old U-value format (1, 2, 10) which gets migrated.

**Step 2: Run E2E tests**

```bash
npm run test:e2e
```

**Step 3: Commit if changes needed**

---

## Task 9: Update Design Documentation

**Files:**

- Modify: `docs/plans/2026-01-14-third-ru-positioning-design.md`

**Step 1: Update position mapping table**

```markdown
### Position Mapping

| Human Position | Internal Units |
| -------------- | -------------- |
| U1 (bottom)    | 3              |
| U1 + 1/3       | 4              |
| U1 + 2/3       | 5              |
| U2             | 6              |
| U42            | 126            |

Note: 1/2U device heights convert to floats (e.g., 0.5U = 1.5 internal units).
```

**Step 2: Update conversion helpers**

```typescript
const UNITS_PER_U = 3;
```

**Step 3: Update keyboard movement table**

```markdown
| Shortcut      | Movement | Internal Units |
| ------------- | -------- | -------------- |
| Arrow Up/Down | 1U       | 3              |
| Shift + Arrow | 1/3U     | 1              |
```

**Step 4: Remove Nerd Mode section**

The Phase 2 Nerd Mode (1/6U precision) is no longer applicable.

**Step 5: Commit**

```bash
git add docs/plans/
git commit -m "docs: update design for 1/3U internal units"
```

---

## Task 10: Update GitHub Issues

**Step 1: Update issue #634 (Migration)**

Change references from 1/6U to 1/3U. Update detection heuristic.

**Step 2: Update issue #635 (Keyboard Movement)**

Shift+Arrow now moves by 1 internal unit (1/3U), not 2.

**Step 3: Update issue #636 (UI Formatting)**

Update fraction display expectations.

**Step 4: Close issue #637 (Nerd Mode)**

Close as "won't do" - 1/6U precision is not physically meaningful.

**Step 5: Update issue #757 (Beta Test)**

Update to reference 1/3U.

---

## Task 11: Run Full Build and Lint

**Step 1: Run linter**

```bash
npm run lint
```

**Step 2: Run full test suite**

```bash
npm run test:run
```

**Step 3: Run build**

```bash
npm run build
```

**Step 4: Final commit if needed**

---

## Summary

| Task | Description                     | Estimated Complexity |
| ---- | ------------------------------- | -------------------- |
| 1    | Update constant and docs        | Small                |
| 2    | Update position tests           | Medium               |
| 3    | Update schema migration         | Small                |
| 4    | Update collision/movement tests | Medium               |
| 5    | Update keyboard tests           | Medium               |
| 6    | Update schema tests             | Medium               |
| 7    | Update remaining tests          | Large                |
| 8    | Update E2E fixtures             | Small                |
| 9    | Update design docs              | Small                |
| 10   | Update GitHub issues            | Small                |
| 11   | Full build verification         | Small                |

**Total:** ~200+ test assertions need updating, but the code changes are minimal (just the constant and some comments).
