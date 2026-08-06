import { NextRequest, NextResponse } from "next/server";
import { PassThrough } from "stream";
import { getContainerId } from "@/lib/sessionStore";
import { docker } from "@/lib/docker";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, fileName, content } = await req.json();

    const containerId = getContainerId(sessionId);
    if (!containerId) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    const container = docker.getContainer(containerId);

    // Write file to container using exec with heredoc
    const exec = await container.exec({
      Cmd: [
        "sh",
        "-c",
        `cat > "${fileName}" << 'EOF'\n${content}\nEOF`,
      ],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({ stdin: true });

    // A Node Readable stream only starts flowing (and only fires 'end')
    // once something consumes it — attaching this listener is required,
    // not optional, or the promise below can hang forever on save.
    let stderrOutput = "";
    const stdoutStream = new PassThrough();
    const stderrStream = new PassThrough();
    stderrStream.on("data", (chunk: Buffer) => (stderrOutput += chunk.toString()));
    docker.modem.demuxStream(stream, stdoutStream, stderrStream);

    // Wait for the exec to finish
    await new Promise((resolve, reject) => {
      stream.on("end", resolve);
      stream.on("error", reject);
    });

    if (stderrOutput) {
      console.error(`[editor] save stderr for ${fileName}:`, stderrOutput);
    }

    console.log(`[editor] saved file ${fileName} in container ${containerId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save file:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}