import Link from "next/link"

export default function Footer() {
  return (
    <footer
      className="
        mt-auto w-full border-t border-tech-line bg-tech-bg/50 py-8
        backdrop-blur-md
      ">
      <div
        className="
          mx-auto container-safe px-4
          sm:px-6
          lg:px-8
        ">
        <div
          className="
            grid grid-cols-1 gap-8
            md:grid-cols-3
          ">
          <div className="flex flex-col space-y-2">
            <h2
              className="
                font-mono text-xl font-bold tracking-tech-wide
                text-tech-main-dark
              ">
              GTMC Wiki
            </h2>
            <p className="text-sm text-tech-main">&copy; 2024-2026 GTMC Wiki</p>
            <p className="text-xs text-tech-main">
              Licensed under{" "}
              <Link
                href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="
                  text-tech-main-dark underline decoration-tech-line
                  underline-offset-4 transition-colors
                  hover:text-tech-accent hover:decoration-tech-accent
                ">
                CC BY-NC-SA 4.0
              </Link>
            </p>
          </div>

          <div className="flex flex-col space-y-4">
            <h3 className="section-label">Resources</h3>
            <ul className="flex flex-col space-y-2 text-sm text-tech-main">
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
                  href="/articles/Preface"
                  className="
                    transition-colors
                    hover:text-tech-main-dark
                  ">
                  Preface
                </Link>
              </li>
            </ul>
          </div>

          <div
            className="
              flex flex-col justify-end space-y-2
              md:items-end md:text-right
            ">
            <p className="text-xs text-tech-main">
              Not an official Minecraft product.
            </p>
            <p className="font-mono text-xs text-tech-main/80">
              Made with &hearts; by GTMC Team
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
