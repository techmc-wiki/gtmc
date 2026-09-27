import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { getOctokit } from "@/lib/github/repos"
import { ProxyAgent, setGlobalDispatcher } from "undici"

// Honor configured proxies for NextAuth's undici requests.
if (process.env.HTTPS_PROXY || process.env.http_proxy) {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.http_proxy
  if (proxyUrl) {
    const dispatcher = new ProxyAgent(proxyUrl)
    setGlobalDispatcher(dispatcher)
    console.log(`[NextAuth] Global proxy dispatcher set to: ${proxyUrl}`)
  }
}

const authSecret =
  process.env.NEXTAUTH_SECRET ??
  (process.env.NODE_ENV === "development"
    ? "gtmc-local-dev-auth-secret"
    : undefined)

export const { handlers, auth } = NextAuth({
  secret: authSecret,
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      if (user?.id) {
        token.sub = user.id
      }

      if (account?.provider === "github" && user?.id) {
        try {
          const octokit = getOctokit(account.access_token!)
          const { data: githubUser } = await octokit.users.getAuthenticated()
          token.githubLogin = githubUser.login
          await prisma.user.update({
            where: { id: user.id },
            data: { githubLogin: githubUser.login },
          })
        } catch {
          token.githubLogin = null
        }
      }

      if (trigger === "signIn" || !token.lastAuthAt) {
        token.lastAuthAt = Date.now()
      }

      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub ?? ""
        session.user.githubLogin = (token.githubLogin as string) ?? null
        session.lastAuthAt = token.lastAuthAt
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Only relative and same-origin callbacks are valid; all others use baseUrl.
      if (url.startsWith("/")) return `${baseUrl}${url}`
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
  // A deployed HTTPS AUTH_URL can front an HTTP local development server.
  useSecureCookies: process.env.NODE_ENV !== "development",
  trustHost: true,
  debug: process.env.NODE_ENV === "development",
})
