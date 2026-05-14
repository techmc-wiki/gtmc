import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { InputBox } from "@/components/ui/input-box"
import { UesrAvatar } from "@/components/ui/user-avatar"
import { updateProfileAction } from "@/actions/profile"
import { SignOutButton } from "@/components/ui/sign-out-button"
import { getGithubEmailVisibility } from "@/lib/github"
import { FormField } from "./form-field"
import { MetadataRow } from "@/components/ui/metadata-row"
import { StatusDot } from "@/components/ui/status-dot"

export const metadata: Metadata = {
  title: "User Profile",
  description: "Your GTMC account settings and profile management.",
  robots: { index: false, follow: false },
}

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

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

  return (
    <div className="page-container animate-fade-in mt-4 sm:mt-8">
      <div className="border-tech-main/40 flex flex-col items-start justify-between border-b-2 pb-4 md:flex-row md:items-end">
        <div>
          <p className="tracking-tech-wide text-tech-main/60 mb-2 font-mono text-[0.625rem] uppercase sm:text-xs">
            [ USER_PROFILE_SYS ]
          </p>
          <h1 className="text-tech-main-dark flex items-center gap-2 text-xl font-bold tracking-widest uppercase sm:gap-4 sm:text-2xl md:text-4xl lg:text-5xl">
            <span className="border-tech-main/40 bg-tech-main/5 text-tech-main flex size-8 shrink-0 items-center justify-center border sm:size-10">
              <svg
                aria-hidden="true"
                focusable="false"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="sm:size-5">
                <circle cx="12" cy="8" r="5" />
                <path d="M20 21a8 8 0 0 0-16 0" />
              </svg>
            </span>
            USER_PROFILE
          </h1>
          <p className="tracking-tech-wide text-tech-main/70 mt-2 flex items-center gap-2 font-mono text-[0.625rem] sm:mt-3 sm:text-sm">
            <StatusDot size="sm" />
            {"CONFIG // IDENTITY // TOKENS"}
          </p>
        </div>
        <div className="tracking-tech-wide text-tech-main/50 mt-4 font-mono text-[0.5625rem] uppercase sm:text-xs md:mt-0">
          SYS.STATE ::{" "}
          <span className="text-tech-main-dark font-bold">ACTIVE *</span>
        </div>
      </div>

      <div className="border-tech-main/40 relative w-full border bg-white/60 shadow-sm backdrop-blur-md">
        <div className="guide-line bg-tech-main/5 text-tech-main/60 absolute top-0 right-0 border-b border-l px-2 py-1 font-mono text-[0.5625rem] tracking-widest sm:text-[0.625rem]">
          CONFIG.PANEL_V2
        </div>
        {/* 角落刻度 */}
        <div className="border-tech-main absolute top-0 left-0 size-2 -translate-0.5 border-t-2 border-l-2" />
        <div className="border-tech-main absolute right-0 bottom-0 size-2 translate-0.5 border-r-2 border-b-2" />

        <form
          action={updateProfileAction}
          className="relative z-10 space-y-6 p-4 sm:space-y-8 sm:p-6 md:space-y-10 md:p-8 lg:p-12">
          <div className="flex flex-col items-start gap-4 sm:gap-6 md:gap-8">
            <div className="border-tech-main/30 bg-tech-main/5 relative size-24 shrink-0 border p-1 sm:size-32 md:size-40">
              <div className="bg-tech-main absolute -top-1 -left-1 size-2" />
              <div className="bg-tech-main absolute -right-1 -bottom-1 size-2" />
              <UesrAvatar
                src={user.image}
                alt={user.name}
                size="lg"
                className="size-full rounded-none"
              />
            </div>

            <FormField label={t("avatarUrlLabel")} className="w-full flex-1">
              <InputBox
                name="image"
                defaultValue={user.image || ""}
                placeholder="https://..."
                className="border-tech-main/30 focus:border-tech-main w-full rounded-none border bg-white font-mono text-xs shadow-none transition-colors sm:text-sm"
              />
              <p className="border-tech-main/30 text-tech-main/60 border-l pl-2 font-mono text-[0.5625rem] tracking-widest uppercase sm:text-[0.625rem]">
                {">"} {t("avatarUrlHint")}
              </p>
            </FormField>
          </div>

          <div className="border-tech-main/30 flex justify-end border-b border-dashed pb-2">
            <span className="text-tech-main/50 font-mono text-[0.5625rem] tracking-widest sm:text-[0.625rem]">
              SEC_1_IDENTITY
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:gap-8">
            <FormField label={t("usernameLabel")}>
              <InputBox
                name="name"
                defaultValue={user.name || ""}
                required
                className="border-tech-main/30 focus:border-tech-main w-full rounded-none border bg-white font-mono text-xs shadow-none transition-colors sm:text-sm"
              />
            </FormField>
            <FormField
              label={
                <span className="flex items-center gap-2">
                  {t("emailLabel")}{" "}
                  <span className="border-tech-main/30 bg-tech-main/5 text-tech-main/60 border px-1 text-[0.5rem] sm:text-[0.5625rem]">
                    {t("readOnlyBadge")}
                  </span>
                  {emailVisibility === "private" && (
                    <span className="border border-amber-400/60 bg-amber-50 px-1 text-[0.5rem] text-amber-600 sm:text-[0.5625rem]">
                      {t("privateBadge")}
                    </span>
                  )}
                </span>
              }>
              <InputBox
                defaultValue={user.email || ""}
                disabled
                className="guide-line bg-tech-main/5 text-tech-main/60 w-full cursor-not-allowed rounded-none border font-mono text-xs tracking-wide shadow-none sm:text-sm"
              />
              {emailVisibility === "private" && (
                <p className="border-l border-amber-400/40 pl-2 font-mono text-[0.5625rem] tracking-widest text-amber-600/70 uppercase sm:text-[0.625rem]">
                  {">"} {t("emailPrivateNotice")}
                </p>
              )}
            </FormField>
          </div>

          <div className="border-tech-main/30 bg-tech-main/5 relative mt-6 flex flex-col items-start justify-between gap-3 border p-3 sm:mt-8 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
            <div className="bg-tech-main/20 absolute top-0 right-0 size-2" />
            <MetadataRow
              label={t("assignedRole")}
              value={
                <span className="text-tech-main-dark font-mono text-xs font-bold tracking-widest uppercase sm:text-sm">
                  [{user.role}]
                </span>
              }
            />
          </div>

          <div className="border-tech-main/30 flex justify-start border-b border-dashed pt-4 pb-2">
            <span className="text-tech-main/50 font-mono text-[0.5625rem] tracking-widest sm:text-[0.625rem]">
              SEC_2_CREDENTIALS
            </span>
          </div>

          <div className="bg-tech-main/30 my-6 h-px w-full sm:my-8" />

          <div className="flex flex-col items-stretch justify-end gap-3 sm:gap-4 md:flex-row md:items-center md:gap-6">
            <SignOutButton className="border-tech-main/40 bg-tech-main/10 text-tech-main hover:bg-tech-main relative flex min-h-11 w-full items-center justify-center border px-4 py-2.5 font-mono text-xs font-bold tracking-widest uppercase transition-colors hover:text-white sm:px-6 sm:py-3 md:px-8" />
            <button
              type="submit"
              className="border-tech-main/40 bg-tech-main/10 text-tech-main hover:bg-tech-main relative flex min-h-11 w-full cursor-pointer items-center justify-center border px-4 py-2.5 font-mono text-xs font-bold tracking-widest uppercase transition-colors hover:text-white sm:px-6 sm:py-3 md:px-8">
              {t("saveButton")}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
