import { NextRequest, NextResponse } from 'next/server';
import { docker } from '@/lib/docker';
import { getContainerId, removeSession } from '@/lib/sessionStore';

export async function DELETE(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    const containerId = getContainerId(sessionId);
    if (!containerId) {
      const response = NextResponse.json(
        { status: 'error', message: 'Session not found' },
        { status: 404 }
      );
      response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
      return response;
    }

    const container = docker.getContainer(containerId);
    await container.stop();
    await container.remove();

    removeSession(sessionId);

    const response = NextResponse.json({
      status: 'ok',
      message: 'Container stopped and removed',
    });
    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
    return response;
  } catch (error) {
    console.error('Failed to end session:', error);

    const response = NextResponse.json(
      { status: 'error', message: 'Failed to end session' },
      { status: 500 }
    );
    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
    return response;
  }
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  response.headers.set('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}