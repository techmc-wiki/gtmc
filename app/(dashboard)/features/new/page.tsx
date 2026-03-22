import { FeatureEditor } from "@/components/editor/feature-editor"

export default function NewFeaturePage() {
  return (
    <div className="
      container mx-auto max-w-5xl space-y-6 p-4
      md:p-8
    ">
      <div>
        <h1 className="
          inline-block border-b-2 border-tech-main pr-8 pb-2 text-3xl font-bold
          tracking-tighter uppercase
        ">
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
