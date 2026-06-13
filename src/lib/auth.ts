import type { NextRequest } from 'next/server'
import { AUTH_COOKIE_NAME } from '@/lib/constants'
import { prisma } from '@/lib/prisma'

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
