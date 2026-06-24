/**
 * State machine types for the mobile article tree.
 *
 * The tree toggle exists in three states:
 * - `closed` – hidden (may be stuck or not)
 * - `inline_open` – open, inline within the page layout (not stuck)
 * - `floating_open` – open, floating overlay (stuck)
 *
 * Transitions are driven by user events such as scroll, toggle, navigation,
 * and window resize.
 *
 * @module mobile-chapter-nav/types
 */

/**
 * Discriminated union of all possible machine states.
 *
 * - `"closed"`: the tree panel is hidden.  `isStuck` indicates whether it
 *   will re-open as floating (stuck) or inline (not stuck) on next open.
 * - `"inline_open"`: the tree panel is open and rendered inline.  Always
 *   `isStuck === false`.
 * - `"floating_open"`: the tree panel is open as a floating overlay over the
 *   article content.  Always `isStuck === true`.
 */
export type MachineState =
  | { readonly value: "closed"; readonly isStuck: boolean }
  | { readonly value: "inline_open"; readonly isStuck: false }
  | { readonly value: "floating_open"; readonly isStuck: true }

/**
 * Discriminated union of events that drive the state machine.
 *
 * | Event               | Trigger                                                       |
 * |---------------------|---------------------------------------------------------------|
 * | `TOGGLE`            | User taps the tree toggle button                              |
 * | `SCROLL_CROSS_DOWN` | Scroll direction crosses below the tree threshold             |
 * | `SCROLL_CROSS_UP`   | Scroll direction crosses above the tree threshold             |
 * | `CLOSE`             | Explicit close (backdrop tap, Escape key)                     |
 * | `NAVIGATE`          | User navigates to a different article                         |
 * | `RESIZE_TO_DESKTOP` | Viewport resizes to desktop breakpoint (>= 1024 px)           |
 */
export type MachineEvent =
  | { readonly type: "TOGGLE" }
  | { readonly type: "SCROLL_CROSS_DOWN" }
  | { readonly type: "SCROLL_CROSS_UP" }
  | { readonly type: "CLOSE" }
  | { readonly type: "NAVIGATE" }
  | { readonly type: "RESIZE_TO_DESKTOP" }

/**
 * Create the initial machine state.
 *
 * The tree always starts closed.  The `isStuck` flag controls which open
 * variant it transitions into after `TOGGLE` or closing events.
 *
 * @param isStuck - Whether the tree stuck-detection has already determined
 *   the panel should open in floating mode.
 * @returns A `closed` state with the given `isStuck` value.
 */
export function createInitialState(isStuck: boolean): MachineState {
  return { value: "closed" as const, isStuck }
}
