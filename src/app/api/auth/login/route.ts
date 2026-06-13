import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'
import * as z from 'zod'
import {
  AUTH_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from '@/lib/constants'
import { prisma } from '@/lib/prisma'
import { loginSchema } from '@/lib/schema'

export async function POST(request: Request) {
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    return NextResponse.json(
      { message: 'JWT_SECRET is not configured' },
      { status: 500 },
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  }

  const result = loginSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      {
        message: 'Invalid login details',
        errors: z.flattenError(result.error).fieldErrors,
      },
      { status: 400 },
    )
  }

  const { email, password } = result.data
  const normalizedEmail = email.toLowerCase()
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      username: true,
      email: true,
      passwordHash: true,
    },
  })

  if (!user?.passwordHash) {
    return NextResponse.json(
      { message: 'Invalid email or password' },
      { status: 401 },
    )
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

  if (!isPasswordValid) {
    return NextResponse.json(
      { message: 'Invalid email or password' },
      { status: 401 },
    )
  }

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      username: user.username,
    },
    jwtSecret,
    { expiresIn: `${SESSION_DURATION_SECONDS}s` },
  )
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000)

  await prisma.session.upsert({
    where: {
      userId: user.id,
    },
    create: {
      userId: user.id,
      sessionToken: token,
      expiresAt,
    },
    update: {
      sessionToken: token,
      expiresAt,
    },
  })

  const response = NextResponse.json({ message: 'Logged in' })

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  })

  return response
}
