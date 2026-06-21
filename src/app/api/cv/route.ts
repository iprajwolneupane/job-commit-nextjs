import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import {
  CvServiceError,
  getCvResponse,
  refillProfileFromStoredCv,
  uploadCvForUser,
} from './service'

function serviceErrorResponse(error: CvServiceError) {
  return NextResponse.json(
    { message: error.message },
    { status: error.status },
  )
}

export const GET = withAuth(async (_request, _context, user) => {
  const cv = await getCvResponse(user.id)

  return NextResponse.json({ cv })
})

export const POST = withAuth(async (request, _context, user) => {
  let formData: FormData

  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ message: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json(
      { message: 'Please upload a PDF file' },
      { status: 400 },
    )
  }

  try {
    return NextResponse.json(await uploadCvForUser(user.id, file))
  } catch (error) {
    if (error instanceof CvServiceError) {
      return serviceErrorResponse(error)
    }

    throw error
  }
})

const refillProfile = withAuth(async (_request, _context, user) => {
  try {
    return NextResponse.json(await refillProfileFromStoredCv(user.id))
  } catch (error) {
    if (error instanceof CvServiceError) {
      return serviceErrorResponse(error)
    }

    throw error
  }
})

export const PUT = refillProfile
export const PATCH = refillProfile
