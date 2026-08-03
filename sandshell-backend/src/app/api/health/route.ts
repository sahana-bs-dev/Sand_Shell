// 1. Frontend calls fetch('http://localhost:3001/api/health')
// 2. Browser: "This is cross-origin — let me check first"
// 3. Browser silently sends OPTIONS request → your OPTIONS function responds with CORS headers
// 4. Browser: "Okay, that's allowed" → now sends the real GET request
// 5. Your GET function responds with the actual JSON data
// 6. Browser: "CORS headers present, frontend is allowed to read this" → fetch() resolves successfully

import { NextResponse } from 'next/server';

export async function GET() {
  const response = NextResponse.json({
    status: 'ok',
    message: 'Backend is running',
    timestamp: new Date().toISOString(),
  });

  response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

  return response;
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}