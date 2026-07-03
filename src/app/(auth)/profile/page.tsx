'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { FileText, Plus, Save, UserCircle, X } from 'lucide-react'
import Link from 'next/link'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { AuthApi, CvApi } from '@/lib/api'
import { profileSchema, type ProfileValues } from '@/lib/schema'
import { handleError } from '@/lib/utils'

type ProfileErrorResponse = {
  message?: string
  errors?: Partial<Record<keyof ProfileValues, Array<string>>>
}

export default function Page() {
  const queryClient = useQueryClient()
  const cvInputRef = useRef<HTMLInputElement>(null)
  const [skillInput, setSkillInput] = useState('')
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: '',
      email: '',
      linkedInUrl: '',
      githubUrl: '',
      portfolioUrl: '',
      contactNumber: '',
      skills: [],
    },
  })

  const { data: profile, error, isError, isPending } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: AuthApi.me,
    retry: false,
  })

  useEffect(() => {
    if (!profile) return

    form.reset({
      username: profile.username,
      email: profile.email,
      linkedInUrl: profile.linkedInUrl ?? '',
      githubUrl: profile.githubUrl ?? '',
      portfolioUrl: profile.portfolioUrl ?? '',
      contactNumber: profile.contactNumber ?? '',
      skills: profile.skills ?? [],
    })
  }, [form, profile])

  const updateProfileMutation = useMutation({
    mutationFn: AuthApi.updateProfile,
    onSuccess: async (response) => {
      queryClient.setQueryData(['auth', 'me'], response.profile)
      await queryClient.invalidateQueries({ queryKey: ['auth'] })
      toast.success(response.message)
    },
    onError: (error: AxiosError<ProfileErrorResponse>) => {
      handleError<ProfileErrorResponse>(error)
    },
  })

  const refillWithCvMutation = useMutation({
    mutationFn: async (file: File) => {
      await CvApi.upload(file)

      return CvApi.refillProfile()
    },
    onSuccess: async (response) => {
      queryClient.setQueryData(['auth', 'me'], response.profile)
      form.reset({
        username: response.profile.username,
        email: response.profile.email,
        linkedInUrl: response.profile.linkedInUrl ?? '',
        githubUrl: response.profile.githubUrl ?? '',
        portfolioUrl: response.profile.portfolioUrl ?? '',
        contactNumber: response.profile.contactNumber ?? '',
        skills: response.profile.skills ?? [],
      })

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['auth'] }),
        queryClient.invalidateQueries({ queryKey: ['cv'] }),
      ])
      toast.success(response.message)
    },
    onError: (error: AxiosError<ProfileErrorResponse>) => {
      handleError<ProfileErrorResponse>(error)
    },
  })

  function onSubmit(values: ProfileValues) {
    updateProfileMutation.mutate(profileSchema.parse(values))
  }

  function addSkill() {
    const skill = skillInput.trim().replace(/\s+/g, ' ')

    if (!skill) return

    const currentSkills = form.getValues('skills') ?? []
    const hasSkill = currentSkills.some(
      (currentSkill) => currentSkill.toLowerCase() === skill.toLowerCase(),
    )

    if (hasSkill) {
      setSkillInput('')
      return
    }

    form.setValue('skills', [...currentSkills, skill], {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
    setSkillInput('')
  }

  function removeSkill(skill: string) {
    const currentSkills = form.getValues('skills') ?? []

    form.setValue(
      'skills',
      currentSkills.filter((currentSkill) => currentSkill !== skill),
      {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      },
    )
  }

  function onSkillInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return

    event.preventDefault()
    addSkill()
  }

  function onSelectCv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf')

    if (!isPdf) {
      toast.error('Please select a PDF file')
      return
    }

    refillWithCvMutation.mutate(file)
  }

  const isProfileActionPending =
    updateProfileMutation.isPending || refillWithCvMutation.isPending

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
            <BreadcrumbPage>Profile</BreadcrumbPage>
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <UserCircle className="size-5 text-primary" />
              <h1 className="text-2xl font-semibold text-foreground">
                Profile
              </h1>
            </div>
            <Button
              type="button"
              variant="outline"
              isLoading={refillWithCvMutation.isPending}
              disabled={isProfileActionPending}
              onClick={() => cvInputRef.current?.click()}
            >
              <FileText />
              Fill with CV
            </Button>
            <input
              ref={cvInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={onSelectCv}
            />
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your name"
                          className="h-10 bg-background"
                          disabled={isProfileActionPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          className="h-10 bg-background"
                          disabled={true}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="linkedInUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn URL</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://linkedin.com/in/username"
                          className="h-10 bg-background"
                          disabled={isProfileActionPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="githubUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GitHub URL</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://github.com/username"
                          className="h-10 bg-background"
                          disabled={isProfileActionPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="portfolioUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Portfolio URL</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://yourportfolio.com"
                          className="h-10 bg-background"
                          disabled={isProfileActionPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact number</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+1 555 000 0000"
                          className="h-10 bg-background"
                          disabled={isProfileActionPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="skills"
                  render={({ field }) => {
                    const skills = field.value ?? []

                    return (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Skills</FormLabel>
                        <FormControl>
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <Input
                                value={skillInput}
                                onChange={(event) =>
                                  setSkillInput(event.target.value)
                                }
                                onKeyDown={onSkillInputKeyDown}
                                placeholder="React, TypeScript, Tailwind CSS"
                                className="h-10 bg-background"
                                disabled={isProfileActionPending}
                              />
                              <Button
                                type="button"
                                size="icon-lg"
                                className="size-10"
                                disabled={
                                  isProfileActionPending || !skillInput.trim()
                                }
                                onClick={addSkill}
                                aria-label="Add skill"
                              >
                                <Plus />
                              </Button>
                            </div>

                            {skills.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {skills.map((skill) => (
                                  <span
                                    key={skill}
                                    className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-semibold text-primary"
                                  >
                                    <span>{skill}</span>
                                    <button
                                      type="button"
                                      className="rounded-full p-0.5 text-primary/70 transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                      disabled={isProfileActionPending}
                                      onClick={() => removeSkill(skill)}
                                      aria-label={`Remove ${skill}`}
                                    >
                                      <X className="size-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                No skills added yet.
                              </p>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />
              </div>

              <div className="flex justify-end border-t pt-6">
                <Button
                  type="submit"
                  isLoading={updateProfileMutation.isPending}
                  disabled={isProfileActionPending}
                >
                  <Save />
                  Save profile
                </Button>
              </div>
            </form>
          </Form>
        </main>
      )}
    </>
  )
}
