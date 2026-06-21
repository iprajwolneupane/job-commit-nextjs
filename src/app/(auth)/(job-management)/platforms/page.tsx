'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import type { AxiosError } from 'axios'
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { DataTable } from '@/components/shared/data-table'
import { DataTableColumnHeader } from '@/components/shared/data-table/data-table-column-header'
import ErrorComponent from '@/components/shared/error'
import Header from '@/components/shared/header'
import Loading from '@/components/shared/loading'
import AlertDialog from '@/components/ui/alert-dialog'
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
import { PlatformApi, type Platform } from '@/lib/api'
import { platformSchema, type PlatformValues } from '@/lib/schema'
import { handleError } from '@/lib/utils'

type PlatformErrorResponse = {
  message?: string
  errors?: Partial<Record<keyof PlatformValues, Array<string>>>
}

export default function Page() {
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null)
  const queryClient = useQueryClient()
  const form = useForm<PlatformValues>({
    resolver: zodResolver(platformSchema),
    defaultValues: {
      name: '',
    },
  })

  const { data, error, isError, isFetching, isPending } = useQuery({
    queryKey: ['platforms'],
    queryFn: PlatformApi.list,
  })

  const createPlatformMutation = useMutation({
    mutationFn: PlatformApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platforms'] })
      toast.success('Platform created')
      form.reset()
    },
    onError: (error: AxiosError<PlatformErrorResponse>) => {
      handleError<PlatformErrorResponse>(error)
    },
  })

  const updatePlatformMutation = useMutation({
    mutationFn: PlatformApi.update,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platforms'] })
      await queryClient.invalidateQueries({ queryKey: ['applied-jobs'] })
      toast.success('Platform updated')
      cancelEditing()
    },
    onError: (error: AxiosError<PlatformErrorResponse>) => {
      handleError<PlatformErrorResponse>(error)
    },
  })

  const deletePlatformMutation = useMutation({
    mutationFn: PlatformApi.delete,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platforms'] })
      toast.success('Platform deleted')
    },
    onError: (error: AxiosError<PlatformErrorResponse>) => {
      handleError<PlatformErrorResponse>(error)
    },
  })

  const platforms = data?.platforms ?? []
  const isSaving =
    createPlatformMutation.isPending || updatePlatformMutation.isPending

  function startEditing(platform: Platform) {
    setEditingPlatform(platform)
    form.reset({
      name: platform.name,
    })
  }

  function cancelEditing() {
    setEditingPlatform(null)
    form.reset({
      name: '',
    })
  }

  function onSubmit(values: PlatformValues) {
    const parsedValues = platformSchema.parse(values)

    if (editingPlatform) {
      updatePlatformMutation.mutate({
        id: editingPlatform.id,
        values: parsedValues,
      })
      return
    }

    createPlatformMutation.mutate(parsedValues)
  }

  const columns: ColumnDef<Platform>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Platform" />
        ),
      },
      {
        id: 'appliedJobs',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Applied jobs" />
        ),
        cell: ({ row }) => row.original._count?.appliedJobs ?? 0,
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Created" />
        ),
        cell: ({ row }) =>
          new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
            new Date(row.original.createdAt),
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => startEditing(row.original)}
              aria-label={`Edit ${row.original.name}`}
            >
              <Pencil />
            </Button>
            <AlertDialog
              asChild
              title="Delete platform?"
              description="This platform can only be deleted when it is not used by applied jobs."
              actionText="Delete"
              actionHandler={() => deletePlatformMutation.mutate(row.original.id)}
              isLoading={deletePlatformMutation.isPending}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-destructive/10 hover:text-destructive"
                disabled={(row.original._count?.appliedJobs ?? 0) > 0}
                aria-label={`Delete ${row.original.name}`}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </AlertDialog>
          </div>
        ),
      },
    ],
    [deletePlatformMutation],
  )

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
            <BreadcrumbPage>Platforms</BreadcrumbPage>
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
        <div className="m-5 flex flex-col gap-6 rounded-lg border border-sidebar-border bg-card p-4 text-card-foreground shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-medium">
              ({platforms.length}) Platforms
            </h1>
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid gap-3 rounded-lg border bg-background p-4 md:grid-cols-[1fr_auto]"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platform name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="LinkedIn"
                        className="h-10 bg-card"
                        disabled={isSaving}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-end gap-2">
                {editingPlatform ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEditing}
                    disabled={isSaving}
                  >
                    <X />
                    Cancel
                  </Button>
                ) : null}
                <Button type="submit" isLoading={isSaving}>
                  {editingPlatform ? <Save /> : <Plus />}
                  {editingPlatform ? 'Save platform' : 'Add platform'}
                </Button>
              </div>
            </form>
          </Form>

          <DataTable<Platform, unknown>
            columns={columns}
            data={platforms}
            totalEntries={platforms.length}
            isFetching={isFetching}
          />
        </div>
      )}
    </>
  )
}
