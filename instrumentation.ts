export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return
  }

  const { isDevFixtureAuthEnabled } =
    await import("@/lib/auth/dev-fixture-config")
  if (!isDevFixtureAuthEnabled()) {
    return
  }

  const { ensureDevFixtureUser } = await import("@/lib/auth/dev-fixture")
  try {
    await ensureDevFixtureUser()
    console.info("[dev-auth] Local fixture session ready for debug@gtmc.local")
  } catch {
    console.warn(
      "[dev-auth] Fixture user was not seeded; check that DATABASE_URL is reachable."
    )
  }
}
