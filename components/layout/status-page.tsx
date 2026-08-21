import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/shadcn/button"
import { HideFooter } from "@/components/layout/footer-context"
type StatusPageKind = "unauthorized" | "forbidden" | "not-found"

type StatusPageProps = {
  kind: StatusPageKind
}

const STATUS = {
  unauthorized: {
    code: "401",
    status: "UNAUTHORIZED",
  },
  forbidden: {
    code: "403",
    status: "FORBIDDEN",
  },
  "not-found": {
    code: "404",
    status: "NOT_FOUND",
  },
} as const

export async function StatusPage({ kind }: StatusPageProps) {
  const config = STATUS[kind]
  const t = await getTranslations(kind)
  const title = t("title")
  const description = t("description")
  const returnHome = t("returnHome")

  return (
    <div className="text-tech-main selection:bg-tech-main/20 selection:text-tech-main-dark relative flex h-screen w-full">
      <HideFooter />
      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center justify-center px-4 md:px-0">
        <div className="group animate-tech-pop-in fill-mode-forwards relative mb-8 w-full opacity-0 [animation-delay:0.2s] [animation-duration:0.8s] motion-reduce:animate-none motion-reduce:opacity-100">
          <div className="border-tech-main/40 bg-surface-overlay/60 relative overflow-hidden border p-8 text-center shadow-sm backdrop-blur-md sm:p-12 md:p-16">
            <div className="mb-8 flex flex-col items-center">
              <div className="animate-tech-slide-in fill-mode-forwards mb-4 flex items-center justify-center opacity-0 [animation-delay:0.6s] motion-reduce:animate-none motion-reduce:opacity-100">
                <h1 className="display-title text-tech-main-dark text-7xl tracking-tight sm:text-8xl md:text-9xl">
                  {config.code}
                </h1>
              </div>
              <div className="relative overflow-hidden">
                <h2 className="animate-tech-slide-in display-title text-tech-main-dark fill-mode-forwards text-xl tracking-tight opacity-0 [animation-delay:0.8s] motion-reduce:animate-none motion-reduce:opacity-100 sm:text-2xl">
                  {title}
                </h2>
              </div>
            </div>
            <p className="animate-fade-in text-tech-main-dark/80 fill-mode-forwards mx-auto mb-10 max-w-md text-center text-base opacity-0 [animation-delay:1.0s] motion-reduce:animate-none motion-reduce:opacity-100">
              {description}
            </p>
            <div className="animate-slide-up-fade fill-mode-forwards w-full opacity-0 [animation-delay:1.2s] motion-reduce:animate-none motion-reduce:opacity-100">
              <Button
                asChild
                variant="primary"
                className="flex h-12 items-center justify-center px-8 transition-transform duration-300 hover:scale-105 active:scale-95">
                <Link href="/">{returnHome}</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
