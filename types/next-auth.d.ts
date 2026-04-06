// 这是一个模块补充 (Module Augmentation)
// 用于给 NextAuth 默认的 Session 和 User 类型增加自定义字段 (id)

import { DefaultSession, DefaultUser } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
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
  }
}
