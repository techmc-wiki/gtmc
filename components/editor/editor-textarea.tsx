"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror"
import {
  autocompletion,
  type CompletionContext,
  snippetCompletion,
} from "@codemirror/autocomplete"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { languages } from "@codemirror/language-data"
import { EditorView } from "@codemirror/view"

const techTheme = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
    color: "var(--color-tech-main, #000)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.875rem",
    lineHeight: "1.625",
    height: "100%",
  },
  ".cm-content": {
    padding: "1.5rem",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--color-tech-main, #000)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
    {
      backgroundColor: "rgba(0,0,0,0.1)",
    },
  ".cm-gutters": {
    backgroundColor: "transparent",
    color: "rgba(0,0,0,0.5)",
    border: "none",
  },
})

interface EditorTextareaProps {
  value: string
  onChange: (value: string) => void
  onUndo?: () => void
  onRedo?: () => void
  onPaste?: (e: React.ClipboardEvent<HTMLDivElement>) => void
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragEnter?: (e: React.DragEvent<HTMLDivElement>) => void
  isReadOnly?: boolean
  isSaving?: boolean
  placeholder?: string
  "aria-busy"?: boolean
  fileId?: string // to preserve state per file
  lineWrap?: boolean
  onWrapToggle?: () => void
  canUndo?: boolean
  canRedo?: boolean
  enableSyntaxHints?: boolean
}

const markdownSyntaxHints = [
  snippetCompletion("# ${Title}", {
    label: "heading-1",
    detail: "Markdown H1",
    info: "Insert a top-level heading",
  }),
  snippetCompletion("## ${Section}", {
    label: "heading-2",
    detail: "Markdown H2",
    info: "Insert a section heading",
  }),
  snippetCompletion("- ${item}", {
    label: "bullet-list",
    detail: "List",
    info: "Insert a bullet list item",
  }),
  snippetCompletion("- [ ] ${task}", {
    label: "task-list",
    detail: "Checklist",
    info: "Insert a markdown task item",
  }),
  snippetCompletion("> ${quote}", {
    label: "blockquote",
    detail: "Quote",
    info: "Insert a blockquote",
  }),
  snippetCompletion("[${label}](${url})", {
    label: "link",
    detail: "Link",
    info: "Insert a markdown link",
  }),
  snippetCompletion("![${alt}](${url})", {
    label: "image",
    detail: "Image",
    info: "Insert a markdown image",
  }),
  snippetCompletion("```md\n${content}\n```", {
    label: "code-fence",
    detail: "Code block",
    info: "Insert a fenced code block",
  }),
  snippetCompletion(
    "| Column | Value |\n| --- | --- |\n| ${left} | ${right} |",
    {
      label: "table",
      detail: "Table",
      info: "Insert a markdown table",
    }
  ),
  snippetCompletion("$$\n${formula}\n$$", {
    label: "math-block",
    detail: "KaTeX",
    info: "Insert a math block",
  }),
] as const

function markdownSyntaxHintSource(context: CompletionContext) {
  const word = context.matchBefore(/[\w-]*/)

  if (!context.explicit) {
    const line = context.state.doc.lineAt(context.pos)
    const prefix = line.text.slice(0, context.pos - line.from)
    const trigger = prefix.slice(-1)
    const onlyWhitespace = prefix.trim().length === 0

    if (
      !onlyWhitespace &&
      !["#", "-", ">", "[", "!", "`", "|"].includes(trigger)
    ) {
      return null
    }
  }

  return {
    from: word ? word.from : context.pos,
    options: [...markdownSyntaxHints],
    validFor: /[\w-]*/,
  }
}

export const EditorTextarea = React.forwardRef<
  ReactCodeMirrorRef,
  EditorTextareaProps
>(function EditorTextarea(
  {
    value,
    onChange,
    onUndo,
    onRedo,
    onPaste,
    onDrop,
    onDragOver,
    onDragEnter,
    isReadOnly,
    isSaving,
    placeholder,
    fileId,
    lineWrap = false,
    onWrapToggle,
    canUndo = false,
    canRedo = false,
    enableSyntaxHints = false,
    ...rest
  },
  ref
) {
  const t = useTranslations("Editor")

  const handleKeyDownCapture = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isReadOnly) {
        return
      }

      const key = event.key.toLowerCase()
      const isModifierPressed = event.ctrlKey || event.metaKey
      const isUndo = isModifierPressed && !event.shiftKey && key === "z"
      const isRedo =
        isModifierPressed &&
        ((event.shiftKey && key === "z") || (!event.shiftKey && key === "y"))

      if (isUndo && onUndo) {
        event.preventDefault()
        event.stopPropagation()

        if (canUndo) {
          onUndo()
        }
        return
      }

      if (isRedo && onRedo) {
        event.preventDefault()
        event.stopPropagation()

        if (canRedo) {
          onRedo()
        }
      }
    },
    [canRedo, canUndo, isReadOnly, onRedo, onUndo]
  )

  return (
    <div
      className={`
        flex custom-left-scrollbar w-full grow flex-col
        ${isReadOnly ? `cursor-not-allowed bg-gray-50` : `bg-transparent`}
      `}
      onPaste={onPaste}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onKeyDownCapture={handleKeyDownCapture}
      aria-busy={isSaving}
      role="application"
      {...rest}>
      <CodeMirror
        ref={ref}
        value={value}
        height="100%"
        className="custom-left-scrollbar grow [&>.cm-editor]:h-full"
        placeholder={placeholder ?? t("bodyPlaceholder")}
        extensions={[
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          techTheme,
          ...(enableSyntaxHints
            ? [autocompletion({ override: [markdownSyntaxHintSource] })]
            : []),
          ...(lineWrap ? [EditorView.lineWrapping] : []),
        ]}
        onChange={onChange}
        readOnly={isReadOnly}
        editable={!isReadOnly}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: false,
        }}
        theme="light"
      />
    </div>
  )
})
