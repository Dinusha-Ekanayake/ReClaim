import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (origin !== requestOrigin || fetchSite === 'cross-site') {
    return NextResponse.json({ error: 'Cross-site logout rejected' }, {
      status: 403,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const response = new NextResponse(null, {
    status: 204,
    headers: { 'Cache-Control': 'no-store' },
  });
  const secure = process.env.NODE_ENV === 'production';
  response.cookies.set('reclaim_access', '', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/api',
    expires: new Date(0),
  });
  response.cookies.set('reclaim_refresh', '', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/api/auth',
    expires: new Date(0),
  });
  return response;
}
