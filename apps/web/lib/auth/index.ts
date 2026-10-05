import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import { getGithubEmailVisibility } from "@/lib/github/user"
import {
  DEV_FIXTURE_USER,
  isDevFixtureAuthEnabled,
} from "@/lib/auth/dev-fixture-config"
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
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile, trigger }) {
      if (account?.provider === "github") {
        token.sub = account.providerAccountId
        token.githubLogin =
          typeof profile?.login === "string" ? profile.login : null
        token.emailVisibility = await getGithubEmailVisibility(
          account.access_token || ""
        )
      }

      if (
        !/^\d+$/.test(token.sub || "") &&
        !(isDevFixtureAuthEnabled() && token.sub === DEV_FIXTURE_USER.id)
      ) {
        return null
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
        session.user.emailVisibility = token.emailVisibility ?? "private"
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
