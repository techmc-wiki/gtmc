// 这是一个模块补充 (Module Augmentation)
// 用于给 NextAuth 默认的 Session 和 User 类型增加自定义字段 (role, id)

import { DefaultSession, DefaultUser } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role?: string
      githubPat?: string
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    role?: string
    githubPat?: string
  }
}
