"use client"

import { Button } from "@/components/ui/button"
import { useTRPC } from "@/trpc/client"
import { useUser } from "@clerk/nextjs"
import { useQuery } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import Image from "next/image"
import Link from "next/link"


export const ProjectsList = () => {
  const trpc = useTRPC()
  const { isSignedIn, user } = useUser()
  const { data: projects } = useQuery(trpc.projects.getMany.queryOptions())

  if (!isSignedIn && !user) return null

  return (
    <div className="w-full bg-white dark:bg-sidebar rounder-xl p-8 border flex flex-col gap-y-6 sm:gap-y-4">
      {user.firstName ? (
        <h2 className="text-2xl font-semibold">
          {user.firstName}&apos;s Vibes
        </h2>
      ) : (
        <h2 className="text-2xl font-semibold">
          User&apos;s Vibes
        </h2>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {projects?.length === 0 && (
          <div className="col-span-full text-center">
            <p className="text-sm text-muted-foreground">
              No projects found
            </p>
          </div>
        )}
        {projects?.map((project) => (
          <Button
            key={project.id}
            variant="outline"
            className="font-normal h-auto justify-start w-full text-start p-4"
            asChild
          >
            <Link href={`/projects/${project.id}`}>
              <div className="flex items-center gap-x-4">
                <Image
                  src="/vibe-logo.svg"
                  alt="vibe"
                  width={32}
                  height={32}
                  className="object-contain"
                />
                <div className="flex flex-col">
                  <h3 className="truncate font-medium">{project.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(project.updatedAt, {
                      addSuffix: true
                    })}
                  </p>
                </div>
              </div>
            </Link>
          </Button>
        ))}
      </div>
    </div>
  )
}