import type { DefaultSession, DefaultUser } from "next-auth"
// eslint-disable-next-line import/no-unassigned-import
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      githubLogin: string | null
    } & DefaultSession["user"]
    lastAuthAt?: number
  }

  interface User extends DefaultUser {
    id: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub: string
    lastAuthAt?: number
    githubLogin?: string | null
  }
}
