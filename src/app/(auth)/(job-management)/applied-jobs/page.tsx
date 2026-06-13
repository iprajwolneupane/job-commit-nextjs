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
import { cn, handleError } from '@/lib/utils'
import { AuthService, type AppliedJob } from '@/lib/service'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import type { AxiosError } from 'axios'
import { format, isAfter, isBefore, startOfDay } from 'date-fns'
import {
  ArrowRight,
  CheckCircle2,
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

type AppliedJobErrorResponse = {
  message?: string
  errors?: Record<string, Array<string> | undefined>
}

export default function Page() {
  const [fromDate, setFromDate] = useState<Date>()
  const [toDate, setToDate] = useState<Date>()
  const queryClient = useQueryClient()

  const { data, isFetching, isPending, error } = useQuery({
    queryKey: ['applied-jobs'],
    queryFn: AuthService.getAppliedJobs,
  })

  const deleteAppliedJobMutation = useMutation({
    mutationFn: AuthService.deleteAppliedJob,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['applied-jobs'] })
      toast.success('Applied job deleted')
    },
    onError: (error: AxiosError<AppliedJobErrorResponse>) => {
      handleError<AppliedJobErrorResponse>(error)
    },
  })

  const updateSentMailMutation = useMutation({
    mutationFn: ({ id, sentMail }: { id: string; sentMail: boolean }) =>
      AuthService.updateAppliedJob({
        id,
        values: { sentMail },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['applied-jobs'] })
      toast.success('Mail status updated')
    },
    onError: (error: AxiosError<AppliedJobErrorResponse>) => {
      handleError<AppliedJobErrorResponse>(error)
    },
  })

  const appliedJobs = data?.appliedJobs ?? []
  const filteredJobs = useMemo(
    () =>
      appliedJobs.filter((job) => {
        const appliedDate = startOfDay(new Date(job.appliedDate))
        const start = fromDate ? startOfDay(fromDate) : undefined
        const end = toDate ? startOfDay(toDate) : undefined

        if (start && isBefore(appliedDate, start)) return false
        if (end && isAfter(appliedDate, end)) return false

        return true
      }),
    [appliedJobs, fromDate, toDate],
  )

  const columns: ColumnDef<AppliedJob>[] = useMemo(
    () => [
      {
        id: 'serial',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="S.No." />
        ),
        enableSorting: false,
        cell: ({ row, table }) => {
          const rows = table.getRowModel().rows
          const localIndex = rows.findIndex((tableRow) => tableRow.id === row.id)

          return (
            localIndex +
            table.getState().pagination.pageSize *
            table.getState().pagination.pageIndex +
            1
          )
        },
      },
      {
        accessorKey: 'appliedDate',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Applied Date" />
        ),
        cell: ({ row }) => format(new Date(row.original.appliedDate), 'PPP'),
      },
      {
        accessorKey: 'company',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Company" />
        ),
      },
      {
        accessorKey: 'position',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Position" />
        ),
      },
      {
        accessorKey: 'platform',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Platform" />
        ),
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
        accessorKey: 'sendMailAt',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Follow-up" />
        ),
        cell: ({ row }) => format(new Date(row.original.sendMailAt), 'PPP'),
      },
      {
        accessorKey: 'sentMail',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Mail" />
        ),
        cell: ({ row }) => (
          <Button
            type="button"
            variant={row.original.sentMail ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 rounded-full text-xs"
            disabled={updateSentMailMutation.isPending}
            onClick={() =>
              updateSentMailMutation.mutate({
                id: row.original.id,
                sentMail: !row.original.sentMail,
              })
            }
          >
            {row.original.sentMail ? <MailCheck /> : <Mail />}
            {row.original.sentMail ? 'Sent' : 'Pending'}
          </Button>
        ),
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

      <main className="p-4">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-medium">Applied Jobs</h1>
            <p className="text-sm text-muted-foreground">
              Track applications, follow-ups, responses, and mail status.
            </p>
          </div>
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
            data={filteredJobs}
            totalEntries={filteredJobs.length}
            isFetching={isFetching || isPending}
          >
            <div className="flex flex-wrap items-center gap-3">
              <DatePicker
                selected={fromDate}
                onSelect={(date: Date | undefined) => {
                  setFromDate(date)
                  if (date && toDate && isAfter(date, toDate)) {
                    setToDate(date)
                  }
                }}
                disabled={toDate ? { after: toDate } : undefined}
                placeholder="From date"
              />
              <ArrowRight className="size-4 text-muted-foreground" />
              <DatePicker
                selected={toDate}
                onSelect={(date: Date | undefined) => {
                  setToDate(date)
                  if (date && fromDate && isBefore(date, fromDate)) {
                    setFromDate(date)
                  }
                }}
                disabled={fromDate ? { before: fromDate } : undefined}
                placeholder="To date"
              />
              {(fromDate || toDate) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFromDate(undefined)
                    setToDate(undefined)
                  }}
                >
                  Clear
                </Button>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4" />
                {filteredJobs.length} records
              </div>
            </div>
          </DataTable>
        </Suspense>
      </main>
    </>
  )
}

function formatResponse(response: AppliedJob['response']) {
  return response
    .toLowerCase()
    .replace('noresponse', 'no response')
    .replace('notinterested', 'not interested')
    .replace(/^\w/, (letter) => letter.toUpperCase())
}

function getResponseClassName(response: AppliedJob['response']) {
  switch (response) {
    case 'REJECTED':
      return 'border-destructive/30 bg-destructive/10 text-destructive'
    case 'INTERVIEW':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300'
    case 'OFFER':
    case 'ACCEPTED':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    case 'NOTINTERESTED':
      return 'border-muted bg-muted text-muted-foreground'
    default:
      return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
  }
}
