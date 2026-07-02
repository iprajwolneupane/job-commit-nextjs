'use client'

import { useMutation } from '@tanstack/react-query'
import { LogOut, Moon, Sun } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { AuthApi } from '@/lib/api'
import Header from '@/components/shared/header'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import Link from 'next/link'

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
    <main>
      <Header>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink asChild>
                <Link href="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Header>
    </main >
  )
}
