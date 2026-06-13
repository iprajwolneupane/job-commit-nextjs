'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
    createAppliedJobSchema,
} from '@/lib/schema'
import { AuthService } from '@/lib/service'
import { handleError } from '@/lib/utils'

type CreateAppliedJobFormValues = {
    appliedDate: Date
    platform: string
    company: string
    position: string
    response?: (typeof appliedJobResponseValues)[number]
    link: string
}

type AppliedJobErrorResponse = {
    message?: string
    errors?: Partial<Record<keyof CreateAppliedJobFormValues, Array<string>>>
}

export default function Page() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const form = useForm<CreateAppliedJobFormValues>({
        resolver: zodResolver(createAppliedJobSchema, undefined, {
            raw: true,
        }) as Resolver<CreateAppliedJobFormValues>,
        defaultValues: {
            appliedDate: new Date(),
            platform: '',
            company: '',
            position: '',
            response: 'NORESPONSE',
            link: '',
        },
    })

    const createAppliedJobMutation = useMutation({
        mutationFn: AuthService.createAppliedJob,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['applied-jobs'] })
            toast.success('Applied job added')
            router.push('/applied-jobs')
            router.refresh()
        },
        onError: (error: AxiosError<AppliedJobErrorResponse>) => {
            handleError<AppliedJobErrorResponse>(error)
        },
    })

    function onSubmit(values: CreateAppliedJobFormValues) {
        createAppliedJobMutation.mutate(createAppliedJobSchema.parse(values))
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
                            <BreadcrumbLink asChild>
                                <Link href="/applied-jobs">Applied Jobs</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="hidden md:block" />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Add</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </Header>
            <div className="flex flex-col gap-6 rounded-lg border border-sidebar-border bg-card m-5 p-4 text-card-foreground shadow-sm">
                <h1 className="text-2xl font-semibold text-foreground">
                    Add applied job
                </h1>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2 items-start">
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
                                                isPending={createAppliedJobMutation.isPending}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="response"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Response</FormLabel>
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            disabled={createAppliedJobMutation.isPending}
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
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
                            <Button type="button" variant="outline" asChild>
                                <Link href="/applied-jobs">Cancel</Link>
                            </Button>
                            <Button
                                type="submit"
                                isLoading={createAppliedJobMutation.isPending}
                            >
                                <Save />
                                Save applied job
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
