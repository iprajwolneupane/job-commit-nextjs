import { NextResponse, type NextRequest } from 'next/server'

const AUTH_COOKIE_NAME = 'auth_token'
const AUTH_HOME_PATH = '/'
const LOGIN_PATH = '/login'
const PUBLIC_PATHS = ['/login', '/signup']

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasAuthToken = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  const isPublicRoute = isPublicPath(pathname)

  if (hasAuthToken && isPublicRoute) {
    return NextResponse.redirect(new URL(AUTH_HOME_PATH, request.url))
  }

  if (!hasAuthToken && !isPublicRoute) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
  