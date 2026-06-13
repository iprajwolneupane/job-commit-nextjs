'use client'

import AlertDialog from '@/components/ui/alert-dialog'
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/seperator'
import { Skeleton } from '@/components/ui/skeleton'
import { LOG_OUT_ACTION_TEXT, LOG_OUT_ALERT_DESCRIPTION } from '@/lib/constants'
import { AuthService } from '@/lib/service'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, LogOut, UserCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Props {
  children?: React.ReactNode
  searchComponent?: React.ReactNode
}

export default function Header({ children, searchComponent }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const {
    data: profile,
    isPending: profileIsPending,
    isError: profileIsError,
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: AuthService.me,
    retry: false,
  })

  const logoutMutation = useMutation({
    mutationFn: AuthService.logout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth'] })
      toast.success('Logged out')
      router.replace('/login')
      router.refresh()
    },
    onError: () => {
      toast.error('Could not log out')
    },
  })

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border bg-sidebar px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        {children}
      </div>
      {searchComponent}
      <div className="flex items-center gap-3">
        <AnimatedThemeToggler />
        {profileIsPending ? (
          <Skeleton className="size-9 shrink-0 rounded-full" />
        ) : profileIsError || !profile ? null : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-full"
                aria-label="Open profile menu"
              >
                <UserCircle aria-hidden="true" className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted font-semibold">
                    {profile.username[0]?.toUpperCase()}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {profile.username}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {profile.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link href="/change-password">
                    <KeyRound aria-hidden="true" className="size-4" />
                    Change Password
                  </Link>
                </DropdownMenuItem>
                <AlertDialog
                  description={LOG_OUT_ALERT_DESCRIPTION}
                  actionText={LOG_OUT_ACTION_TEXT}
                  actionHandler={() => logoutMutation.mutate()}
                  isLoading={logoutMutation.isPending}
                  triggerClassName="w-full"
                >
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={(event) => event.preventDefault()}
                  >
                    <LogOut aria-hidden="true" className="size-4" />
                    Log out
                  </DropdownMenuItem>
                </AlertDialog>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
