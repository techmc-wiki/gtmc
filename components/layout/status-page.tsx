import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { TechButton } from "@/components/ui/tech-button"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { HideFooter } from "@/components/layout/footer-context"
type StatusPageKind = "unauthorized" | "forbidden" | "not-found"

type StatusPageProps = {
  kind: StatusPageKind
}

const STATUS = {
  unauthorized: {
    code: "401",
    status: "UNAUTHORIZED",
    hud: [
      "AUTH.STATUS :: UNAUTHENTICATED",
      "SESSION.ID :: NULL",
      "CREDENTIALS : MISSING",
    ],
    stack: [
      'Exception in thread "main" java.lang.IllegalStateException',
      "at net.minecraft.server.network.ServerLoginPacketListenerImpl.handleHello (ServerLoginPacketListenerImpl.java:203)",
      "Caused by: AuthenticationException: Failed to verify login session with Mojang servers",
    ],
    hex: [
      "00000000: 3430 3120 554e 4155 5448 4f52 495a 4544 401 UNAUTHORIZED",
      "00000010: 0a41 7574 6865 6e74 6963 6174 696f 6e20 .Authentication",
      "00000020: 7265 7175 6972 6564 2e0a 496e 7661 6c69 required..Invali",
      "00000030: 6420 6372 6564 656e 7469 616c 732e 0a00 d credentials...",
    ],
    errorCode: "0x191",
  },
  forbidden: {
    code: "403",
    status: "FORBIDDEN",
    hud: [
      "ACCESS.CTL :: DENIED",
      "AUTH.TOKEN :: INVALID",
      "CLEARANCE : INSUFFICIENT",
    ],
    stack: [
      'Exception in thread "main" java.lang.SecurityException',
      "at net.minecraft.server.network.ServerAccessHandler.checkPermission (ServerAccessHandler.java:89)",
      "Caused by: AccessDeniedException: Operator level 4 required for this operation",
    ],
    hex: [
      "00000000: 3430 3320 464f 5242 4944 4445 4e0a 5065 403 FORBIDDEN.Pe",
      "00000010: 726d 6973 7369 6f6e 2064 656e 6965 642e rmission denied.",
      "00000020: 496e 7375 6666 6963 6965 6e74 2061 6363 Insufficient acc",
      "00000030: 6573 7320 6c65 7665 6c2e 0a00 ess level...",
    ],
    errorCode: "0x193",
  },
  "not-found": {
    code: "404",
    status: "NOT_FOUND",
    hud: ["MEM.DUMP :: ACTIVE", "TRACE :: FAILED", "TARGET : UNKNOWN"],
    stack: [
      'Exception in thread "main" java.lang.NullPointerException',
      "at net.minecraft.server.network.ServerGamePacketListenerImpl.handleMovePlayer (ServerGamePacketListenerImpl.java:1245)",
      'Caused by: Cannot invoke "Entity.getBoundingBox()" because "entity" is null',
    ],
    hex: [
      "00000000: 4552 524f 5220 3430 3420 4e4f 5420 464f ERROR 404 NOT FO",
      "00000010: 554e 440a 5061 6765 206e 6f74 2066 6f75 UND.Page not fou",
      "00000020: 6e64 2069 6e20 6461 7461 6261 7365 2e0a nd in database..",
    ],
    errorCode: "0x194",
  },
} as const

