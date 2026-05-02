import { HomepageClient } from "./_homepage/homepage-client"
import { HideFooter } from "@/components/layout/footer-context"

export default function Home() {
  return (
    <div
      className="
        relative flex h-screen w-full overflow-hidden font-sans text-tech-main
        selection:bg-tech-main/20 selection:text-tech-main-dark
      ">
      <HideFooter />
      <HomepageClient />
    </div>
  )
}
