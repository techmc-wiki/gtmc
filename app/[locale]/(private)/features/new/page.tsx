import type { Metadata } from "next"
import { FeatureEditor } from "@/components/editor/feature-editor"

export const metadata: Metadata = {
  title: "Report New Feature",
  description:
    "Submit bug reports, feature requests, and enhancement suggestions for GTMC Wiki.",
  robots: { index: false, follow: false },
}

export default function NewFeaturePage() {
  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="border-tech-main inline-block border-b-2 pr-8 pb-2 text-3xl font-bold tracking-tighter uppercase">
          Report New Feature
        </h1>
        <p className="mt-2 font-mono text-sm text-zinc-600">
          Submit bugs, fixes, or enhancement requests.
        </p>
      </div>

      <div className="pt-4">
        <FeatureEditor />
      </div>
    </div>
  )
}
