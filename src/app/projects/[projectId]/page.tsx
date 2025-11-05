import { Button } from "@/components/ui/button"
import { ProjectView, ProjectViewSkeleton } from "@/modules/projects/ui/views/project-view"
import { getQueryClient, trpc } from "@/trpc/server"

import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { AlertCircle } from "lucide-react"
import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"

interface Props {
  params: Promise<{
    projectId: string
  }>
}

const ErrorFallback = () => {
  return (
    <div className="h-full flex flex-col justify-center items-center gap-4 p-8">
      <AlertCircle className="size-12 text-destructive" />
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
      </div>
    </div>
  )
}

const Page = async ({ params }: Props) => {
  const { projectId } = await params

  const queryClient = getQueryClient()
  void queryClient.prefetchQuery(trpc.messages.getMany.queryOptions({ projectId }))

  void queryClient.prefetchQuery(trpc.projects.getOne.queryOptions({ id: projectId }))

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ErrorBoundary fallback={<ErrorFallback />}>
        <Suspense fallback={<ProjectViewSkeleton />}>
          <ProjectView projectId={projectId} />
        </Suspense>
      </ErrorBoundary>
    </HydrationBoundary>
  )
}

export default Page