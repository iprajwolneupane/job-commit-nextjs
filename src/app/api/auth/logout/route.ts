import { NextResponse, type NextRequest } from 'next/server'
import { AUTH_COOKIE_NAME } from '@/lib/constants'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value

    if (token) {
        await prisma.session.deleteMany({
            where: {
                sessionToken: token,
            },
        })
    }

    const response = NextResponse.json({ message: 'Logged out' })

    response.cookies.delete(AUTH_COOKIE_NAME)

    return response
}
