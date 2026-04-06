import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { ProxyAgent, setGlobalDispatcher } from "undici"

// Allow NextAuth to proxy requests when running in local development (useful in mainland China)
if (process.env.HTTPS_PROXY || process.env.http_proxy) {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.http_proxy
  if (proxyUrl) {
    const dispatcher = new ProxyAgent(proxyUrl)
    setGlobalDispatcher(dispatcher)
    console.log(`[NextAuth] Global proxy dispatcher set to: ${proxyUrl}`)
  }
}

const authSecret =
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  (process.env.NODE_ENV === "development"
    ? "gtmc-local-dev-auth-secret"
    : undefined)

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user?.id) {
        token.sub = user.id
      }

      if (trigger === "signIn" || !token.lastAuthAt) {
        token.lastAuthAt = Date.now()
      }

      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub ?? ""
        session.lastAuthAt = token.lastAuthAt
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  debug: process.env.NODE_ENV === "development",
})
