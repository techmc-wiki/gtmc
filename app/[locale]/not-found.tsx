import { Link } from "@/i18n/navigation"
import { TechButton } from "@/components/ui/tech-button"
import { HideFooter } from "@/components/layout/footer-context"

export default function NotFound() {
  return (
    <div
      className="
        relative flex h-screen w-full font-mono text-tech-main
        selection:bg-tech-main/20 selection:text-tech-main-dark
      ">
      <HideFooter />
      {/* Background Layer - Decorations */}
      <div className="pointer-events-none absolute z-0 size-full">
        {/* Top Left System Label */}
        <div
          className="
            absolute top-8 left-8 hidden flex-col space-y-1
            md:flex
          ">
          <div
            className="
              font-mono text-xs tracking-widest text-tech-main-dark uppercase
              opacity-50
            ">
            [ SYSTEM_ERROR ]
          </div>
          <div
            className="
              font-mono text-[0.625rem] tracking-widest text-tech-main opacity-30
            ">
            STATUS: 404 // NOT_FOUND
          </div>
        </div>

        {/* Top Right HUD */}
        <div
          className="
            absolute top-8 right-12 hidden space-y-1 text-right font-mono
            text-[0.625rem] text-tech-main opacity-40 select-none
            sm:block
          ">
          <p>
            SYS.STATE :: <span className="font-bold text-red-500">FAULT *</span>
          </p>
          <p>MEM.DUMP :: ACTIVE</p>
          <p>TRACE :: FAILED</p>
          <div className="section-divider" />
          <p>TARGET : UNKNOWN</p>
        </div>

        {/* Stack Trace Decor */}
        <div
          className="
            absolute bottom-8 left-8 decor-desktop-only hidden font-mono
            text-[0.625rem] text-red-500/40 mix-blend-multiply select-none
            lg:block
          ">
          <span className="font-bold">
            Exception in thread &quot;main&quot; java.lang.NullPointerException
          </span>
          {"\n"}
          <br />
          <span className="font-bold">
            at
            net.minecraft.server.network.ServerGamePacketListenerImpl.handleMovePlayer
          </span>
          (ServerGamePacketListenerImpl.java:1245) {"\n"}
          <br />
          <span className="font-bold text-red-600/60">
            Caused by: Cannot invoke &quot;Entity.getBoundingBox()&quot; because
            &quot;entity&quot; is null
          </span>
        </div>

        {/* Hex Dump Decor */}
        <div
          className="
            absolute top-[20%] left-[5%] decor-desktop-only hidden font-mono
            text-[0.625rem] leading-tight whitespace-pre text-tech-main
            opacity-[0.25] mix-blend-multiply select-none
            xl:block
          ">
          00000000: 4552 524f 5220 3430 3420 4e4f 5420 464f ERROR 404 NOT FO
          {"\n"}
          00000010: 554e 440a 5061 6765 206e 6f74 2066 6f75 UND.Page not fou
          {"\n"}
          00000020: 6e64 2069 6e20 6461 7461 6261 7365 2e0a nd in database..
          {"\n"}
        </div>

        {/* Giant Watermark */}
        <div
          className="
            absolute top-1/3 -right-20 decor-desktop-only hidden rotate-90
            text-[10rem] font-black tracking-tighter whitespace-nowrap
            text-tech-main opacity-[0.05] mix-blend-multiply select-none
            lg:block
          ">
          NOT_FOUND
        </div>

        {/* Guide Lines */}
        <div
          className="
            absolute top-[50%] left-0 decor-desktop-only hidden h-px w-full
            items-center justify-center bg-tech-main/10
            md:flex
          ">
          <div className="size-2 border border-tech-main/50 bg-tech-bg" />
        </div>
        <div
          className="
            absolute top-0 left-[50%] decor-desktop-only hidden w-pxfull
            bg-tech-main/10
            md:block
          "
        />

        {/* Crosshairs */}
        <div
          className="
            absolute top-1/4 right-[25%] decor-desktop-only hidden text-xl
            font-light opacity-30 select-none
            md:block
          ">
          +
        </div>
        <div
          className="
            absolute bottom-1/3 left-[8%] decor-desktop-only hidden text-xl
            font-light opacity-30 select-none
            md:block
          ">
          +
        </div>
      </div>

      {/* Main Content */}
      <main
        className="
          relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center
          justify-center px-4
          md:px-0
        ">
        <div
          className="
            group relative mb-8 w-full animate-tech-pop-in opacity-0
            [animation-delay:0.2s] [animation-duration:0.8s] fill-mode-forwards
          ">
          {/* Offset shadow frame */}
          <div
            className="
              absolute inset-0 -z-10 translate-2 border guide-line
              bg-transparent transition-transform duration-500 ease-out
              group-hover:translate-3
              md:translate-3
              md:group-hover:translate-4
            "
          />

          {/* Main Card */}
          <div
            className="
              relative overflow-hidden border border-tech-main/40 bg-white/60
              p-8 text-center shadow-sm backdrop-blur-md
              sm:p-12
              md:p-16
            ">
            {/* Shimmer Effect */}
            <div
              className="
                pointer-events-none absolute inset-0 translate-x-[-200%]
                -skew-x-12 animate-[shimmer_3s_infinite_2s] bg-linear-to-r
                from-transparent via-white/40 to-transparent
              "
            />

            {/* Corner Brackets */}
            <div
              className="
                absolute top-0 left-0 size-3 -translate-0.5 border-t-2
                border-l-2 border-tech-main
              "
            />
            <div
              className="
                absolute top-0 right-0 size-3 translate-x-0.5 -translate-y-0.5
                border-t-2 border-r-2 border-tech-main
              "
            />
            <div
              className="
                absolute bottom-0 left-0 size-3 -translate-x-0.5 translate-y-0.5
                border-b-2 border-l-2 border-tech-main
              "
            />
            <div
              className="
                absolute right-0 bottom-0 size-3 translate-0.5 border-r-2
                border-b-2 border-tech-main
              "
            />

            <div className="mb-8 flex flex-col items-center">
              <div
                className="
                  mb-4 flex animate-tech-slide-in items-center justify-center
                  opacity-0 [animation-delay:0.6s] fill-mode-forwards
                ">
                <h1
                  className="
                    font-mono text-6xl font-black text-tech-main-dark
                    sm:text-8xl
                    md:text-9xl
                  ">
                  404
                </h1>
              </div>
              <div className="relative overflow-hidden">
                <h2
                  className="
                    animate-tech-slide-in text-xl font-bold tracking-widest
                    text-tech-main-dark uppercase opacity-0
                    [animation-delay:0.8s] fill-mode-forwards
                    sm:text-2xl
                  ">
                  [ RESOURCE_NOT_FOUND ]
                </h2>
              </div>
            </div>

            <p
              className="
                mx-auto mb-10 max-w-md animate-fade-in text-center text-base
                text-tech-main-dark/80 opacity-0 [animation-delay:1.0s]
                fill-mode-forwards
              ">
              The requested path does not exist in the database. Please verify
              the coordinates and try again.
            </p>

            <div
              className="
                w-full animate-slide-up-fade opacity-0 [animation-delay:1.2s]
                fill-mode-forwards
              ">
              <Link href="/" className="inline-block">
                <TechButton
                  variant="primary"
                  className="
                    flex h-12 items-center justify-center px-8 text-sm
                    tracking-widest uppercase transition-transform duration-300
                    hover:scale-105
                    active:scale-95
                  ">
                  RETURN TO HOME →
                </TechButton>
              </Link>
            </div>

            <div
              className="
                mt-8 flex animate-fade-in flex-col items-center space-y-1
                border-t guide-line pt-4 font-mono text-[0.625rem] opacity-50
                [animation-delay:1.4s] fill-mode-forwards
              ">
              <p>ERROR_CODE: 0x194 // TIMESTAMP: {new Date().toISOString()}</p>
              <p>END OF LINE.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
