'use client'

import { useMutation } from '@tanstack/react-query'
import { LogOut, Moon, Sun } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { AuthApi } from '@/lib/api'

export default function Home() {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
  const ThemeIcon = resolvedTheme === 'dark' ? Sun : Moon

  const logoutMutation = useMutation({
    mutationFn: AuthApi.logout,
    onSuccess: () => {
      toast.success('Logged out')
      router.replace('/login')
      router.refresh()
    },
    onError: () => {
      toast.error('Could not log out')
    },
  })

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-6">
      <section className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
        <div className="mb-10 flex items-center justify-between gap-4">
          <Image
            src="/logo/light-full-logo.svg"
            alt="JobCommit"
            width={192}
            height={48}
            priority
            className="h-auto w-48 dark:hidden"
          />
          <Image
            src="/logo/dark-full-logo.svg"
            alt="JobCommit"
            width={192}
            height={48}
            priority
            className="hidden h-auto w-48 dark:block"
          />

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              aria-label={`Switch to ${nextTheme} mode`}
              title={`Switch to ${nextTheme} mode`}
              onClick={() => setTheme(nextTheme)}
            >
              <ThemeIcon aria-hidden="true" className="size-4" />
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-8 gap-2 px-3"
              disabled={logoutMutation.isPending}
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut aria-hidden="true" className="size-4" />
              {logoutMutation.isPending ? 'Logging out' : 'Logout'}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-primary">Dashboard</p>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome to JobCommit
          </h1>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            You are signed in. Use this space to manage applications,
            follow-ups, and job search momentum.
          </p>
        </div>
      </section>
    </main>
  )
}
