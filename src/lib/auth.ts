import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME } from '@/lib/constants'
import { prisma } from '@/lib/prisma'

type MaybePromise<T> = T | Promise<T>

export async function getCurrentUser(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  const session = await prisma.session.findUnique({
    where: {
      sessionToken: token,
    },
    select: {
      expiresAt: true,
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
          linkedInUrl: true,
          githubUrl: true,
          portfolioUrl: true,
          contactNumber: true,
          skills: true,
        },
      },
    },
  })

  if (!session) {
    return null
  }

  if (session.expiresAt <= new Date()) {
    await prisma.session.deleteMany({
      where: {
        sessionToken: token,
      },
    })

    return null
  }

  return session.user
}

export type AuthenticatedUser = NonNullable<
  Awaited<ReturnType<typeof getCurrentUser>>
>

export function withAuth<TContext = { params: Promise<Record<string, never>> }>(
  handler: (
    request: NextRequest,
    context: TContext,
    user: AuthenticatedUser,
  ) => MaybePromise<Response>,
) {
  return async (request: NextRequest, context: TContext) => {
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    return handler(request, context, user)
  }
}
