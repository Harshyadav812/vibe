'use client'

import { useTRPC } from "@/trpc/client"
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"


export const Client = () => {
  const trpc = useTRPC()

  const { data } = useSuspenseQuery(trpc.hello.queryOptions({ text: 'harsh' }))

  return (
    <div>
      {JSON.stringify(data)}
    </div>
  )

}