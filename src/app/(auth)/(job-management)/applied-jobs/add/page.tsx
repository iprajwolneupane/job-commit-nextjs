'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { Save, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm, type Resolver } from 'react-hook-form'
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
    createAppliedJobSchema,
    GetJobReportValues,
} from '@/lib/schema'
import { cn, handleError } from '@/lib/utils'
import { useState } from 'react'
import JobAnalyze from '@/components/shared/job-analyze'

type CreateAppliedJobFormValues = {
    appliedDate: Date
    platformId: string
    company: string
    position: string
    response?: (typeof appliedJobResponseValues)[number]
    link: string
}

type AppliedJobErrorResponse = {
    message?: string
    errors?: Partial<Record<keyof CreateAppliedJobFormValues, Array<string>>>
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
    const router = useRouter()
    const queryClient = useQueryClient()
    const form = useForm<CreateAppliedJobFormValues>({
        resolver: zodResolver(createAppliedJobSchema, undefined, {
            raw: true,
        }) as Resolver<CreateAppliedJobFormValues>,
        defaultValues: {
            appliedDate: new Date(),
            platformId: '',
            company: '',
            position: '',
            response: 'NORESPONSE',
            link: '',
        },
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

    const createAppliedJobMutation = useMutation({
        mutationFn: AppliedJobApi.create,
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

    const jobReportMutation = useMutation({
        mutationFn: JobReportApi.get,
        onSuccess: (data, values) => {
            setAnalyzedJob({
                data: {
                    report: data.report,
                    title: data.title
                },
                link: values.link
            });
            form.setValue("position", data.title, {
                shouldValidate: true
            });
            toast.success(data.message || 'Job Analyze Successfully')
        },
        onError: (error: AxiosError<JobReportErrorResponse>) => {
            handleError<JobReportErrorResponse>(error)
        },
    })


    function onSubmit(values: CreateAppliedJobFormValues) {
        createAppliedJobMutation.mutate(createAppliedJobSchema.parse(values))
    }

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
                        <BreadcrumbPage>Add</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
        </Header>
    )

    if (isPlatformsError) {
        return (
            <>
                {pageHeader}
                <ErrorComponent error={platformsError} />
            </>
        )
    }

    return (
        <>
            {pageHeader}
            {isPlatformsPending ? (
                <Loading />
            ) : (
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
                                    name="platformId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Platform</FormLabel>
                                            <Select
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                disabled={
                                                    createAppliedJobMutation.isPending ||
                                                    isPlatformsPending
                                                }
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
                                                            <SelectItem
                                                                key={platform.id}
                                                                value={platform.id}
                                                            >
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
                                <div className='flex w-full gap-2 items-start'>
                                    <FormField
                                        control={form.control}
                                        name="link"
                                        render={({ field }) => (
                                            <FormItem className='w-full'>
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
                                    <Button onClick={() => {
                                        const link = form.watch("link");
                                        if (link) {
                                            jobReportMutation.mutate({ link });
                                        }
                                    }} isLoading={jobReportMutation.isPending} type="button" className={cn(
                                        'relative h-10 mt-5 overflow-hidden rounded-md border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary),transparent_82%)] hover:border-primary/50 hover:bg-primary/15 hover:text-primary',
                                        'before:absolute before:inset-y-0 before:left-[-40%] before:w-1/3 before:skew-x-[-20deg] before:bg-white/35 before:opacity-0 before:transition-all before:duration-500 hover:before:left-[120%] hover:before:opacity-100',
                                        'disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:before:hidden',
                                    )}>
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
                                <Button type="button" variant="outline" className='h-10' asChild>
                                    <Link href="/applied-jobs">Cancel</Link>
                                </Button>
                                <Button
                                    className='h-10'
                                    type="submit"
                                    isLoading={createAppliedJobMutation.isPending}
                                >
                                    <Save />
                                    Save applied job
                                </Button>
                            </div>
                            <JobAnalyze isLoading={jobReportMutation.isPending} data={analyzedJob} />
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
