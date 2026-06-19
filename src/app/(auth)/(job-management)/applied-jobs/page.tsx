'use client'

import { DataTable } from '@/components/shared/data-table'
import { DataTableColumnHeader } from '@/components/shared/data-table/data-table-column-header'
import Header from '@/components/shared/header'
import AlertDialog from '@/components/ui/alert-dialog'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button, buttonVariants } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import SearchInput from '@/components/ui/search-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AppliedJobApi, type AppliedJob } from '@/lib/api'
import { appliedJobResponseValues } from '@/lib/schema'
import { cn, handleError } from '@/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import type { AxiosError } from 'axios'
import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  startOfDay,
  startOfMonth,
} from 'date-fns'
import {
  ArrowRight,
  ExternalLink,
  Mail,
  MailCheck,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

const DATE_PARAM_FORMAT = 'yyyy-MM-dd'
const ALL_RESPONSES = 'ALL'

type AppliedJobErrorResponse = {
  message?: string
  errors?: Record<string, Array<string> | undefined>
}

export default function Page() {
  const [fromDate, setFromDate] = useState<Date>(() =>
    startOfMonth(new Date()),
  )
  const [toDate, setToDate] = useState<Date>(() => endOfMonth(new Date()))
  const [search, setSearch] = useState('')
  const [responseFilter, setResponseFilter] = useState<
    AppliedJob['response'] | typeof ALL_RESPONSES
  >(ALL_RESPONSES)
  const queryClient = useQueryClient()
  const appliedJobsParams = useMemo(
    () => ({
      fromDate: format(fromDate, DATE_PARAM_FORMAT),
      toDate: format(toDate, DATE_PARAM_FORMAT),
      query: search,
      response: responseFilter,
    }),
    [fromDate, responseFilter, search, toDate],
  )

  const { data, isFetching, isPending, error } = useQuery({
    queryKey: ['applied-jobs', appliedJobsParams],
    queryFn: () => AppliedJobApi.list(appliedJobsParams),
  })

  const deleteAppliedJobMutation = useMutation({
    mutationFn: AppliedJobApi.delete,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['applied-jobs'] })
      toast.success('Applied job deleted')
    },
    onError: (error: AxiosError<AppliedJobErrorResponse>) => {
      handleError<AppliedJobErrorResponse>(error)
    },
  })

  const updateSentMailMutation = useMutation({
    mutationFn: (id: string) =>
      AppliedJobApi.update({
        id,
        values: { sentMail: true },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['applied-jobs'] })
      toast.success('Mail marked as sent')
    },
    onError: (error: AxiosError<AppliedJobErrorResponse>) => {
      handleError<AppliedJobErrorResponse>(error)
    },
  })

  const appliedJobs = data?.appliedJobs ?? []

  const columns: ColumnDef<AppliedJob>[] = useMemo(
    () => [
      {
        accessorKey: 'appliedDate',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Date" />
        ),
        cell: ({ row }) => format(new Date(row.original.appliedDate), 'PP'),
      },
      {
        accessorKey: 'platform.name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Platform" />
        ),
        cell: ({ row }) => row.original.platform.name,
      },
      {
        accessorKey: 'company',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Company" />
        ),
        accessorFn: (row) => row.company.slice(0, 25),
      },
      {
        accessorKey: 'position',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Position" />
        ),
        accessorFn: (row) => row.position.slice(0, 40),
      },
      {
        accessorKey: 'response',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Response" />
        ),
        cell: ({ row }) => (
          <span
            className={cn(
              'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
              getResponseClassName(row.original.response),
            )}
          >
            {formatResponse(row.original.response)}
          </span>
        ),
      },
      {
        accessorKey: 'sentMail',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Mail" />
        ),
        sortingFn: (rowA, rowB) =>
          getMailSortValue(rowA.original) - getMailSortValue(rowB.original),
        cell: ({ row }) => {
          if (row.original.sentMail) {
            return (
              <span className="inline-flex h-8 items-center gap-2 rounded-full bg-success-soft px-3 text-xs font-medium text-success-foreground">
                <MailCheck className="size-4" />
                Sent
              </span>
            )
          }

          return (
            <AlertDialog
              asChild
              title="Mark mail as sent?"
              description="This will mark the follow-up mail as sent for this applied job."
              actionText="Yes, mark sent"
              actionHandler={() => updateSentMailMutation.mutate(row.original.id)}
              isLoading={updateSentMailMutation.isPending}
              buttonVariant="default"
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-full text-xs"
                disabled={updateSentMailMutation.isPending}
              >
                <Mail />
                {formatFollowUpDiff(row.original.sendMailAt)}
              </Button>
            </AlertDialog>
          )
        },
      },
      {
        id: 'link',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Link" />
        ),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.link ? (
            <Button variant="ghost" size="icon" asChild>
              <a
                href={row.original.link}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${row.original.position} job link`}
              >
                <ExternalLink />
              </a>
            </Button>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        id: 'actions',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Actions" />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Link
              href={`/applied-jobs/${row.original.id}/edit`}
              className={cn(
                buttonVariants({ size: 'icon', variant: 'ghost' }),
                'rounded-full',
              )}
              aria-label={`Edit ${row.original.position}`}
            >
              <Pencil />
            </Link>
            <AlertDialog
              asChild
              title="Delete applied job?"
              description="This will permanently remove this applied job from your tracker."
              actionText="Delete"
              actionHandler={() =>
                deleteAppliedJobMutation.mutate(row.original.id)
              }
              isLoading={deleteAppliedJobMutation.isPending}
            >
              <Button
                size="icon"
                variant="ghost"
                className="rounded-full hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Delete ${row.original.position}`}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </AlertDialog>
          </div>
        ),
      },
    ],
    [deleteAppliedJobMutation, updateSentMailMutation],
  )

  useEffect(() => {
    if (!error) return

    handleError<AppliedJobErrorResponse>(error as AxiosError<AppliedJobErrorResponse>)
  }, [error])

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
              <BreadcrumbPage>Applied Jobs</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Header>
      <div className="flex flex-col m-5 p-4 mb-4 rounded-lg border border-sidebar-border bg-card text-card-foreground shadow-sm">
        <div className='flex w-full justify-between items-center'>
          <h1 className="text-xl font-medium">({appliedJobs.length}) Applied Jobs</h1>
          <Button asChild>
            <Link href="/applied-jobs/add">
              <Plus />
              Add applied job
            </Link>
          </Button>
        </div>
        <Suspense fallback={<div className="rounded-md border p-4">Loading...</div>}>
          <DataTable<AppliedJob, unknown>
            columns={columns}
            data={appliedJobs}
            totalEntries={appliedJobs.length}
            isFetching={isFetching || isPending}
            showPagination={false}
          >
            <div className="flex w-full justify-between items-center">
              <SearchInput
                placeholder="Search company or position"
                value={search}
                onValueChange={setSearch}
                debounce
                className="w-full sm:w-72"
              />
              <div className='flex items-center gap-4'>
                <div className='flex items-center gap-2'>
                  <div className='w-40'>
                    <DatePicker
                      selected={fromDate}
                      onSelect={(date: Date | undefined) => {
                        if (!date) return
                        setFromDate(date)
                        if (isAfter(date, toDate)) {
                          setToDate(date)
                        }
                      }}
                      disabled={toDate ? { after: toDate } : undefined}
                      placeholder="From date"
                    />
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                  <div className='w-40'>
                    <DatePicker
                      selected={toDate}
                      onSelect={(date: Date | undefined) => {
                        if (!date) return
                        setToDate(date)
                        if (isBefore(date, fromDate)) {
                          setFromDate(date)
                        }
                      }}
                      disabled={fromDate ? { before: fromDate } : undefined}
                      placeholder="To date"
                    />
                  </div>
                </div>
                <Select
                  value={responseFilter}
                  onValueChange={(value) =>
                    setResponseFilter(value as AppliedJob['response'] | typeof ALL_RESPONSES)
                  }
                >
                  <SelectTrigger className="h-8 w-full bg-background sm:w-30">
                    <SelectValue placeholder="All responses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_RESPONSES}>All</SelectItem>
                    {appliedJobResponseValues.map((response) => (
                      <SelectItem key={response} value={response}>
                        {formatResponse(response)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DataTable>
        </Suspense>
      </div>
    </>
  )
}

function formatResponse(response: AppliedJob['response']) {
  return response
    .toLowerCase()
    .replace('noresponse', 'no response')
    .replace('screeningquestions', 'screening questions')
    .replace('notinterested', 'not interested')
    .replace(/^\w/, (letter) => letter.toUpperCase())
}

function formatFollowUpDiff(sendMailAt: string) {
  const days = differenceInCalendarDays(new Date(sendMailAt), new Date())

  if (days === 0) return 'Today'

  return `${days} ${Math.abs(days) === 1 ? 'day' : 'days'}`
}

function getMailSortValue(job: AppliedJob) {
  if (job.sentMail) {
    return Number.POSITIVE_INFINITY
  }

  return differenceInCalendarDays(new Date(job.sendMailAt), new Date())
}

function getResponseClassName(response: AppliedJob['response']) {
  switch (response) {
    case 'REJECTED':
      return 'border-destructive/30 bg-destructive/10 text-destructive'
    case 'INTERVIEW':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300'
    case 'SCREENINGQUESTIONS':
      return 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300'
    case 'OFFER':
    case 'ACCEPTED':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    case 'NOTINTERESTED':
      return 'border-muted bg-muted text-muted-foreground'
    default:
      return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
  }
}
