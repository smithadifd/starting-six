import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

const PUBLIC_PATHS = ['/login', '/setup', '/api/auth', '/api/setup', '/api/health'];

const STATIC_PREFIXES = [
  '/_next',
  '/favicon.ico',
  '/manifest.json',
  '/apple-touch-icon',
  '/sw.js',
  '/serwist',
  '/icons',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
    || STATIC_PREFIXES.some(p => pathname === p || pathname.startsWith(p));
}

// Rate limiting (token bucket)
type RateLimitTier = { tokensPerMinute: number; burst: number };

const RATE_LIMITS: { pattern: RegExp; tier: RateLimitTier }[] = [
  { pattern: /^\/api\/sync/, tier: { tokensPerMinute: 3, burst: 3 } },
  { pattern: /^\/api\//, tier: { tokensPerMinute: 100, burst: 100 } },
];

type Bucket = { tokens: number; lastRefill: number };
const buckets = new Map<string, Bucket>();

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const BUCKET_STALE_MS = 10 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.lastRefill > BUCKET_STALE_MS) {
      buckets.delete(key);
    }
  }
}

function getTier(pathname: string): RateLimitTier {
  for (const { pattern, tier } of RATE_LIMITS) {
    if (pattern.test(pathname)) return tier;
  }
  return { tokensPerMinute: 100, burst: 100 };
}

function checkRateLimit(key: string, tier: RateLimitTier): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: tier.burst, lastRefill: now };
    buckets.set(key, bucket);
  }

  const elapsed = now - bucket.lastRefill;
  const refill = (elapsed / 60_000) * tier.tokensPerMinute;
  bucket.tokens = Math.min(tier.burst, bucket.tokens + refill);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true, retryAfter: 0 };
  }

  const retryAfter = Math.ceil((1 - bucket.tokens) / tier.tokensPerMinute * 60);
  return { allowed: false, retryAfter };
}

function applyRateLimit(request: NextRequest): NextResponse | null {
  cleanup();
  if (request.method === 'GET') return null;

  const pathname = request.nextUrl.pathname;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  const routeKey = pathname.split('/').slice(0, 4).join('/');
  const key = `${ip}:${routeKey}`;
  const tier = getTier(pathname);
  const { allowed, retryAfter } = checkRateLimit(key, tier);

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  return null;
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (STATIC_PREFIXES.some(p => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    if (pathname.startsWith('/api/')) {
      const rateLimitResponse = applyRateLimit(request);
      if (rateLimitResponse) return rateLimitResponse;
    }
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith('/api/')) {
    const rateLimitResponse = applyRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|svg|webp|woff2?|ttf|eot)$).*)',
  ],
};