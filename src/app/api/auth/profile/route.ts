import { NextResponse } from 'next/server'
import * as z from 'zod'
import { withAuth } from '@/lib/auth'
import { profileSchema } from '@/lib/schema'
import { AuthServiceError, updateProfile } from '../service'

export const PUT = withAuth(async (request, _context, user) => {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  }

  const result = profileSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      {
        message: 'Invalid profile details',
        errors: z.flattenError(result.error).fieldErrors,
      },
      { status: 400 },
    )
  }

  try {
    const profile = await updateProfile(user.id, result.data)

    return NextResponse.json({
      message: 'Profile updated',
      profile,
    })
  } catch (error) {
    if (error instanceof AuthServiceError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      )
    }

    throw error
  }
})
