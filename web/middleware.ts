import { NextResponse, type NextRequest } from 'next/server'

/**
 * Route protection.
 *
 * Presence of the session cookie is the gate for reaching the console shell;
 * validity is enforced by the API on every request (a forged cookie buys a login
 * screen, not data). Deep links are preserved through `?next=` so an expired
 * session returns the user where they were (docs/23 §2).
 */
const PUBLIC_PATHS = ['/login', '/foundation']

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const hasSession = Boolean(request.cookies.get('alutrack_session')?.value)
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  if (!hasSession && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    if (pathname !== '/') url.searchParams.set('next', `${pathname}${search}`)
    return NextResponse.redirect(url)
  }

  if (hasSession && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
