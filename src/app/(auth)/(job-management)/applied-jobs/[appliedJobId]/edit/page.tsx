'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { Save, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { toast } from 'sonner'
import ErrorComponent from '@/components/shared/error'
import Header from '@/components/shared/header'
import JobAnalyze from '@/components/shared/job-analyze'
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
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AppliedJobApi,
  JobReportApi,
  PlatformApi,
  type SkillMatchReport,
} from '@/lib/api'
import {
  appliedJobResponseValues,
  type GetJobReportValues,
  updateAppliedJobSchema,
} from '@/lib/schema'
import { cn, handleError } from '@/lib/utils'

type UpdateAppliedJobFormValues = {
  appliedDate: Date
  platformId: string
  company: string
  position: string
  sentMail: boolean
  response: (typeof appliedJobResponseValues)[number]
  link: string
}

type AppliedJobErrorResponse = {
  message?: string
  errors?: Partial<Record<keyof UpdateAppliedJobFormValues, Array<string>>>
}

type JobReportErrorResponse = {
  message?: string
  errors?: Partial<Record<keyof GetJobReportValues, Array<string>>>
}

export default function Page() {
  const [analyzedJob, setAnalyzedJob] = useState<{
    link: string
    data: {
      title: string
      report: SkillMatchReport
    }
  } | null>(null)
  const params = useParams<{ appliedJobId: string }>()
  const appliedJobId = params.appliedJobId
  const router = useRouter()
  const queryClient = useQueryClient()
  const form = useForm<UpdateAppliedJobFormValues>({
    resolver: zodResolver(updateAppliedJobSchema, undefined, {
      raw: true,
    }) as Resolver<UpdateAppliedJobFormValues>,
    defaultValues: {
      appliedDate: new Date(),
      platformId: '',
      company: '',
      position: '',
      sentMail: false,
      response: 'NORESPONSE',
      link: '',
    },
  })

  const {
    data,
    error,
    isError,
    isPending: isAppliedJobPending,
  } = useQuery({
    queryKey: ['applied-job', appliedJobId],
    queryFn: () => AppliedJobApi.get(appliedJobId),
    enabled: !!appliedJobId,
  })

  const {
    data: platformsData,
    error: platformsError,
    isError: isPlatformsError,
    isPending: isPlatformsPending,
  } = useQuery({
    queryKey: ['platforms'],
    queryFn: PlatformApi.list,
  })

  useEffect(() => {
    if (!data?.appliedJob) return

    form.reset({
      appliedDate: new Date(data.appliedJob.appliedDate),
      platformId: data.appliedJob.platformId,
      company: data.appliedJob.company,
      position: data.appliedJob.position,
      sentMail: data.appliedJob.sentMail,
      response: data.appliedJob.response,
      link: data.appliedJob.link,
    })
  }, [data, form])

  const updateAppliedJobMutation = useMutation({
    mutationFn: AppliedJobApi.update,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['applied-jobs'] }),
        queryClient.invalidateQueries({ queryKey: ['applied-job', appliedJobId] }),
      ])
      toast.success('Applied job updated')
      router.push('/applied-jobs')
      router.refresh()
    },
    onError: (error: AxiosError<AppliedJobErrorResponse>) => {
      handleError<AppliedJobErrorResponse>(error)
    },
  })

  const jobReportMutation = useMutation({
    mutationFn: JobReportApi.get,
    onSuccess: (reportData, values) => {
      setAnalyzedJob({
        data: {
          report: reportData.report,
          title: reportData.title,
        },
        link: values.link,
      })
      form.setValue('position', reportData.title, {
        shouldValidate: true,
      })
      toast.success(reportData.message || 'Job analyzed successfully')
    },
    onError: (error: AxiosError<JobReportErrorResponse>) => {
      handleError<JobReportErrorResponse>(error)
    },
  })

  const appliedDate = form.watch('appliedDate')
  const jobLink = form.watch('link')

  function analyzeJobLink() {
    const link = form.getValues('link')?.trim()

    if (!link) {
      toast.error('Add a job link before analyzing')
      return
    }

    jobReportMutation.mutate({ link })
  }

  function onSubmit(values: UpdateAppliedJobFormValues) {
    const payload = {
      ...values,
      link: values.link.trim() ? values.link : undefined,
      sentMail: values.sentMail ? true : undefined,
    }

    updateAppliedJobMutation.mutate({
      id: appliedJobId,
      values: updateAppliedJobSchema.parse(payload),
    })
  }

  const isBusy = isAppliedJobPending || updateAppliedJobMutation.isPending
  const sendMailAt = appliedDate
    ? new Date(appliedDate.getTime() + 3 * 24 * 60 * 60 * 1000)
    : data?.appliedJob?.sendMailAt
      ? new Date(data.appliedJob.sendMailAt)
      : undefined

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
            <BreadcrumbLink asChild>
              <Link href="/applied-jobs">Applied Jobs</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden md:block" />
          <BreadcrumbItem>
            <BreadcrumbPage>Edit</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </Header>
  )

  if (isError || isPlatformsError) {
    return (
      <>
        {pageHeader}
        <ErrorComponent error={error ?? platformsError} />
      </>
    )
  }

  return (
    <>
      {pageHeader}

      {isAppliedJobPending || isPlatformsPending ? (
        <Loading />
      ) : (
        <div className="m-5 flex flex-col gap-6 rounded-lg border border-sidebar-border bg-card p-4 text-card-foreground shadow-sm">
          <h1 className="text-2xl font-semibold text-foreground">
            Edit applied job
          </h1>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Company name"
                          className="h-10 bg-background"
                          disabled={isBusy}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Frontend Developer"
                          className="h-10 bg-background"
                          disabled={isBusy}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="platformId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Platform</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isBusy || isPlatformsPending}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 w-full bg-background">
                            <SelectValue
                              placeholder={
                                isPlatformsPending
                                  ? 'Loading platforms...'
                                  : 'Select platform'
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(platformsData?.platforms.length ?? 0) === 0 ? (
                            <SelectItem value="no-platforms" disabled>
                              Create a platform first
                            </SelectItem>
                          ) : (
                            platformsData?.platforms.map((platform) => (
                              <SelectItem key={platform.id} value={platform.id}>
                                {platform.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex w-full items-start gap-2">
                  <FormField
                    control={form.control}
                    name="link"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Job link</FormLabel>
                        <FormControl>
                          <Input
                            type="url"
                            placeholder="https://example.com/job"
                            className="h-10 bg-background"
                            disabled={isBusy}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    isLoading={jobReportMutation.isPending}
                    disabled={isBusy || !jobLink?.trim()}
                    onClick={analyzeJobLink}
                    className={cn(
                      'relative mt-5 h-10 overflow-hidden rounded-md border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary),transparent_82%)] hover:border-primary/50 hover:bg-primary/15 hover:text-primary',
                      'before:absolute before:inset-y-0 before:left-[-40%] before:w-1/3 before:skew-x-[-20deg] before:bg-white/35 before:opacity-0 before:transition-all before:duration-500 hover:before:left-[120%] hover:before:opacity-100',
                      'disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:before:hidden',
                    )}
                  >
                    <span className="relative flex items-center gap-1.5">
                      <Sparkles className="size-3.5" />
                      Analyze Job
                    </span>
                  </Button>
                </div>

                <FormField
                  control={form.control}
                  name="appliedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Applied date</FormLabel>
                      <FormControl>
                        <DatePicker
                          selected={field.value}
                          onSelect={field.onChange}
                          isPending={isBusy}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Follow-up mail date</label>
                  <Input
                    readOnly
                    className="h-10 bg-muted"
                    value={sendMailAt ? sendMailAt.toLocaleDateString() : ''}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="response"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Response</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isBusy}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 w-full bg-background">
                            <SelectValue placeholder="Select response" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {appliedJobResponseValues.map((response) => (
                            <SelectItem key={response} value={response}>
                              {formatResponse(response)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sentMail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mail status</FormLabel>
                      <FormControl>
                        <label className="flex h-10 items-center gap-3 rounded-md border bg-background px-3 text-sm">
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) =>
                              field.onChange(checked === true)
                            }
                            disabled={isBusy}
                          />
                          Sent follow-up mail
                        </label>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" asChild>
                  <Link href="/applied-jobs">Cancel</Link>
                </Button>
                <Button type="submit" isLoading={updateAppliedJobMutation.isPending}>
                  <Save />
                  Save changes
                </Button>
              </div>
              <JobAnalyze
                isLoading={jobReportMutation.isPending}
                data={analyzedJob}
              />
            </form>
          </Form>
        </div>
      )}
    </>
  )
}

function formatResponse(response: (typeof appliedJobResponseValues)[number]) {
  return response
    .toLowerCase()
    .replace('noresponse', 'no response')
    .replace('screeningquestions', 'screening questions')
    .replace('notinterested', 'not interested')
    .replace(/^\w/, (letter) => letter.toUpperCase())
}
