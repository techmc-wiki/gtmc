import { prisma as db } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import Link from "next/link"
import { BrutalButton } from "@/components/ui/brutal-button"
import { FeatureList } from "./feature-list"

export default async function FeaturesPage() {
  const session = await auth()
  
  const features = await db.feature.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: { name: true, image: true, email: true }
      },
      assignee: {
        select: { name: true, image: true, email: true }
      }
    }
  })

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter uppercase border-b-2 border-tech-main pb-2 pr-8 inline-block">Feature Reports</h1>
          <p className="text-sm mt-2 font-mono text-zinc-600">Bug reports, feature requests, and issue tracking.</p>
        </div>
        
        {session?.user && (
          <Link href="/features/new" passHref>
            <BrutalButton variant="primary">REPORT NEW FEATURE</BrutalButton>
          </Link>
        )}
      </div>

      <div className="mt-8 pt-4">
        <FeatureList features={features} />
      </div>
    </div>
  )
}