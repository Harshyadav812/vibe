'use client'

import { useCurrentTheme } from "@/hooks/use-current-theme";
import { PricingTable } from "@clerk/nextjs";
import Image from "next/image";
import { dark } from "@clerk/themes";

export default function PricingPage() {
  const currentTheme = useCurrentTheme()

  return (
    <div className="flex flex-col max-w-3xl mx-auto w-full">
      <section className="space-y-6 pt-[16vh] 2xl:pt-48">
        <div className="flex flex-col items-center">
          <Image src="/vibe-logo.svg"
            alt="vibe"
            width={50}
            height={50}
            className="hidden md:block"
          />
        </div>
        <h1 className="text-xl md:text-3xl font-bold text-center">Pricing</h1>
        <p className="text-muted-foreground text-center text-sm md:text-base">Choose the plan that fits your needs</p>
        <PricingTable
          appearance={{
            theme: currentTheme === "dark" ? dark : undefined,
            elements: {
              pricingTableCard: "border! shadow-none! rounded-lg!",
              modalBackdrop: "!z-[100]",
              modelContent: "!z-[101]"
            }
          }}
        />
      </section>
    </div>
  )
}