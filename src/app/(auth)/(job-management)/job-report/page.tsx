'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { FileSearch, Send } from 'lucide-react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import Header from '@/components/shared/header'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { JobReportApi } from '@/lib/api'
import { getJobReportSchema, type GetJobReportValues } from '@/lib/schema'
import { handleError } from '@/lib/utils'

type JobReportErrorResponse = {
  message?: string
  errors?: Partial<Record<keyof GetJobReportValues, Array<string>>>
}

export default function Page() {
  const form = useForm<GetJobReportValues>({
    resolver: zodResolver(getJobReportSchema),
    defaultValues: {
      link: '',
    },
  })

  const jobReportMutation = useMutation({
    mutationFn: JobReportApi.get,
    onSuccess: (data) => {
      toast.success(data.message || 'Job report request sent')
      form.reset()
    },
    onError: (error: AxiosError<JobReportErrorResponse>) => {
      handleError<JobReportErrorResponse>(error)
    },
  })

  function onSubmit(values: GetJobReportValues) {
    jobReportMutation.mutate(values)
  }

  return (
    <>
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
              <BreadcrumbPage>Job Report</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Header>

      <div className="m-5 flex flex-col gap-6 rounded-lg border border-sidebar-border bg-card p-4 text-card-foreground shadow-sm">
        <div className="flex items-center gap-2">
          <FileSearch className="size-5 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">
            Job report
          </h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job link</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com/job"
                      className="h-10 bg-background"
                      disabled={jobReportMutation.isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end border-t pt-6">
              <Button type="submit" isLoading={jobReportMutation.isPending}>
                <Send />
                Submit report
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </>
  )
}
