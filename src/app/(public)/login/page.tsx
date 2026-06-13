'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { BorderBeam } from '@/components/ui/border-beam'
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
import { SecureInput } from '@/components/ui/secure-input'
import { loginSchema, type LoginFormValues } from '@/lib/schema'
import { AuthService } from '@/lib/service'
import { handleError } from '@/lib/utils'

type LoginErrorResponse = {
  message?: string
  errors?: Partial<Record<keyof LoginFormValues, Array<string>>>
}

export default function Login() {
  const router = useRouter()
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const loginMutation = useMutation({
    mutationFn: AuthService.login,
    onSuccess: () => {
      toast.success('Signed in successfully')
      router.replace('/')
      router.refresh()
    },
    onError: (error: AxiosError<LoginErrorResponse>) => {
      handleError<LoginErrorResponse>(error)
    },
  })

  function onSubmit(values: LoginFormValues) {
    loginMutation.mutate(values)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-6">
      <section className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Image
            src="/logo/light-full-logo.svg"
            alt="JobCommit"
            width={224}
            height={56}
            priority
            className="h-auto w-56 dark:hidden"
          />
          <Image
            src="/logo/dark-full-logo.svg"
            alt="JobCommit"
            width={224}
            height={56}
            priority
            className="hidden h-auto w-56 dark:block"
          />
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-card p-6 text-card-foreground shadow-sm sm:p-8">
          <div className="mb-6 space-y-2">
            <p className="text-sm font-semibold text-primary">Welcome back</p>
            <h1 className="text-2xl font-bold text-foreground">
              Sign in to JobCommit
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Track applications, follow-ups, and every next step in one place.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        className="h-10 rounded-lg bg-background px-3 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <SecureInput
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        className="h-10 rounded-lg bg-background px-3 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-end">
                <a href="/forgot-password" className="text-sm font-semibold">
                  Forgot password?
                </a>
              </div>

              <Button
                type="submit"
                className="h-10 w-full rounded-lg text-sm font-semibold"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? 'Signing in' : 'Sign in'}
              </Button>
            </form>
          </Form>

          <div className="relative mt-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 font-semibold text-muted-foreground">
                Or sign in with Google
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="mt-5 h-10 w-full rounded-lg text-sm font-semibold"
          >
            <GoogleIcon />
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <a href="/signup" className="font-semibold">
              Create one
            </a>
          </p>

          <BorderBeam duration={10} size={150} borderWidth={2} />
        </div>
      </section>
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.54 1 10.22 1 12s.43 3.46 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  )
}
