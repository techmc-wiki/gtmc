import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { TechButton } from "@/components/ui/tech-button"
import { HideFooter } from "@/components/layout/footer-context"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function Unauthorized() {
  const t = await getTranslations("unauthorized")

  return (
    <div className="text-tech-main selection:bg-tech-main/20 selection:text-tech-main-dark relative flex h-screen w-full font-mono">
      <HideFooter />
      {/* Background Layer - Decorations */}
      <div className="pointer-events-none absolute z-0 size-full">
        {/* Top Left System Label */}
        <div className="absolute top-8 left-8 hidden flex-col space-y-1 md:flex">
          <div className="text-tech-main-dark font-mono text-xs tracking-widest uppercase opacity-50">
            [ SYSTEM_ERROR ]
          </div>
          <div className="text-tech-main font-mono text-[0.625rem] tracking-widest opacity-30">
            STATUS: 401 // UNAUTHORIZED
          </div>
        </div>

        {/* Top Right HUD */}
        <div className="text-tech-main absolute top-8 right-12 hidden space-y-1 text-right font-mono text-[0.625rem] opacity-40 select-none sm:block">
          <p>
            SYS.STATE :: <span className="font-bold text-red-500">FAULT *</span>
          </p>
          <p>AUTH.STATUS :: UNAUTHENTICATED</p>
          <p>SESSION.ID :: NULL</p>
          <div className="section-divider" />
          <p>CREDENTIALS : MISSING</p>
        </div>

        {/* Stack Trace Decor */}
        <div className="decor-desktop-only absolute bottom-8 left-8 hidden font-mono text-[0.625rem] text-red-500/40 mix-blend-multiply select-none lg:block">
          <span className="font-bold">
            Exception in thread &quot;main&quot; java.lang.IllegalStateException
          </span>
          {"\n"}
          <br />
          <span className="font-bold">
            at
            net.minecraft.server.network.ServerLoginPacketListenerImpl.handleHello
          </span>
          (ServerLoginPacketListenerImpl.java:203) {"\n"}
          <br />
          <span className="font-bold text-red-600/60">
            Caused by: AuthenticationException: Failed to verify login session
            with Mojang servers
          </span>
        </div>

        {/* Hex Dump Decor */}
        <div className="decor-desktop-only text-tech-main absolute top-[20%] left-[5%] hidden font-mono text-[0.625rem] leading-tight whitespace-pre opacity-[0.25] mix-blend-multiply select-none xl:block">
          00000000: 3430 3120 554e 4155 5448 4f52 495a 4544 401 UNAUTHORIZED
          {"\n"}
          00000010: 0a41 7574 6865 6e74 6963 6174 696f 6e20 .Authentication
          {"\n"}
          00000020: 7265 7175 6972 6564 2e0a 496e 7661 6c69 required..Invali
          {"\n"}
          00000030: 6420 6372 6564 656e 7469 616c 732e 0a00 d credentials...
          {"\n"}
        </div>

        {/* Giant Watermark */}
        <div className="decor-desktop-only text-tech-main absolute top-1/3 -right-20 hidden rotate-90 text-[10rem] font-black tracking-tighter whitespace-nowrap opacity-[0.05] mix-blend-multiply select-none lg:block">
          UNAUTHORIZED
        </div>

        {/* Guide Lines */}
        <div className="decor-desktop-only bg-tech-main/10 absolute top-[50%] left-0 hidden h-px w-full items-center justify-center md:flex">
          <div className="border-tech-main/50 bg-tech-bg size-2 border" />
        </div>
        <div className="decor-desktop-only w-pxfull bg-tech-main/10 absolute top-0 left-[50%] hidden md:block" />

        {/* Crosshairs */}
        <div className="decor-desktop-only absolute top-1/4 right-[25%] hidden text-xl font-light opacity-30 select-none md:block">
          +
        </div>
        <div className="decor-desktop-only absolute bottom-1/3 left-[8%] hidden text-xl font-light opacity-30 select-none md:block">
          +
        </div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center justify-center px-4 md:px-0">
        <div className="group animate-tech-pop-in fill-mode-forwards relative mb-8 w-full opacity-0 [animation-delay:0.2s] [animation-duration:0.8s] motion-reduce:animate-none motion-reduce:opacity-100">
          {/* Offset shadow frame */}
          <div className="guide-line absolute inset-0 -z-10 translate-2 border bg-transparent transition-transform duration-500 ease-out group-hover:translate-3 md:translate-3 md:group-hover:translate-4" />

          {/* Main Card */}
          <div className="border-tech-main/40 bg-surface-overlay/60 relative overflow-hidden border p-8 text-center shadow-sm backdrop-blur-md sm:p-12 md:p-16">
            {/* Shimmer Effect */}
            <div className="card-shimmer" />

            {/* Corner Brackets */}
            <div className="border-tech-main absolute top-0 left-0 size-3 -translate-0.5 border-t-2 border-l-2" />
            <div className="border-tech-main absolute top-0 right-0 size-3 translate-x-0.5 -translate-y-0.5 border-t-2 border-r-2" />
            <div className="border-tech-main absolute bottom-0 left-0 size-3 -translate-x-0.5 translate-y-0.5 border-b-2 border-l-2" />
            <div className="border-tech-main absolute right-0 bottom-0 size-3 translate-0.5 border-r-2 border-b-2" />

            <div className="mb-8 flex flex-col items-center">
              <div className="animate-tech-slide-in fill-mode-forwards mb-4 flex items-center justify-center opacity-0 [animation-delay:0.6s] motion-reduce:animate-none motion-reduce:opacity-100">
                <h1 className="text-tech-main-dark font-mono text-6xl font-black sm:text-8xl md:text-9xl">
                  401
                </h1>
              </div>
              <div className="relative overflow-hidden">
                <h2 className="animate-tech-slide-in text-tech-main-dark fill-mode-forwards text-xl font-bold tracking-widest uppercase opacity-0 [animation-delay:0.8s] motion-reduce:animate-none motion-reduce:opacity-100 sm:text-2xl">
                  [ {t("title")} ]
                </h2>
              </div>
            </div>

            <p className="animate-fade-in text-tech-main-dark/80 fill-mode-forwards mx-auto mb-10 max-w-md text-center text-base opacity-0 [animation-delay:1.0s] motion-reduce:animate-none motion-reduce:opacity-100">
              {t("description")}
            </p>

            <div className="animate-slide-up-fade fill-mode-forwards w-full opacity-0 [animation-delay:1.2s] motion-reduce:animate-none motion-reduce:opacity-100">
              <Link href="/" className="inline-block">
                <TechButton
                  variant="primary"
                  className="flex h-12 items-center justify-center px-8 text-sm tracking-widest uppercase transition-transform duration-300 hover:scale-105 active:scale-95">
                  RETURN TO HOME →
                </TechButton>
              </Link>
            </div>

            <div className="animate-fade-in guide-line fill-mode-forwards mt-8 flex flex-col items-center space-y-1 border-t pt-4 font-mono text-[0.625rem] opacity-50 [animation-delay:1.4s] motion-reduce:animate-none">
              <p>ERROR_CODE: 0x191 // TIMESTAMP: {new Date().toISOString()}</p>
              <p>END OF LINE.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