export async function StatusPage({ kind }: StatusPageProps) {
  const config = STATUS[kind]
  const t = await getTranslations(kind)
  const title = t("title")
  const description = t("description")
  const returnHome = t("returnHome")

  return (
    <div className="text-tech-main selection:bg-tech-main/20 selection:text-tech-main-dark relative flex h-screen w-full font-mono">
      <HideFooter />
      <div className="pointer-events-none absolute z-0 size-full">
        <div className="absolute top-8 left-8 hidden flex-col space-y-1 md:flex">
          <div className="text-tech-main-dark font-mono text-xs tracking-widest uppercase opacity-50">
            [ SYSTEM_ERROR ]
          </div>
          <div className="text-tech-main font-mono text-[0.625rem] tracking-widest opacity-30">
            STATUS: {config.code} // {config.status}
          </div>
        </div>
        <div className="text-tech-main absolute top-8 right-12 hidden space-y-1 text-right font-mono text-[0.625rem] opacity-40 select-none sm:block">
          <p>
            SYS.STATE :: <span className="font-bold text-red-500">FAULT *</span>
          </p>
          {config.hud.slice(0, 2).map((line) => (
            <p key={line}>{line}</p>
          ))}
          <div className="section-divider" />
          <p>{config.hud[2]}</p>
        </div>
        <div className="decor-desktop-only absolute bottom-8 left-8 hidden font-mono text-[0.625rem] text-red-500/40 mix-blend-multiply select-none lg:block">
          <span className="font-bold">{config.stack[0]}</span>
          <br />
          <span className="font-bold">{config.stack[1]}</span>
          <br />
          <span className="font-bold text-red-600/60">{config.stack[2]}</span>
        </div>
        <div className="decor-desktop-only text-tech-main absolute top-[20%] left-[5%] hidden font-mono text-[0.625rem] leading-tight whitespace-pre opacity-[0.25] mix-blend-multiply select-none xl:block">
          {config.hex.map((line) => (
            <span key={line}>
              {line}
              {"\n"}
            </span>
          ))}
        </div>
        <div className="decor-desktop-only text-tech-main absolute top-1/3 -right-20 hidden rotate-90 text-[10rem] font-black tracking-tighter whitespace-nowrap opacity-[0.05] mix-blend-multiply select-none lg:block">
          {config.status}
        </div>
        <div className="decor-desktop-only bg-tech-main/10 absolute top-[50%] left-0 hidden h-px w-full items-center justify-center md:flex">
          <div className="border-tech-main/50 bg-tech-bg size-2 border" />
        </div>
        <div className="decor-desktop-only w-pxfull bg-tech-main/10 absolute top-0 left-[50%] hidden md:block" />
        <div className="decor-desktop-only absolute top-1/4 right-[25%] hidden text-xl font-light opacity-30 select-none md:block">
          +
        </div>
        <div className="decor-desktop-only absolute bottom-1/3 left-[8%] hidden text-xl font-light opacity-30 select-none md:block">
          +
        </div>
      </div>
      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center justify-center px-4 md:px-0">
        <div className="group animate-tech-pop-in fill-mode-forwards relative mb-8 w-full opacity-0 [animation-delay:0.2s] [animation-duration:0.8s] motion-reduce:animate-none motion-reduce:opacity-100">
          <div className="guide-line absolute inset-0 -z-10 translate-2 border bg-transparent transition-transform duration-500 ease-out group-hover:translate-3 md:translate-3 md:group-hover:translate-4" />
          <div className="border-tech-main/40 bg-surface-overlay/60 relative overflow-hidden border p-8 text-center shadow-sm backdrop-blur-md sm:p-12 md:p-16">
            <div className="card-shimmer" />
            <CornerBrackets
              size="size-3"
              color="border-tech-main"
              variant="static"
            />
            <div className="mb-8 flex flex-col items-center">
              <div className="animate-tech-slide-in fill-mode-forwards mb-4 flex items-center justify-center opacity-0 [animation-delay:0.6s] motion-reduce:animate-none motion-reduce:opacity-100">
                <h1 className="text-tech-main-dark font-mono text-6xl font-black sm:text-8xl md:text-9xl">
                  {config.code}
                </h1>
              </div>
              <div className="relative overflow-hidden">
                <h2 className="animate-tech-slide-in text-tech-main-dark fill-mode-forwards text-xl font-bold tracking-widest uppercase opacity-0 [animation-delay:0.8s] motion-reduce:animate-none motion-reduce:opacity-100 sm:text-2xl">
                  [ {title} ]
                </h2>
              </div>
            </div>
            <p className="animate-fade-in text-tech-main-dark/80 fill-mode-forwards mx-auto mb-10 max-w-md text-center text-base opacity-0 [animation-delay:1.0s] motion-reduce:animate-none motion-reduce:opacity-100">
              {description}
            </p>
            <div className="animate-slide-up-fade fill-mode-forwards w-full opacity-0 [animation-delay:1.2s] motion-reduce:animate-none motion-reduce:opacity-100">
              <Link href="/" className="inline-block">
                <TechButton
                  variant="primary"
                  className="flex h-12 items-center justify-center px-8 text-sm tracking-widest uppercase transition-transform duration-300 hover:scale-105 active:scale-95">
                  {returnHome}
                </TechButton>
              </Link>
            </div>
            <div className="animate-fade-in guide-line fill-mode-forwards mt-8 flex flex-col items-center space-y-1 border-t pt-4 font-mono text-[0.625rem] opacity-50 [animation-delay:1.4s] motion-reduce:animate-none">
              <p>ERROR_CODE: {config.errorCode}</p>
              <p>END OF LINE.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
