import { NextRequest, NextResponse } from "next/server";
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
    });

    const stream = await exec.start({ stdin: false });

    let output = "";
    stream.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });

    await new Promise<void>((resolve, reject) => {
      stream.on("end", () => resolve());
      stream.on("error", reject);
    });

    console.log(
      `[editor] read file ${filePath} from container ${containerId}`
    );

    return NextResponse.json({ content: output });
  } catch (error) {
    console.error("Failed to read file:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}