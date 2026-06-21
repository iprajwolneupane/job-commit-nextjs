import { NextResponse } from 'next/server'
import * as z from 'zod'
import { withAuth } from '@/lib/auth'
import { platformSchema } from '@/lib/schema'
import {
  PlatformServiceError,
  deletePlatform,
  getPlatform,
  updatePlatform,
} from '../service'

type PlatformRouteContext = {
  params: Promise<{
    platformId: string
  }>
}

export const GET = withAuth<PlatformRouteContext>(
  async (_request, context, user) => {
    const { platformId } = await context.params
    const platform = await getPlatform(platformId, user.id)

    if (!platform) {
      return NextResponse.json({ message: 'Platform not found' }, { status: 404 })
    }

    return NextResponse.json({ platform })
  },
)

export const PUT = withAuth<PlatformRouteContext>(
  async (request, context, user) => {
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

    const { platformId } = await context.params

    try {
      const platform = await updatePlatform({
        platformId,
        userId: user.id,
        values: result.data,
      })

      return NextResponse.json({ platform })
    } catch (error) {
      if (error instanceof PlatformServiceError) {
        return NextResponse.json(
          { message: error.message },
          { status: error.status },
        )
      }

      throw error
    }
  },
)

export const DELETE = withAuth<PlatformRouteContext>(
  async (_request, context, user) => {
    const { platformId } = await context.params

    try {
      await deletePlatform(platformId, user.id)

      return NextResponse.json({ message: 'Platform deleted' })
    } catch (error) {
      if (error instanceof PlatformServiceError) {
        return NextResponse.json(
          { message: error.message },
          { status: error.status },
        )
      }

      throw error
    }
  },
)
