import type { Metadata } from "next"
import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/prisma"
import { guardUser } from "@/lib/auth/guards"
import { redirect } from "next/navigation"
import { Input } from "@/components/ui/shadcn/input"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/shadcn/avatar"
import { updateProfileAction } from "@/actions/profile"
import { SignOutButton } from "@/components/ui/sign-out-button"
import { getGithubEmailVisibility } from "@/lib/github"
import { FormField } from "./form-field"

export const metadata: Metadata = {
  title: "User Profile",
  description: "Your GTMC account settings and profile management.",
  robots: { index: false, follow: false },
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await guardUser(locale, `/${locale}/profile`)

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  if (!user) {
    redirect("/login")
  }

  const t = await getTranslations("Profile")

  const account = await prisma.account.findFirst({
    where: { provider: "github", userId: user.id },
  })
  const emailVisibility = await getGithubEmailVisibility(
    account?.access_token || ""
  )

  // oxlint-disable-next-line react-perf/jsx-no-jsx-as-prop -- server component, no re-renders
  const emailLabel = (
    <EmailLabel
      label={t("emailLabel")}
      readOnlyBadge={t("readOnlyBadge")}
      privateBadge={t("privateBadge")}
      isPrivate={emailVisibility === "private"}
    />
  )

  // oxlint-disable-next-line react-perf/jsx-no-jsx-as-prop -- server component, no re-renders
  const roleValue = <RoleValue role={user.role} />

  return (
    <div className="page-container animate-fade-in mt-4 sm:mt-8">
      <div className="border-tech-main/40 border-b-2 pb-4">
        <h1 className="display-title text-tech-main-dark text-3xl md:text-5xl">
          {t("pageTitle")}
        </h1>
      </div>

      <div className="border-tech-main/40 bg-surface-overlay/60 w-full border">
        <form
          action={
            updateProfileAction as unknown as (formData: FormData) => void
          }
          className="space-y-8 p-4 sm:p-6 md:p-8 lg:p-12">
          <div className="flex flex-col items-start gap-4 sm:gap-6 md:gap-8">
            <Avatar className="border-tech-main/60 bg-tech-main/10 ring-tech-main/20 relative box-border flex aspect-square size-24 size-full items-center justify-center overflow-hidden rounded-none border-2 p-1 ring-1 sm:size-32 md:size-40">
              <CornerBrackets
                className="pointer-events-none absolute inset-0 z-10"
                size="size-2"
                color="border-tech-main/70"
              />
              {user.image ? (
                <AvatarImage asChild src={user.image}>
                  <Image
                    src={user.image}
                    alt={user.name || "Avatar"}
                    fill
                    sizes="(max-width: 640px) 96px, (max-width: 768px) 128px, 160px"
                    loading="lazy"
                    className="object-cover"
                  />
                </AvatarImage>
              ) : (
                <AvatarFallback className="text-tech-main/50 bg-transparent font-mono text-xl font-bold tracking-widest uppercase">
                  {(user.name || "?")[0]}
                </AvatarFallback>
              )}
            </Avatar>

            <FormField label={t("avatarUrlLabel")} className="w-full flex-1">
              <Input
                name="image"
                defaultValue={user.image || ""}
                placeholder="https://..."
                className="border-tech-main/30 focus:border-tech-main bg-surface-input w-full rounded-none border font-mono text-xs shadow-none transition-colors sm:text-sm"
              />
              <p className="text-tech-main/60 text-xs">{t("avatarUrlHint")}</p>
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:gap-8">
            <FormField label={t("usernameLabel")}>
              <Input
                name="name"
                defaultValue={user.name || ""}
                required
                className="border-tech-main/30 focus:border-tech-main bg-surface-input w-full rounded-none border font-mono text-xs shadow-none transition-colors sm:text-sm"
              />
            </FormField>
            <FormField label={emailLabel}>
              <Input
                defaultValue={user.email || ""}
                disabled
                className="bg-tech-main/5 text-tech-main/60 w-full cursor-not-allowed rounded-none border font-mono text-xs tracking-wide shadow-none sm:text-sm"
              />
              {emailVisibility === "private" && (
                <p className="border-l border-amber-400/40 pl-2 font-mono text-[0.5625rem] tracking-widest text-amber-600/70 uppercase sm:text-[0.625rem]">
                  {">"} {t("emailPrivateNotice")}
                </p>
              )}
            </FormField>
          </div>

          <div className="border-tech-main/30 flex flex-col items-start justify-between gap-3 border-b py-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="mono-label font-bold text-zinc-500 sm:w-24">
                {t("assignedRole")}
              </span>
              <span className="wrap-break-word">{roleValue}</span>
            </div>
          </div>

          <div className="flex flex-col items-stretch justify-end gap-3 sm:gap-4 md:flex-row md:items-center md:gap-6">
            <SignOutButton className="border-tech-main/40 bg-tech-main/10 text-tech-main hover:bg-tech-main-dark hover:text-tech-bg relative flex min-h-11 w-full items-center justify-center border px-4 py-2.5 font-mono text-xs font-bold tracking-widest uppercase transition-colors sm:px-6 sm:py-3 md:px-8" />
            <button
              type="submit"
              className="border-tech-main/40 bg-tech-main/10 text-tech-main hover:bg-tech-main-dark hover:text-tech-bg relative flex min-h-11 w-full cursor-pointer items-center justify-center border px-4 py-2.5 font-mono text-xs font-bold tracking-widest uppercase transition-colors sm:px-6 sm:py-3 md:px-8">
              {t("saveButton")}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EmailLabel({
  label,
  readOnlyBadge,
  privateBadge,
  isPrivate,
}: {
  label: string
  readOnlyBadge: string
  privateBadge: string
  isPrivate: boolean
}) {
  return (
    <span className="flex items-center gap-2">
      {label}{" "}
      <span className="border-tech-main/30 bg-tech-main/5 text-tech-main/60 border px-1 text-[0.5rem] sm:text-[0.5625rem]">
        {readOnlyBadge}
      </span>
      {isPrivate && (
        <span className="border border-amber-400/60 bg-amber-50 px-1 text-[0.5rem] text-amber-600 sm:text-[0.5625rem]">
          {privateBadge}
        </span>
      )}
    </span>
  )
}

function RoleValue({ role }: { role: string }) {
  return (
    <span className="text-tech-main-dark font-mono text-xs font-bold tracking-widest uppercase sm:text-sm">
      [{role}]
    </span>
  )
}
