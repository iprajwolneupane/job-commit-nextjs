import { NextResponse } from 'next/server'
import * as z from 'zod'
import { AUTH_COOKIE_NAME, SESSION_DURATION_SECONDS } from '@/lib/constants'
import { loginSchema } from '@/lib/schema'
import { AuthServiceError, loginUser } from '../service'

export async function POST(request: Request) {
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

  try {
    const token = await loginUser(result.data)
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
  } catch (error) {
    if (error instanceof AuthServiceError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      )
    }

    throw error
  }
}
