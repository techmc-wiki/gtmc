"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror"
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
}

export const EditorTextarea = React.forwardRef<
  ReactCodeMirrorRef,
  EditorTextareaProps
>(function EditorTextarea(
  {
    value,
    onChange,
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
    ...rest
  },
  ref
) {
  const t = useTranslations("Editor")

  return (
    <div
      className={`
        custom-left-scrollbar flex w-full grow flex-col
        ${isReadOnly ? `cursor-not-allowed bg-gray-50` : `bg-transparent`}
      `}
      onPaste={onPaste}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      aria-busy={isSaving}
      role="application"
      {...rest}>
      <CodeMirror
        ref={ref}
        value={value}
        height="100%"
        className="grow [&>.cm-editor]:h-full custom-left-scrollbar"
        placeholder={placeholder ?? t("bodyPlaceholder")}
        extensions={[
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          techTheme,
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
