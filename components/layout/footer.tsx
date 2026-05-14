import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { articleUrl } from "@/lib/article-url"

export default function Footer() {
  const t = useTranslations("Footer")

  return (
    <footer className="border-tech-line bg-tech-bg/80 relative mt-auto w-full border-t py-12 backdrop-blur-md">
      <div className="via-tech-main/40 absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent to-transparent" />

      <div className="container-safe relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-tech-main/40 pointer-events-none absolute top-0 left-0 hidden size-2 border-t-2 border-l-2 md:block" />
        <div className="border-tech-main/40 pointer-events-none absolute top-0 right-0 hidden size-2 border-t-2 border-r-2 md:block" />

        <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">
          <div className="flex flex-col space-y-4 md:col-span-4">
            <div className="flex items-center gap-4">
              <div className="border-tech-main/40 bg-tech-main/5 text-tech-main-dark flex size-10 items-center justify-center border font-mono text-lg font-bold">
                G
              </div>
              <h2 className="tracking-tech-wide text-tech-main-dark font-mono text-xl font-bold uppercase">
                GTMC Wiki
              </h2>
            </div>
            <p className="text-tech-main max-w-sm text-sm/relaxed">
              A Technical Minecraft online textbook, written collaboratively and
              community-driven.
            </p>
          </div>

          <div className="flex flex-col gap-8 md:col-span-5 md:flex-row md:justify-around">
            <nav
              aria-label={t("documentationNav")}
              className="flex flex-col space-y-4">
              <h3 className="section-label">{t("documentation")}</h3>
              <ul className="text-tech-main flex flex-col space-y-3 text-sm">
                <li>
                  <Link
                    href={articleUrl("Preface")}
                    className="hover:text-tech-main-dark transition-colors">
                    {t("preface")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/articles"
                    className="hover:text-tech-main-dark transition-colors">
                    {t("articles")}
                  </Link>
                </li>
              </ul>
            </nav>

            <nav
              aria-label={t("communityNav")}
              className="flex flex-col space-y-4">
              <h3 className="section-label">{t("community")}</h3>
              <ul className="text-tech-main flex flex-col space-y-3 text-sm">
                <li>
                  <Link
                    href="https://github.com/gtmc-dev/gtmc-web"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-tech-main-dark transition-colors">
                    GitHub
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://github.com/gtmc-dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-tech-main-dark transition-colors">
                    Team
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://github.com/gtmc-dev/gtmc-web/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-tech-main-dark transition-colors">
                    Issues
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          <aside
            aria-label={t("legalNav")}
            className="flex flex-col space-y-4 md:col-span-3 md:items-end md:text-right">
            <h3 className="section-label">{t("legalInfo")}</h3>
            <div className="text-tech-main flex flex-col space-y-2 text-sm">
              <p>&copy; 2024-{new Date().getFullYear()} GTMC Wiki</p>
              <p>
                Articles are released under{" "}
                <Link
                  href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="decoration-tech-main/30 hover:text-tech-main-dark hover:decoration-tech-main-dark underline underline-offset-4 transition-colors">
                  CC BY-NC-SA 4.0
                </Link>
                .
              </p>
              <p>
                Site code remains available under{" "}
                <Link
                  href="https://github.com/gtmc-dev/gtmc-web/blob/main/LICENSE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="decoration-tech-main/30 hover:text-tech-main-dark hover:decoration-tech-main-dark underline underline-offset-4 transition-colors">
                  Apache-2.0
                </Link>
                .
              </p>
              <p className="text-xs opacity-80">
                Contributors keep copyright to their submissions, while accepted
                article content is published under CC BY-NC-SA 4.0 with
                attribution preserved through article metadata and source
                history.
              </p>
              <p className="mt-2 text-xs opacity-80">
                Not an official Minecraft product.
              </p>
            </div>
          </aside>
        </div>

        <div className="border-tech-main/10 text-tech-main/50 mt-16 flex flex-wrap items-center justify-center gap-4 border-t pt-6 font-mono text-[0.625rem] tracking-wider uppercase md:justify-between">
          <span>[ EST. 2024 ]</span>
          <span className="hidden md:inline">|</span>
          <span>[ OPEN SOURCE ]</span>
          <span className="hidden md:inline">|</span>
          <span>[ CC BY-NC-SA ]</span>
          <span className="hidden md:inline">|</span>
          <span>[ V.1.0.0-BETA ]</span>
        </div>
      </div>
    </footer>
  )
}
