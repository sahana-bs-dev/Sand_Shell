import { NextRequest, NextResponse } from "next/server";
import { PassThrough } from "stream";
import { getContainerId } from "@/lib/sessionStore";
import { docker } from "@/lib/docker";

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("sessionId");
    const filePath = req.nextUrl.searchParams.get("filePath");

    if (!sessionId || !filePath) {
      return NextResponse.json(
        { error: "Missing sessionId or filePath" },
        { status: 400 }
      );
    }

    const containerId = getContainerId(sessionId);
    if (!containerId) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const container = docker.getContainer(containerId);

    // Read file from container
   const exec = await container.exec({
      Cmd: ["cat", filePath],
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
    });

    const stream = await exec.start({ stdin: false, hijack: true });

    // Same multiplexing issue as the files-listing route: exec isn't run
    // with Tty:true, so stdout/stderr share one stream with 8-byte frame
    // headers per chunk. Demux instead of reading the raw stream, or the
    // file's content comes back with binary header bytes mixed in.
    let output = "";
    let stderrOutput = "";
    const stdoutStream = new PassThrough();
    const stderrStream = new PassThrough();
    stdoutStream.on("data", (chunk: Buffer) => (output += chunk.toString()));
    stderrStream.on("data", (chunk: Buffer) => (stderrOutput += chunk.toString()));
    docker.modem.demuxStream(stream, stdoutStream, stderrStream);

    await new Promise<void>((resolve, reject) => {
      stream.on("end", () => resolve());
      stream.on("error", reject);
    });

    if (stderrOutput) {
      console.error(`[editor] cat stderr for ${filePath}:`, stderrOutput);
    }

    console.log(
      `[editor] read file ${filePath} from container ${containerId}`
    );

    const inspect = await exec.inspect();
    if (inspect.ExitCode !== 0) {
      // File doesn't exist yet (or another cat error) — treat as new/empty
      return NextResponse.json({ content: "" });
    }
    
    return NextResponse.json({ content: output });
  } catch (error) {
    console.error("Failed to read file:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}