"use client"

import { SessionProvider, useSession } from "next-auth/react"
import { Link } from "@/i18n/navigation"
import { TechButton } from "@/components/ui/tech-button"

interface FeaturesAuthGateProps {
  createLabel: string
}

function FeaturesAuthGateContent({ createLabel }: FeaturesAuthGateProps) {
  const { data: session } = useSession()

  if (!session?.user) {
    return null
  }

  return (
    <Link href="/features/new" className="w-full md:w-auto">
      <TechButton
        variant="primary"
        className="flex min-h-[44px] w-full items-center justify-center px-6 text-xs tracking-widest uppercase transition-transform hover:scale-[1.02] md:w-auto">
        {createLabel}
      </TechButton>
    </Link>
  )
}

export function FeaturesAuthGate(props: FeaturesAuthGateProps) {
  return (
    <SessionProvider>
      <FeaturesAuthGateContent {...props} />
    </SessionProvider>
  )
}
