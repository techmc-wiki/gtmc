import { assign, createMachine, type SnapshotFrom } from "xstate"

import type { DraftStatus } from "@/lib/drafts/store"

export interface EditorSessionContext {
  status: DraftStatus
  activeSaves: number
}

export type EditorSessionEvent =
  | { type: "DRAFT_STATUS_CHANGED"; status: DraftStatus }
  | { type: "SAVE_STARTED" }
  | { type: "SAVE_SETTLED" }
  | { type: "SAVE_FAILED" }
  | { type: "SUBMIT_STARTED" }
  | { type: "SUBMIT_SUCCEEDED" }
  | { type: "SUBMIT_FAILED" }

/**
 * Client-side concurrency for the draft editor: save and submit are separate
 * regions so a submit can observe in-flight saves instead of racing them.
 */
export function createEditorSessionMachine(initialStatus: DraftStatus) {
  return createMachine({
    id: "draftEditorSession",
    types: {} as {
      context: EditorSessionContext
      events: EditorSessionEvent
    },
    context: {
      status: initialStatus,
      activeSaves: 0,
    },
    type: "parallel",
    states: {
      save: {
        initial: "idle",
        states: {
          idle: {
            on: {
              SAVE_STARTED: {
                target: "saving",
                actions: assign({
                  activeSaves: ({ context }) => context.activeSaves + 1,
                }),
              },
            },
          },
          saving: {
            on: {
              SAVE_STARTED: {
                target: "saving",
                actions: assign({
                  activeSaves: ({ context }) => context.activeSaves + 1,
                }),
              },
              SAVE_SETTLED: [
                {
                  guard: ({ context }) => context.activeSaves > 1,
                  target: "saving",
                  actions: assign({
                    activeSaves: ({ context }) => context.activeSaves - 1,
                  }),
                },
                {
                  target: "idle",
                  actions: assign({ activeSaves: 0 }),
                },
              ],
              SAVE_FAILED: [
                {
                  guard: ({ context }) => context.activeSaves > 1,
                  target: "saving",
                  actions: assign({
                    activeSaves: ({ context }) => context.activeSaves - 1,
                  }),
                },
                {
                  target: "error",
                  actions: assign({ activeSaves: 0 }),
                },
              ],
            },
          },
          error: {
            on: {
              SAVE_STARTED: {
                target: "saving",
                actions: assign({
                  activeSaves: ({ context }) => context.activeSaves + 1,
                }),
              },
            },
          },
        },
      },
      submit: {
        initial: "idle",
        states: {
          idle: {
            on: { SUBMIT_STARTED: "submitting" },
          },
          submitting: {
            on: {
              SUBMIT_SUCCEEDED: "succeeded",
              SUBMIT_FAILED: "error",
            },
          },
          succeeded: {},
          error: {
            on: { SUBMIT_STARTED: "submitting" },
          },
        },
      },
    },
    on: {
      DRAFT_STATUS_CHANGED: {
        actions: assign({
          status: ({ event }) => event.status,
        }),
      },
    },
  })
}

export type EditorSessionMachine = ReturnType<typeof createEditorSessionMachine>
export type EditorSessionSnapshot = SnapshotFrom<EditorSessionMachine>

export function isEditorSaving(snapshot: EditorSessionSnapshot): boolean {
  return snapshot.matches({ save: "saving" })
}

export function isEditorSubmitting(snapshot: EditorSessionSnapshot): boolean {
  return snapshot.matches({ submit: "submitting" })
}

export function isEditorReadOnly(snapshot: EditorSessionSnapshot): boolean {
  return snapshot.context.status !== "DRAFT" || isEditorSubmitting(snapshot)
}
