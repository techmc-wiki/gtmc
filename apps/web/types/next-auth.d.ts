import type { DefaultSession } from "next-auth"
// eslint-disable-next-line import/no-unassigned-import
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      githubLogin: string | null
      emailVisibility: "private" | "public"
    } & DefaultSession["user"]
    lastAuthAt?: number
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub: string
    lastAuthAt?: number
    githubLogin?: string | null
    emailVisibility?: "private" | "public"
  }
}
