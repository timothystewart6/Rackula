/**
 * Position Conversion Utilities
 *
 * Internal units use UNITS_PER_U = 6 (LCM of 2 and 3) for integer math:
 * - Hole positions: 1/3U = 2 internal units (racks have 3 holes per U)
 * - Device heights: 1/2U = 3 internal units (smallest device is 0.5U)
 *
 * This avoids floating-point precision issues in collision detection.
 *
 * Position mapping:
 * | Human | Internal | Notes                    |
 * |-------|----------|--------------------------|
 * | U1    | 6        | Standard position        |
 * | U1⅓   | 8        | Offset by one hole       |
 * | U1½   | 9        | Half-U device boundary   |
 * | U2    | 12       | Standard position        |
 */

import { UNITS_PER_U } from "$lib/types/constants";

// Re-export for convenience
export { UNITS_PER_U };

/**
 * Convert human U position to internal units.
 * @param humanU - Position in U (e.g., 1, 1.5, 2)
 * @returns Internal position (e.g., 6, 9, 12)
 */
export function toInternalUnits(humanU: number): number {
  return Math.round(humanU * UNITS_PER_U);
}

/**
 * Convert internal units to human U position.
 * @param internal - Internal position (e.g., 6, 9, 12)
 * @returns Position in U (e.g., 1, 1.5, 2)
 */
export function toHumanUnits(internal: number): number {
  return internal / UNITS_PER_U;
}

/**
 * Convert device height in U to internal units.
 * @param heightU - Height in U (e.g., 1, 2, 0.5)
 * @returns Height in internal units (e.g., 6, 12, 3)
 */
export function heightToInternalUnits(heightU: number): number {
  return Math.round(heightU * UNITS_PER_U);
}
