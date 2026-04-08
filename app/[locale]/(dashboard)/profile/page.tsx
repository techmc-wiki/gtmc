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
import { MetadataRow } from "../features/[id]/metadata-row"
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
    <div
      className="
        page-container mt-4 animate-fade-in
        sm:mt-8
      ">
      <div
        className="
          flex flex-col items-start justify-between border-b-2
          border-tech-main/40 pb-4
          md:flex-row md:items-end
        ">
        <div>
          <p
            className="
              mb-2 font-mono text-[0.625rem] tracking-tech-wide text-tech-main/60
              uppercase
              sm:text-xs
            ">
            [ USER_PROFILE_SYS ]
          </p>
          <h1
            className="
              flex items-center gap-2 text-xl font-bold tracking-widest
              text-tech-main-dark uppercase
              sm:gap-4 sm:text-2xl
              md:text-4xl
              lg:text-5xl
            ">
            <span
              className="
                flex size-8 shrink-0 items-center justify-center border
                border-tech-main/40 bg-tech-main/5 text-tech-main
                sm:size-10
              ">
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
          <p
            className="
              mt-2 flex items-center gap-2 font-mono text-[0.625rem]
              tracking-tech-wide text-tech-main/70
              sm:mt-3 sm:text-sm
            ">
            <StatusDot size="sm" />
            {"CONFIG // IDENTITY // TOKENS"}
          </p>
        </div>
        <div
          className="
            mt-4 font-mono text-[0.5625rem] tracking-tech-wide text-tech-main/50
            uppercase
            sm:text-xs
            md:mt-0
          ">
          SYS.STATE ::{" "}
          <span className="font-bold text-tech-main-dark">ACTIVE *</span>
        </div>
      </div>

      <div
        className="
          relative w-full border border-tech-main/40 bg-white/60 shadow-sm
          backdrop-blur-md
        ">
        <div
          className="
            absolute top-0 right-0 border-b border-l guide-line bg-tech-main/5
            px-2 py-1 font-mono text-[0.5625rem] tracking-widest text-tech-main/60
            sm:text-[0.625rem]
          ">
          CONFIG.PANEL_V2
        </div>
        {/* 角落刻度 */}
        <div
          className="
            absolute top-0 left-0 size-2 -translate-0.5 border-t-2 border-l-2
            border-tech-main
          "
        />
        <div
          className="
            absolute right-0 bottom-0 size-2 translate-0.5 border-r-2 border-b-2
            border-tech-main
          "
        />

        <form
          action={updateProfileAction}
          className="
            relative z-10 space-y-6 p-4
            sm:space-y-8 sm:p-6
            md:space-y-10 md:p-8
            lg:p-12
          ">
          <div
            className="
              flex flex-col items-start gap-4
              sm:gap-6
              md:gap-8
            ">
            <div
              className="
                relative size-24 shrink-0 border border-tech-main/30
                bg-tech-main/5 p-1
                sm:size-32
                md:size-40
              ">
              <div className="absolute -top-1 -left-1 size-2 bg-tech-main" />
              <div className="absolute -right-1 -bottom-1 size-2 bg-tech-main" />
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
                className="
                  w-full rounded-none border border-tech-main/30 bg-white
                  font-mono text-xs shadow-none transition-colors
                  focus:border-tech-main
                  sm:text-sm
                "
              />
              <p
                className="
                  border-l border-tech-main/30 pl-2 font-mono text-[0.5625rem]
                  tracking-widest text-tech-main/60 uppercase
                  sm:text-[0.625rem]
                ">
                {">"} {t("avatarUrlHint")}
              </p>
            </FormField>
          </div>

          <div
            className="
              flex justify-end border-b border-dashed border-tech-main/30 pb-2
            ">
            <span
              className="
                font-mono text-[0.5625rem] tracking-widest text-tech-main/50
                sm:text-[0.625rem]
              ">
              SEC_1_IDENTITY
            </span>
          </div>

          <div
            className="
              grid grid-cols-1 gap-4
              sm:gap-6
              md:gap-8
            ">
            <FormField label={t("usernameLabel")}>
              <InputBox
                name="name"
                defaultValue={user.name || ""}
                required
                className="
                  w-full rounded-none border border-tech-main/30 bg-white
                  font-mono text-xs shadow-none transition-colors
                  focus:border-tech-main
                  sm:text-sm
                "
              />
            </FormField>
            <FormField
              label={
                <span className="flex items-center gap-2">
                  {t("emailLabel")}{" "}
                  <span
                    className="
                      border border-tech-main/30 bg-tech-main/5 px-1 text-[0.5rem]
                      text-tech-main/60
                      sm:text-[0.5625rem]
                    ">
                    {t("readOnlyBadge")}
                  </span>
                  {emailVisibility === "private" && (
                    <span
                      className="
                        border border-amber-400/60 bg-amber-50 px-1 text-[0.5rem]
                        text-amber-600
                        sm:text-[0.5625rem]
                      ">
                      {t("privateBadge")}
                    </span>
                  )}
                </span>
              }>
              <InputBox
                defaultValue={user.email || ""}
                disabled
                className="
                  w-full cursor-not-allowed rounded-none border guide-line
                  bg-tech-main/5 font-mono text-xs tracking-wide
                  text-tech-main/60 shadow-none
                  sm:text-sm
                "
              />
              {emailVisibility === "private" && (
                <p
                  className="
                    border-l border-amber-400/40 pl-2 font-mono text-[0.5625rem]
                    tracking-widest text-amber-600/70 uppercase
                    sm:text-[0.625rem]
                  ">
                  {">"} {t("emailPrivateNotice")}
                </p>
              )}
            </FormField>
          </div>

          <div
            className="
              relative mt-6 flex flex-col items-start justify-between gap-3
              border border-tech-main/30 bg-tech-main/5 p-3
              sm:mt-8 sm:flex-row sm:items-center sm:gap-4 sm:p-4
            ">
            <div className="absolute top-0 right-0 size-2 bg-tech-main/20" />
            <MetadataRow
              label={t("assignedRole")}
              value={
                <span
                  className="
                    font-mono text-xs font-bold tracking-widest
                    text-tech-main-dark uppercase
                    sm:text-sm
                  ">
                  [{user.role}]
                </span>
              }
            />
          </div>

          <div
            className="
              flex justify-start border-b border-dashed border-tech-main/30 pt-4
              pb-2
            ">
            <span
              className="
                font-mono text-[0.5625rem] tracking-widest text-tech-main/50
                sm:text-[0.625rem]
              ">
              SEC_2_CREDENTIALS
            </span>
          </div>

          <div
            className="
              my-6 h-px w-full bg-tech-main/30
              sm:my-8
            "
          />

          <div
            className="
              flex flex-col items-stretch justify-end gap-3
              sm:gap-4
              md:flex-row md:items-center md:gap-6
            ">
            <SignOutButton
              className="
                relative flex min-h-11 w-full items-center justify-center border
                border-tech-main/40 bg-tech-main/10 px-4 py-2.5 font-mono
                text-xs font-bold tracking-widest text-tech-main uppercase
                transition-colors
                hover:bg-tech-main hover:text-white
                sm:px-6 sm:py-3
                md:px-8
              "
            />
            <button
              type="submit"
              className="
                relative flex min-h-11 w-full cursor-pointer items-center
                justify-center border border-tech-main/40 bg-tech-main/10 px-4
                py-2.5 font-mono text-xs font-bold tracking-widest
                text-tech-main uppercase transition-colors
                hover:bg-tech-main hover:text-white
                sm:px-6 sm:py-3
                md:px-8
              ">
              {t("saveButton")}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
