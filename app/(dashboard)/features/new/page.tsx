import { FeatureEditor } from "@/components/editor/feature-editor"

export default function NewFeaturePage() {
  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tighter uppercase border-b-2 border-tech-main pb-2 pr-8 inline-block">Report New Feature</h1>
        <p className="text-sm mt-2 font-mono text-zinc-600">Submit bugs, fixes, or enhancement requests.</p>
      </div>

      <div className="pt-4">
        <FeatureEditor />
      </div>
    </div>
  )
}