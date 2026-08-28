import { signIn } from '@/app/(auth)/auth';
import { isDevelopmentEnvironment } from '@/lib/constants';
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectUrl = searchParams.get('redirectUrl') || '/';

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  if (token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // next-auth 5.0.0-beta.32's signIn() signs in via an internal POST, then
  // redirects to `responseUrl ?? url` — where `url` is the credentials
  // callback. When that POST returns no Location (e.g. a cold Neon connection
  // makes authorize() fail), the browser is sent to GET the callback, which
  // Auth.js rejects for credentials providers, surfacing the misleading
  // /api/auth/error?error=Configuration. Resolve the target ourselves instead;
  // the session cookie is written either way, before signIn branches on
  // `redirect`.
  const target = await signIn('guest', {
    redirect: false,
    redirectTo: redirectUrl,
  });

  const safeTarget =
    typeof target === 'string' && !target.includes('/api/auth/callback/')
      ? target
      : redirectUrl;

  return NextResponse.redirect(new URL(safeTarget, request.url));
}
