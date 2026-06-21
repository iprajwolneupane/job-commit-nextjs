'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { ExternalLink, FileText, Upload } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import ErrorComponent from '@/components/shared/error'
import Header from '@/components/shared/header'
import Loading from '@/components/shared/loading'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CvApi } from '@/lib/api'
import { handleError } from '@/lib/utils'

type CvErrorResponse = {
  message?: string
}

function formatFileSize(size: number | null) {
  if (size == null) {
    return '-'
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formatUpdatedAt(value: string | null) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function Page() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const queryClient = useQueryClient()

  const { data, error, isError, isPending } = useQuery({
    queryKey: ['cv'],
    queryFn: CvApi.get,
  })

  const uploadMutation = useMutation({
    mutationFn: CvApi.upload,
    onSuccess: async (response) => {
      toast.success(response.message)
      setSelectedFile(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['cv'] }),
        queryClient.invalidateQueries({ queryKey: ['auth'] }),
      ])
    },
    onError: (error: AxiosError<CvErrorResponse>) => {
      handleError<CvErrorResponse>(error)
    },
  })

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedFile) {
      toast.error('Please select a PDF file')
      return
    }

    uploadMutation.mutate(selectedFile)
  }

  const cv = data?.cv

  const pageHeader = (
    <Header>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden md:block" />
          <BreadcrumbItem>
            <BreadcrumbPage>Uploaded CV</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </Header>
  )

  if (isError) {
    return (
      <>
        {pageHeader}
        <ErrorComponent error={error} />
      </>
    )
  }

  return (
    <>
      {pageHeader}

      {isPending ? (
        <Loading />
      ) : (
        <main className="m-5 flex flex-col gap-6 rounded-lg border border-sidebar-border bg-card p-4 text-card-foreground shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              <h1 className="text-2xl font-semibold text-foreground">
                Uploaded CV
              </h1>
            </div>

            {cv?.exists && cv.url ? (
              <Button asChild variant="outline">
                <a href={cv.url} target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden="true" className="size-4" />
                  View CV
                </a>
              </Button>
            ) : null}
          </div>

          <section className="grid gap-3 rounded-lg border bg-background p-4 sm:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Status
              </p>
              <p className="mt-1 text-sm font-medium">
                {cv?.exists ? 'Uploaded' : 'Not uploaded'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Size
              </p>
              <p className="mt-1 text-sm font-medium">
                {formatFileSize(cv?.size ?? null)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Updated
              </p>
              <p className="mt-1 text-sm font-medium">
                {formatUpdatedAt(cv?.updatedAt ?? null)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Chunks
              </p>
              <p className="mt-1 text-sm font-medium">
                {cv?.documentCount ?? 0}
              </p>
            </div>
          </section>

          <form onSubmit={onSubmit} className="space-y-4 border-t pt-6">
            <div className="space-y-2">
              <label
                htmlFor="cv-file"
                className="text-sm font-medium text-foreground"
              >
                CV PDF
              </label>
              <Input
                id="cv-file"
                type="file"
                accept="application/pdf,.pdf"
                disabled={uploadMutation.isPending}
                onChange={(event) =>
                  setSelectedFile(event.target.files?.[0] ?? null)
                }
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                isLoading={uploadMutation.isPending}
                disabled={!selectedFile || uploadMutation.isPending}
              >
                <Upload aria-hidden="true" className="size-4" />
                {cv?.exists ? 'Replace CV' : 'Upload CV'}
              </Button>
            </div>
          </form>
        </main>
      )}
    </>
  )
}
