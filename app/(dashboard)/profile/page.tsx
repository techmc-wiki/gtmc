import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { BrutalInput } from "@/components/ui/brutal-input"
import { BrutalAvatar } from "@/components/ui/brutal-avatar"
import { updateProfileAction } from "@/actions/profile"
import { SignOutButton } from "@/components/ui/sign-out-button"
import { getGithubEmailVisibility } from "@/lib/github-features"

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

  const account = await prisma.account.findFirst({
    where: { provider: "github", userId: user.id },
  })
  const emailVisibility = await getGithubEmailVisibility(
    account?.access_token || "",
  )

  return (
    <div className="animate-fade-in mx-auto mt-4 max-w-4xl space-y-8 px-4 pb-20 sm:mt-8 sm:space-y-12 sm:px-0">
      <div className="border-tech-main/40 flex flex-col items-start justify-between border-b-2 pb-4 md:flex-row md:items-end">
        <div>
          <p className="text-tech-main/60 tracking-tech-wide mb-2 font-mono text-[10px] uppercase sm:text-xs">
            [ USER_PROFILE_SYS ]
          </p>
          <h1 className="text-tech-main-dark flex items-center gap-2 text-xl font-bold tracking-widest uppercase sm:gap-4 sm:text-2xl md:text-4xl lg:text-5xl">
            <span className="border-tech-main/40 bg-tech-main/5 text-tech-main flex h-8 w-8 shrink-0 items-center justify-center border sm:h-10 sm:w-10">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="sm:h-5 sm:w-5">
                <circle cx="12" cy="8" r="5" />
                <path d="M20 21a8 8 0 0 0-16 0" />
              </svg>
            </span>
            USER_PROFILE
          </h1>
          <p className="text-tech-main/70 tracking-tech-wide mt-2 flex items-center gap-2 font-mono text-[10px] sm:mt-3 sm:text-sm">
            <span className="bg-tech-main h-1 w-1 animate-pulse sm:h-1.5 sm:w-1.5"></span>
            CONFIG // IDENTITY // TOKENS
          </p>
        </div>
        <div className="text-tech-main/50 tracking-tech-wide mt-4 font-mono text-[9px] uppercase sm:text-xs md:mt-0">
          SYS.STATE ::{" "}
          <span className="text-tech-main-dark font-bold">
            ACTIVE *
          </span>
        </div>
      </div>

      <div className="border-tech-main/40 relative w-full border bg-white/60 shadow-sm backdrop-blur-md">
        <div className="bg-tech-main/5 border-tech-main/20 text-tech-main/60 absolute top-0 right-0 border-b border-l px-2 py-1 font-mono text-[9px] tracking-widest sm:text-[10px]">
          CONFIG.PANEL_V2
        </div>
        {/* 角落刻度 */}
        <div className="border-tech-main absolute top-0 left-0 h-2 w-2 -translate-x-0.5 -translate-y-0.5 border-t-2 border-l-2"></div>
        <div className="border-tech-main absolute right-0 bottom-0 h-2 w-2 translate-x-0.5 translate-y-0.5 border-r-2 border-b-2"></div>

        <form
          action={updateProfileAction}
          className="relative z-10 space-y-6 p-4 sm:space-y-8 sm:p-6 md:space-y-10 md:p-8 lg:p-12">
          <div className="flex flex-col items-start gap-4 sm:gap-6 md:gap-8">
            <div className="border-tech-main/30 bg-tech-main/5 relative h-24 w-24 shrink-0 border p-1 sm:h-32 sm:w-32 md:h-40 md:w-40">
              <div className="bg-tech-main absolute -top-1 -left-1 h-2 w-2"></div>
              <div className="bg-tech-main absolute -right-1 -bottom-1 h-2 w-2"></div>
              <BrutalAvatar
                src={user.image}
                alt={user.name}
                size="lg"
                className="h-full w-full rounded-none"
              />
            </div>

            <div className="w-full flex-1 space-y-3 sm:space-y-4">
              <label className="text-tech-main-dark border-tech-main tracking-tech-wide block border-l-2 pl-2.5 font-mono text-[10px] font-bold uppercase sm:text-xs">
                AVATAR URL
              </label>
              <BrutalInput
                name="image"
                defaultValue={user.image || ""}
                placeholder="https://..."
                className="border-tech-main/30 focus:border-tech-main w-full rounded-none border bg-white font-mono text-xs shadow-none transition-colors sm:text-sm"
              />
              <p className="text-tech-main/60 border-tech-main/30 border-l pl-2 font-mono text-[9px] tracking-widest uppercase sm:text-[10px]">
                {">"} REQUIRED: DIRECT IMAGE LINK (.PNG/.JPG/.GIF)
              </p>
            </div>
          </div>

          <div className="border-tech-main/30 flex justify-end border-b border-dashed pb-2">
            <span className="text-tech-main/50 font-mono text-[9px] tracking-widest sm:text-[10px]">
              SEC_1_IDENTITY
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:gap-8">
            <div className="space-y-3 sm:space-y-4">
              <label className="text-tech-main-dark border-tech-main tracking-tech-wide block border-l-2 pl-2.5 font-mono text-[10px] font-bold uppercase sm:text-xs">
                USERNAME
              </label>
              <BrutalInput
                name="name"
                defaultValue={user.name || ""}
                required
                className="border-tech-main/30 focus:border-tech-main w-full rounded-none border bg-white font-mono text-xs shadow-none transition-colors sm:text-sm"
              />
            </div>
            <div className="space-y-3 sm:space-y-4">
              <label className="text-tech-main/60 border-tech-main/40 tracking-tech-wide flex items-center gap-2 border-l-2 pl-2.5 font-mono text-[10px] font-bold uppercase sm:text-xs">
                EMAIL{" "}
                <span className="border-tech-main/30 bg-tech-main/5 text-tech-main/60 border px-1 text-[8px] sm:text-[9px]">
                  RO
                </span>
                {emailVisibility === "private" && (
                  <span className="border border-amber-400/60 bg-amber-50 px-1 text-[8px] text-amber-600 sm:text-[9px]">
                    PRIVATE
                  </span>
                )}
              </label>
              <BrutalInput
                defaultValue={user.email || ""}
                disabled
                className="border-tech-main/20 bg-tech-main/5 text-tech-main/60 w-full cursor-not-allowed rounded-none border font-mono text-xs tracking-wide shadow-none sm:text-sm"
              />
              {emailVisibility === "private" && (
                <p className="border-l border-amber-400/40 pl-2 font-mono text-[9px] tracking-widest text-amber-600/70 uppercase sm:text-[10px]">
                  {">"} YOUR GITHUB PRIMARY EMAIL VISIBILITY IS SET TO
                  PRIVATE
                </p>
              )}
            </div>
          </div>

          <div className="bg-tech-main/5 border-tech-main/30 relative mt-6 flex flex-col items-start justify-between gap-3 border p-3 sm:mt-8 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
            <div className="bg-tech-main/20 absolute top-0 right-0 h-2 w-2"></div>
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="text-tech-main/60 font-mono text-[9px] tracking-widest uppercase sm:text-[10px]">
                ASSIGNED ROLE:
              </span>
              <span className="text-tech-main-dark font-mono text-xs font-bold tracking-widest uppercase sm:text-sm">
                [{user.role}]
              </span>
            </div>
          </div>

          <div className="border-tech-main/30 flex justify-start border-b border-dashed pt-4 pb-2">
            <span className="text-tech-main/50 font-mono text-[9px] tracking-widest sm:text-[10px]">
              SEC_2_CREDENTIALS
            </span>
          </div>

          {user.role === "ADMIN" && (
            <div className="relative mt-6 space-y-4 border border-red-300 bg-red-50/50 p-4 sm:mt-8 sm:space-y-6 sm:p-6 md:p-8">
              <div className="absolute top-0 right-0 flex items-center gap-2 border-b border-l border-red-300 bg-red-500/10 px-2 py-1 font-mono text-[9px] text-red-600/80 sm:px-3 sm:text-[10px]">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                ADMIN.SECURE.ZONE
              </div>

              <div className="pt-2">
                <h3 className="mb-2 border-l-2 border-red-400 pl-2.5 text-xs font-bold tracking-widest text-red-600/80 uppercase sm:text-sm">
                  GITHUB PAT TOKEN
                </h3>
                <p className="text-tech-main-dark mt-2 font-mono text-[10px] tracking-wide sm:text-[11px]">
                  Store your GitHub Personal Access Token to enable PR
                  automation.
                </p>
                <p className="mt-1 font-mono text-[9px] tracking-widest text-red-500/60 uppercase sm:text-[10px]">
                  {"//"} REQUIRED SCOPES: &apos;repo&apos;,
                  &apos;workflow&apos;
                </p>
              </div>
              <BrutalInput
                name="githubPat"
                type="password"
                placeholder="********-********-********"
                defaultValue={user.githubPat || ""}
                className="w-full rounded-none border border-red-200 bg-white text-center font-mono text-xs tracking-[0.3em] text-red-600/80 shadow-none focus:border-red-400 sm:text-sm"
              />
            </div>
          )}

          <div className="bg-tech-main/30 my-6 h-px w-full sm:my-8"></div>

          <div className="flex flex-col items-stretch justify-end gap-3 sm:gap-4 md:flex-row md:items-center md:gap-6">
            <SignOutButton className="bg-tech-main/10 hover:bg-tech-main text-tech-main border-tech-main/40 relative flex min-h-11 w-full items-center justify-center border px-4 py-2.5 font-mono text-xs font-bold tracking-widest uppercase transition-colors hover:text-white sm:px-6 sm:py-3 md:px-8" />
            <button
              type="submit"
              className="bg-tech-main/10 hover:bg-tech-main text-tech-main border-tech-main/40 relative flex min-h-11 w-full cursor-pointer items-center justify-center border px-4 py-2.5 font-mono text-xs font-bold tracking-widest uppercase transition-colors hover:text-white sm:px-6 sm:py-3 md:px-8">
              SAVE_CONFIG
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
