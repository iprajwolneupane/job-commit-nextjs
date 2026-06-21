import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async (_request, _context, user) => {
  return NextResponse.json(user)
})
