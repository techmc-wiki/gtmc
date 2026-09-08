import type { Metadata } from "next"
import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/prisma"
import { guardUser } from "@/lib/auth/guards"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/shadcn/button"
import { Input } from "@/components/ui/shadcn/input"
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

  const emailLabel = (
    <EmailLabel
      label={t("emailLabel")}
      readOnlyBadge={t("readOnlyBadge")}
      privateBadge={t("privateBadge")}
      isPrivate={emailVisibility === "private"}
    />
  )

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
            <Avatar className="border-tech-main/60 bg-tech-main/10 ring-tech-main/20 relative box-border flex aspect-square size-24 items-center justify-center overflow-hidden rounded-none border-2 p-1 ring-1 sm:size-32 md:size-40">
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

            <FormField
              htmlFor="profile-image"
              label={t("avatarUrlLabel")}
              className="w-full flex-1">
              <Input
                id="profile-image"
                name="image"
                type="url"
                autoComplete="url"
                aria-describedby="profile-image-hint"
                defaultValue={user.image || ""}
                placeholder="https://..."
              />
              <p
                id="profile-image-hint"
                className="text-muted-foreground text-xs">
                {t("avatarUrlHint")}
              </p>
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:gap-8">
            <FormField htmlFor="profile-name" label={t("usernameLabel")}>
              <Input
                id="profile-name"
                name="name"
                autoComplete="name"
                defaultValue={user.name || ""}
                required
              />
            </FormField>
            <FormField htmlFor="profile-email" label={emailLabel}>
              <Input
                id="profile-email"
                type="email"
                defaultValue={user.email || ""}
                disabled
              />
              {emailVisibility === "private" && (
                <p className="text-muted-foreground text-xs">
                  {t("emailPrivateNotice")}
                </p>
              )}
            </FormField>
          </div>

          <div className="border-tech-main/30 flex flex-col items-start justify-between gap-3 border-b py-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="text-muted-foreground text-sm sm:w-24">
                {t("assignedRole")}
              </span>
              <span className="wrap-break-word">{roleValue}</span>
            </div>
          </div>

          <div className="flex flex-col items-stretch justify-end gap-3 sm:gap-4 md:flex-row md:items-center md:gap-6">
            <SignOutButton className="w-full" />
            <Button type="submit" className="w-full">
              {t("saveButton")}
            </Button>
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
