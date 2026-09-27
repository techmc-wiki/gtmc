// oxlint-disable-next-line import/no-unassigned-import -- prevents client imports
import "server-only"

import { prisma } from "@/lib/prisma"
import { DEV_FIXTURE_USER } from "@/lib/auth/dev-fixture-config"

export async function ensureDevFixtureUser() {
  return prisma.user.upsert({
    where: { id: DEV_FIXTURE_USER.id },
    create: {
      ...DEV_FIXTURE_USER,
      role: "ADMIN",
    },
    update: {
      name: DEV_FIXTURE_USER.name,
      email: DEV_FIXTURE_USER.email,
      githubLogin: DEV_FIXTURE_USER.githubLogin,
      image: null,
      githubPat: null,
      role: "ADMIN",
    },
  })
}
