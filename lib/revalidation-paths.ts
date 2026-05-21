export const PATHS = {
  DRAFT: "/draft",
  REVIEW: "/review",
  FEATURES: "/features",
  FEATURE: (id: string) => `/features/${id}`,
  PROFILE: "/profile",
  HOME: "/",
} as const
