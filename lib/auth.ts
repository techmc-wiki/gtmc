import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { ProxyAgent, setGlobalDispatcher } from "undici";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

// Allow NextAuth to proxy requests when running in local development (useful in mainland China)
if (process.env.HTTPS_PROXY || process.env.http_proxy) {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.http_proxy;
  if (proxyUrl) {
    const dispatcher = new ProxyAgent(proxyUrl);
    setGlobalDispatcher(dispatcher);
    console.log(`[NextAuth] Global proxy dispatcher set to: ${proxyUrl}`);
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session?.user && user) {
        session.user.id = user.id;
        session.user.role = (user as { role?: string }).role || "USER";
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "database",
  },
  trustHost: true,
  debug: process.env.NODE_ENV === "development",
});
