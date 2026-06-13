'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
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
  appliedJobResponseValues,
  updateAppliedJobSchema,
} from '@/lib/schema'
import { AuthService } from '@/lib/service'
import { handleError } from '@/lib/utils'

type UpdateAppliedJobFormValues = {
  appliedDate: Date
  platform: string
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

export default function Page() {
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
      platform: '',
      company: '',
      position: '',
      sentMail: false,
      response: 'NORESPONSE',
      link: '',
    },
  })

  const {
    data,
    isPending: isAppliedJobPending,
    error,
  } = useQuery({
    queryKey: ['applied-job', appliedJobId],
    queryFn: () => AuthService.getAppliedJob(appliedJobId),
    enabled: !!appliedJobId,
  })

  useEffect(() => {
    if (!data?.appliedJob) return

    form.reset({
      appliedDate: new Date(data.appliedJob.appliedDate),
      platform: data.appliedJob.platform,
      company: data.appliedJob.company,
      position: data.appliedJob.position,
      sentMail: data.appliedJob.sentMail,
      response: data.appliedJob.response,
      link: data.appliedJob.link,
    })
  }, [data, form])

  useEffect(() => {
    if (!error) return

    handleError<AppliedJobErrorResponse>(
      error as AxiosError<AppliedJobErrorResponse>,
    )
  }, [error])

  const updateAppliedJobMutation = useMutation({
    mutationFn: AuthService.updateAppliedJob,
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

  const appliedDate = form.watch('appliedDate')
  function onSubmit(values: UpdateAppliedJobFormValues) {
    const payload = {
      ...values,
      link: values.link.trim() ? values.link : undefined,
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

      <div className="m-5 flex flex-col gap-6 rounded-lg border border-sidebar-border bg-card p-4 text-card-foreground shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Edit applied job
            </h1>
            <p className="text-sm text-muted-foreground">
              Update the application details and mail status.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/applied-jobs">
              <ArrowLeft />
              Back
            </Link>
          </Button>
        </div>

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
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platform</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="LinkedIn, Indeed, company site"
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
                name="link"
                render={({ field }) => (
                  <FormItem>
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
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(event) =>
                            field.onChange(event.target.checked)
                          }
                          disabled={isBusy}
                          className="size-4 accent-primary"
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
          </form>
        </Form>
      </div>
    </>
  )
}

function formatResponse(response: (typeof appliedJobResponseValues)[number]) {
  return response
    .toLowerCase()
    .replace('noresponse', 'no response')
    .replace('notinterested', 'not interested')
    .replace(/^\w/, (letter) => letter.toUpperCase())
}
