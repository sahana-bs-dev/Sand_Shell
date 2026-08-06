import { NextRequest, NextResponse } from "next/server";
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

    // Wait for the exec to finish
    await new Promise((resolve, reject) => {
      stream.on("end", resolve);
      stream.on("error", reject);
    });

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