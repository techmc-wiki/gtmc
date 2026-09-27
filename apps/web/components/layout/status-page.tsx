import { getTranslations } from "next-intl/server"
import { ArrowRight } from "lucide-react"
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
        <div className="relative mb-8 w-full">
          <div className="border-tech-main/40 bg-surface-overlay/60 relative overflow-hidden border p-8 text-center shadow-sm backdrop-blur-md sm:p-12 md:p-16">
            <div className="t-stagger is-shown status-entrance mb-8 flex flex-col items-center">
              <h1 className="t-stagger-line t-stagger-line--1 display-title text-tech-main-dark text-7xl tracking-tight sm:text-8xl md:text-9xl">
                {config.code}
              </h1>
              <h2 className="t-stagger-line t-stagger-line--2 display-title text-tech-main-dark mt-4 text-xl tracking-tight sm:text-2xl">
                {title}
              </h2>
              <p className="t-stagger-line t-stagger-line--3 text-tech-main-dark/80 mx-auto mt-8 mb-10 max-w-md text-center text-base">
                {description}
              </p>
            </div>
            <div className="w-full">
              <Button
                asChild
                className="flex h-12 items-center justify-center px-8 transition-transform duration-300 hover:scale-105 active:scale-95">
                <Link href="/">
                  {returnHome}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
