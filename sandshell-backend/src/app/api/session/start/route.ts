import { NextResponse } from 'next/server';
import { docker } from '@/lib/docker';
import { addSession } from '@/lib/sessionStore';
import { randomUUID } from 'crypto';

export async function POST() {
  try {
    const container = await docker.createContainer({
      Image: 'sandshell-ubuntu',
      Tty: true,
      Cmd: ['tail', '-f', '/dev/null'], // keeps container alive, idle
    });

    await container.start();

    const sessionId = randomUUID();
    addSession(sessionId, container.id);

    const response = NextResponse.json({
      status: 'ok',
      sessionId,
      containerId: container.id,
      message: 'Container started',
    });

    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
    return response;
  } catch (error) {
    console.error('Failed to start container:', error);

    const response = NextResponse.json(
      { status: 'error', message: 'Failed to start container' },
      { status: 500 }
    );
    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
    return response;
  }
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}