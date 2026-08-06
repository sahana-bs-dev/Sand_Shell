import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Preflight (OPTIONS) requests need an immediate 200 with the CORS
  // headers. Letting them fall through to a route with no OPTIONS
  // handler returns a 405, which fails the browser's preflight check
  // even though the headers would technically be attached.
  if (request.method === 'OPTIONS') {
    const preflightResponse = new NextResponse(null, { status: 200 });
    preflightResponse.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
    preflightResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    preflightResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return preflightResponse;
  }

  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

export const config = {
  matcher: '/api/:path*',
};