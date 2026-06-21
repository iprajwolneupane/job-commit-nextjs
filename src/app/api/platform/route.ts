import { NextResponse } from 'next/server'
import * as z from 'zod'
import { withAuth } from '@/lib/auth'
import { platformSchema } from '@/lib/schema'
import {
  PlatformServiceError,
  createPlatform,
  listPlatforms,
} from './service'

export const GET = withAuth(async (_request, _context, user) => {
  const platforms = await listPlatforms(user.id)

  return NextResponse.json({ platforms })
})

export const POST = withAuth(async (request, _context, user) => {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  }

  const result = platformSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      {
        message: 'Invalid platform details',
        errors: z.flattenError(result.error).fieldErrors,
      },
      { status: 400 },
    )
  }

  try {
    const platform = await createPlatform(user.id, result.data)

    return NextResponse.json({ platform }, { status: 201 })
  } catch (error) {
    if (error instanceof PlatformServiceError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      )
    }

    throw error
  }
})
