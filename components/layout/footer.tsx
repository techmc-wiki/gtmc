import Link from "next/link"

export default function Footer() {
  return (
    <footer
      className="
        relative mt-auto w-full border-t border-tech-line bg-tech-bg/80 py-12
        backdrop-blur-md
      ">
      <div
        className="
          absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent
          via-tech-main/40 to-transparent
        "
      />

      <div
        className="
          relative mx-auto container-safe px-4
          sm:px-6
          lg:px-8
        ">
        <div
          className="
            pointer-events-none absolute top-0 left-0 hidden size-2 border-t-2
            border-l-2 border-tech-main/40
            md:block
          "
        />
        <div
          className="
            pointer-events-none absolute top-0 right-0 hidden size-2 border-t-2
            border-r-2 border-tech-main/40
            md:block
          "
        />

        <div
          className="
            grid grid-cols-1 gap-12
            md:grid-cols-12 md:gap-8
          ">
          <div
            className="
              flex flex-col space-y-4
              md:col-span-4
            ">
            <div className="flex items-center gap-4">
              <div
                className="
                  flex size-10 items-center justify-center border
                  border-tech-main/40 bg-tech-main/5 font-mono text-lg font-bold
                  text-tech-main-dark
                ">
                G
              </div>
              <h2
                className="
                  font-mono text-xl font-bold tracking-tech-wide
                  text-tech-main-dark uppercase
                ">
                GTMC Wiki
              </h2>
            </div>
            <p className="max-w-sm text-sm/relaxed text-tech-main">
              A Technical Minecraft online textbook, written collaboratively and
              community-driven.
            </p>
          </div>

          <div
            className="
              flex flex-col gap-8
              md:col-span-5 md:flex-row md:justify-around
            ">
            <div className="flex flex-col space-y-4">
              <h3 className="section-label">Documentation</h3>
              <ul className="flex flex-col space-y-3 text-sm text-tech-main">
                <li>
                  <Link
                    href="/articles/Preface"
                    className="
                      transition-colors
                      hover:text-tech-main-dark
                    ">
                    Preface
                  </Link>
                </li>
                <li>
                  <Link
                    href="/articles"
                    className="
                      transition-colors
                      hover:text-tech-main-dark
                    ">
                    Articles
                  </Link>
                </li>
              </ul>
            </div>

            <div className="flex flex-col space-y-4">
              <h3 className="section-label">Community</h3>
              <ul className="flex flex-col space-y-3 text-sm text-tech-main">
                <li>
                  <Link
                    href="https://github.com/gtmc-dev/gtmc-web"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      transition-colors
                      hover:text-tech-main-dark
                    ">
                    GitHub
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://github.com/gtmc-dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      transition-colors
                      hover:text-tech-main-dark
                    ">
                    Team
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://github.com/gtmc-dev/gtmc-web/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      transition-colors
                      hover:text-tech-main-dark
                    ">
                    Issues
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div
            className="
              flex flex-col space-y-4
              md:col-span-3 md:items-end md:text-right
            ">
            <h3 className="section-label">Legal & Info</h3>
            <div className="flex flex-col space-y-2 text-sm text-tech-main">
              <p>&copy; 2024-{new Date().getFullYear()} GTMC Wiki</p>
              <p>
                <Link
                  href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    underline decoration-tech-main/30 underline-offset-4
                    transition-colors
                    hover:text-tech-main-dark hover:decoration-tech-main-dark
                  ">
                  CC BY-NC-SA 4.0
                </Link>
              </p>
              <p className="mt-2 text-xs opacity-80">
                Not an official Minecraft product.
              </p>
            </div>
          </div>
        </div>

        <div
          className="
            mt-16 flex flex-wrap items-center justify-center gap-4 border-t
            border-tech-main/10 pt-6 font-mono text-[10px] tracking-wider
            text-tech-main/50 uppercase
            md:justify-between
          ">
          <span>[ EST. 2024 ]</span>
          <span
            className="
              hidden
              md:inline
            ">
            |
          </span>
          <span>[ OPEN SOURCE ]</span>
          <span
            className="
              hidden
              md:inline
            ">
            |
          </span>
          <span>[ CC BY-NC-SA ]</span>
          <span
            className="
              hidden
              md:inline
            ">
            |
          </span>
          <span>[ V.1.0.0-BETA ]</span>
        </div>
      </div>
    </footer>
  )
}
