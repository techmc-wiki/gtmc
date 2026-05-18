/**
 * Pure transition function for the mobile article tree state machine.
 *
 * The reducer implements the full 24-cell transition table covering all
 * combinations of the four extended states (closed stuck/not-stuck,
 * inline_open, floating_open) and six event types.
 *
 * @module mobile-chapter-nav/reducer
 */

import type { MachineState, MachineEvent } from "./types"

/**
 * Transition the state machine in response to an event.
 *
 * @param state - Current machine state.
 * @param event - Event to dispatch.
 * @returns The next machine state.
 */
export function transition(state: MachineState, event: MachineEvent): MachineState {
  switch (state.value) {
    case "closed":
      switch (event.type) {
        case "TOGGLE":
          return state.isStuck
            ? ({ value: "floating_open", isStuck: true } as const)
            : ({ value: "inline_open", isStuck: false } as const)
        case "SCROLL_CROSS_DOWN":
          return state.isStuck
            ? state
            : { value: "closed", isStuck: true }
        case "SCROLL_CROSS_UP":
          return state.isStuck
            ? { value: "closed", isStuck: false }
            : state
        case "CLOSE":
        case "NAVIGATE":
        case "RESIZE_TO_DESKTOP":
          return state
        default:
          event satisfies never
          return state
      }

    case "inline_open":
      switch (event.type) {
        case "TOGGLE":
          return { value: "closed", isStuck: false } as const
        case "SCROLL_CROSS_DOWN":
          return { value: "floating_open", isStuck: true }
        case "SCROLL_CROSS_UP":
          return state
        case "CLOSE":
        case "NAVIGATE":
        case "RESIZE_TO_DESKTOP":
          return { value: "closed", isStuck: false } as const
        default:
          event satisfies never
          return state
      }

    case "floating_open":
      switch (event.type) {
        case "TOGGLE":
          return { value: "closed", isStuck: true } as const
        case "SCROLL_CROSS_DOWN":
          return state
        case "SCROLL_CROSS_UP":
          return { value: "inline_open", isStuck: false } as const
        case "CLOSE":
        case "NAVIGATE":
          return { value: "closed", isStuck: true } as const
        case "RESIZE_TO_DESKTOP":
          return { value: "closed", isStuck: false } as const
        default:
          event satisfies never
          return state
      }

    default:
      state satisfies never
      return state
  }
}

export { createInitialState } from "./types"
