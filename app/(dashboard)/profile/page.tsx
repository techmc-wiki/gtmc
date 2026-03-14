import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BrutalInput } from "@/components/ui/brutal-input";
import { BrutalAvatar } from "@/components/ui/brutal-avatar";
import { updateProfileAction } from "@/actions/profile";
import { SignOutButton } from "@/components/ui/sign-out-button";
import { getGithubEmailVisibility } from "@/lib/github-features";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    redirect("/login");
  }

  const account = await prisma.account.findFirst({
    where: { provider: "github", userId: user.id },
  });
  const emailVisibility = await getGithubEmailVisibility(account?.access_token || "");

  return (
    <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12 pb-20 mt-4 sm:mt-8 px-4 sm:px-0 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-tech-main/40 pb-4">
        <div>
          <p className="text-[10px] sm:text-xs font-mono tracking-[0.2em] text-tech-main/60 mb-2 uppercase">
            [ USER_PROFILE_SYS ]
          </p>
          <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold uppercase tracking-widest text-tech-main-dark flex items-center gap-2 sm:gap-4">
            <span className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center border border-tech-main/40 bg-tech-main/5 text-tech-main shrink-0">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="sm:w-5 sm:h-5"
              >
                <circle cx="12" cy="8" r="5" />
                <path d="M20 21a8 8 0 0 0-16 0" />
              </svg>
            </span>
            USER_PROFILE
          </h1>
          <p className="text-[10px] sm:text-sm font-mono tracking-[0.2em] mt-2 sm:mt-3 text-tech-main/70 flex items-center gap-2">
            <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-tech-main animate-pulse"></span>
            CONFIG // IDENTITY // TOKENS
          </p>
        </div>
        <div className="font-mono text-[9px] sm:text-xs text-tech-main/50 mt-4 md:mt-0 tracking-[0.2em] uppercase">
          SYS.STATE :: <span className="text-tech-main-dark font-bold">ACTIVE *</span>
        </div>
      </div>

      <div className="border border-tech-main/40 bg-white/60 backdrop-blur-md relative w-full shadow-sm">
        <div className="absolute top-0 right-0 py-1 px-2 text-[9px] sm:text-[10px] font-mono tracking-widest bg-tech-main/5 border-b border-l border-tech-main/20 text-tech-main/60">
          CONFIG.PANEL_V2
        </div>
        {/* 角落刻度 */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-tech-main -translate-x-[2px] -translate-y-[2px]"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-tech-main translate-x-[2px] translate-y-[2px]"></div>

        <form
          action={updateProfileAction}
          className="p-4 sm:p-6 md:p-8 lg:p-12 space-y-6 sm:space-y-8 md:space-y-10 relative z-10"
        >
          <div className="flex flex-col gap-4 sm:gap-6 md:gap-8 items-start">
            <div className="relative p-1 border border-tech-main/30 w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 shrink-0 bg-tech-main/5">
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-tech-main"></div>
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-tech-main"></div>
              <BrutalAvatar
                src={user.image}
                alt={user.name}
                size="lg"
                className="w-full h-full rounded-none"
              />
            </div>

            <div className="flex-1 space-y-3 sm:space-y-4 w-full">
              <label className="block text-[10px] sm:text-xs font-mono tracking-[0.2em] text-tech-main-dark font-bold border-l-2 border-tech-main pl-2.5 uppercase">
                AVATAR URL
              </label>
              <BrutalInput
                name="image"
                defaultValue={user.image || ""}
                placeholder="https://..."
                className="font-mono text-xs sm:text-sm border border-tech-main/30 bg-white focus:border-tech-main shadow-none transition-colors w-full rounded-none"
              />
              <p className="text-[9px] sm:text-[10px] text-tech-main/60 font-mono uppercase tracking-widest border-l border-tech-main/30 pl-2">
                {">"} REQUIRED: DIRECT IMAGE LINK (.PNG/.JPG/.GIF)
              </p>
            </div>
          </div>

          <div className="flex justify-end border-b border-dashed border-tech-main/30 pb-2">
            <span className="text-[9px] sm:text-[10px] font-mono tracking-widest text-tech-main/50">
              SEC_1_IDENTITY
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:gap-8">
            <div className="space-y-3 sm:space-y-4">
              <label className="block text-[10px] sm:text-xs font-mono tracking-[0.2em] text-tech-main-dark font-bold border-l-2 border-tech-main pl-2.5 uppercase">
                USERNAME
              </label>
              <BrutalInput
                name="name"
                defaultValue={user.name || ""}
                required
                className="font-mono text-xs sm:text-sm border border-tech-main/30 bg-white focus:border-tech-main shadow-none transition-colors w-full rounded-none"
              />
            </div>
            <div className="space-y-3 sm:space-y-4">
              <label className="flex items-center gap-2 text-[10px] sm:text-xs font-mono tracking-[0.2em] text-tech-main/60 font-bold border-l-2 border-tech-main/40 pl-2.5 uppercase">
                EMAIL{" "}
                <span className="border border-tech-main/30 px-1 text-[8px] sm:text-[9px] bg-tech-main/5 text-tech-main/60">
                  RO
                </span>
                {emailVisibility === "private" && (
                  <span className="border border-amber-400/60 px-1 text-[8px] sm:text-[9px] bg-amber-50 text-amber-600">
                    PRIVATE
                  </span>
                )}
              </label>
              <BrutalInput
                defaultValue={user.email || ""}
                disabled
                className="font-mono text-xs sm:text-sm border border-tech-main/20 bg-tech-main/5 text-tech-main/60 shadow-none cursor-not-allowed w-full rounded-none tracking-wide"
              />
              {emailVisibility === "private" && (
                <p className="text-[9px] sm:text-[10px] text-amber-600/70 font-mono uppercase tracking-widest border-l border-amber-400/40 pl-2">
                  {">"} YOUR GITHUB PRIMARY EMAIL VISIBILITY IS SET TO PRIVATE
                </p>
              )}
            </div>
          </div>

          <div className="bg-tech-main/5 border border-tech-main/30 p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 justify-between mt-6 sm:mt-8 relative">
            <div className="absolute top-0 right-0 w-2 h-2 bg-tech-main/20"></div>
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="text-[9px] sm:text-[10px] font-mono tracking-widest text-tech-main/60 uppercase">
                ASSIGNED ROLE:
              </span>
              <span className="text-xs sm:text-sm font-bold font-mono tracking-widest text-tech-main-dark uppercase">
                [{user.role}]
              </span>
            </div>
          </div>

          <div className="flex justify-start border-b border-dashed border-tech-main/30 pb-2 pt-4">
            <span className="text-[9px] sm:text-[10px] font-mono tracking-widest text-tech-main/50">
              SEC_2_CREDENTIALS
            </span>
          </div>

          {user.role === "ADMIN" && (
            <div className="space-y-4 sm:space-y-6 bg-red-50/50 p-4 sm:p-6 md:p-8 border border-red-300 relative mt-6 sm:mt-8">
              <div className="absolute top-0 right-0 bg-red-500/10 text-red-600/80 text-[9px] sm:text-[10px] font-mono px-2 sm:px-3 py-1 flex items-center gap-2 border-b border-l border-red-300">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                ADMIN.SECURE.ZONE
              </div>

              <div className="pt-2">
                <h3 className="text-xs sm:text-sm font-bold text-red-600/80 tracking-widest border-l-2 border-red-400 pl-2.5 uppercase mb-2">
                  GITHUB PAT TOKEN
                </h3>
                <p className="text-[10px] sm:text-[11px] font-mono text-tech-main-dark mt-2 tracking-wide">
                  Store your GitHub Personal Access Token to enable PR automation.
                </p>
                <p className="text-[9px] sm:text-[10px] font-mono text-red-500/60 mt-1 uppercase tracking-widest">
                  {"//"} REQUIRED SCOPES: 'repo', 'workflow'
                </p>
              </div>
              <BrutalInput
                name="githubPat"
                type="password"
                placeholder="********-********-********"
                defaultValue={user.githubPat || ""}
                className="font-mono text-xs sm:text-sm border border-red-200 bg-white text-center tracking-[0.3em] focus:border-red-400 text-red-600/80 w-full rounded-none shadow-none"
              />
            </div>
          )}

          <div className="w-full h-[1px] bg-tech-main/30 my-6 sm:my-8"></div>

          <div className="flex flex-col gap-3 sm:gap-4 md:gap-6">
            <div className="w-full text-left">
              <SignOutButton className="!text-tech-main/80 hover:!text-red-500 font-mono text-xs uppercase tracking-widest transition-colors flex items-center gap-2 before:content-['<'] after:content-['>'] min-h-[44px] sm:min-h-auto" />
            </div>
            <button
              type="submit"
              className="w-full bg-tech-main/10 hover:bg-tech-main text-tech-main hover:text-white border border-tech-main/40 px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 font-mono text-xs font-bold tracking-widest uppercase transition-colors relative min-h-[44px] flex items-center justify-center"
            >
              SAVE_CONFIG
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
