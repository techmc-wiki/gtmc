import type { ReactNode } from "react"

export type MarkdownAstNode = {
  type?: string
  tagName?: string
  value?: string
  children?: MarkdownAstNode[]
}

export type MarkdownComponentProps = {
  children?: ReactNode
  id?: string
  href?: string
  src?: string
  alt?: string
  className?: string
  [key: string]: unknown
}

export type MarkdownComponent = (props: MarkdownComponentProps) => ReactNode
