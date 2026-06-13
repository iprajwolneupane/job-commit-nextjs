import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { signupSchema } from '@/lib/schema'
import { NextResponse } from 'next/server'
import * as z from 'zod'
import { AUTH_COOKIE_NAME, BCRYPT_SALT_ROUNDS, SESSION_DURATION_SECONDS } from '@/lib/constants'


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

  const result = signupSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      {
        message: 'Invalid registration details',
        errors: z.flattenError(result.error).fieldErrors,
      },
      { status: 400 },
    )
  }

  const { username, email, password } = result.data
  const normalizedEmail = email.toLowerCase()
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  })

  if (existingUser) {
    return NextResponse.json(
      { message: 'Email is already registered' },
      { status: 409 },
    )
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS)
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000)

  try {
    const { token } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          email: normalizedEmail,
          passwordHash,
        },
        select: {
          id: true,
          username: true,
          email: true,
        },
      })

      const token = jwt.sign(
        {
          sub: user.id,
          email: user.email,
          username: user.username,
        },
        jwtSecret,
        { expiresIn: `${SESSION_DURATION_SECONDS}s` },
      )

      await tx.session.create({
        data: {
          userId: user.id,
          sessionToken: token,
          expiresAt,
        },
      })

      return { token }
    })

    const response = NextResponse.json(
      { message: 'Account created' },
      { status: 201 },
    )

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
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { message: 'Email is already registered' },
        { status: 409 },
      )
    }

    throw error
  }
}
