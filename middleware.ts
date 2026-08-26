import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/ping')) {
    return new Response('pong', { status: 200 });
  }

  // Authentication is enforced in route handlers and server pages. Keeping this
  // middleware free of Auth.js imports avoids loading Node-only dependencies in
  // Vercel's Edge runtime.
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/chat/:id',
    '/api/:path*',
    '/login',
    '/register',
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
