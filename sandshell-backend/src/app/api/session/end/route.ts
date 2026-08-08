import { NextRequest, NextResponse } from 'next/server';
import { docker } from '@/lib/docker';
import { getContainerId, removeSession } from '@/lib/sessionStore';

export async function DELETE(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${timestamp}] 🔴 END SESSION REQUEST RECEIVED`);
  console.log('='.repeat(60));

  try {
    const body = await request.json();
    const { sessionId } = body;
    
    console.log(`\n📋 REQUEST DATA:`);
    console.log(`   sessionId: ${sessionId}`);

    if (!sessionId) {
      console.error(`❌ ERROR: No sessionId in request body!`);
      return NextResponse.json({ status: 'error', message: 'Missing sessionId' }, { status: 400 });
    }

    // NEW: Disconnect any active sockets for this session first!
    console.log(`\n🔍 STEP 0: Disconnecting all sockets for this session`);
    try {
      const socketServer = (global as any).__socketServer;
      if (socketServer && socketServer.disconnectSession) {
        socketServer.disconnectSession(sessionId);
        console.log(`✅ Sockets disconnected`);
      } else {
        console.warn(`⚠️ WARNING: Socket server not available`);
      }
    } catch (socketError: any) {
      console.warn(`⚠️ WARNING: Failed to disconnect sockets: ${socketError.message}`);
      // Continue anyway - we still want to try to remove the container
    }

    // Give sockets a moment to close properly
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log(`\n🔍 STEP 1: Looking up container for session: ${sessionId}`);
    const containerId = getContainerId(sessionId);
    
    if (!containerId) {
      console.error(`❌ ERROR: No container found for session ${sessionId}`);
      return NextResponse.json({ status: 'error', message: 'Session not found' }, { status: 404 });
    }

    console.log(`✅ Found container: ${containerId}`);

    console.log(`\n🔍 STEP 2: Getting Docker container object`);
    const container = docker.getContainer(containerId);
    console.log(`✅ Container object created`);

    // Inspect the container
    try {
      console.log(`\n🔍 STEP 3: Inspecting container state`);
      const inspect = await container.inspect();
      console.log(`   State.Running: ${inspect.State.Running}`);
      console.log(`   State.Status: ${inspect.State.Status}`);
    } catch (inspectError: any) {
      console.warn(`⚠️ WARNING: Could not inspect container: ${inspectError.message}`);
    }

    // Stop the container
    console.log(`\n🔍 STEP 4: Attempting to STOP container`);
    try {
      await container.stop();
      console.log(`✅ Container stopped successfully`);
    } catch (stopError: any) {
      console.warn(`⚠️ WARNING: Stop failed (this is OK): ${stopError.message}`);
    }

    // Remove the container with force flag - NOW the sockets are disconnected!
    console.log(`\n🔍 STEP 5: Attempting to REMOVE container with force: true`);
    try {
      await container.remove({ force: true });
      console.log(`✅ ✅ ✅ CONTAINER REMOVED SUCCESSFULLY ✅ ✅ ✅`);
    } catch (removeError: any) {
      console.error(`❌ REMOVE FAILED: ${removeError.message}`);
      console.error(`   Error code: ${removeError.statusCode}`);
      throw removeError;
    }

    // Clean up session store
    console.log(`\n🔍 STEP 6: Removing session from store`);
    removeSession(sessionId);
    console.log(`✅ Session removed from in-memory store`);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ 🎉 ALL STEPS COMPLETED SUCCESSFULLY 🎉 ✅`);
    console.log('='.repeat(60) + '\n');

    const response = NextResponse.json({
      status: 'ok',
      message: 'Container stopped and removed',
    });
    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
    return response;

  } catch (error: any) {
    console.error(`\n${'='.repeat(60)}`);
    console.error(`❌ FATAL ERROR IN END SESSION`);
    console.error(`   Error message: ${error.message}`);
    console.error('='.repeat(60) + '\n');

    const response = NextResponse.json(
      { status: 'error', message: `Failed to end session: ${error.message}` },
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