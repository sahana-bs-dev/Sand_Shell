import { NextRequest, NextResponse } from "next/server";
import { PassThrough } from "stream";
import { getContainerId } from "@/lib/sessionStore";
import { docker } from "@/lib/docker";

interface FileNode {
  name: string;
  type: "file" | "directory";
  path: string;
  children?: FileNode[];
}

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId;

    const containerId = getContainerId(sessionId);
    if (!containerId) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const container = docker.getContainer(containerId);

    // Use `find` to get all files/directories up to 3 levels deep in /root
   const exec = await container.exec({
      Cmd: [
        "sh",
        "-c",
        "find /root -maxdepth 3 \\( -type f -o -type d \\) ! -path '*/\\.*' 2>/dev/null | sort",
      ],
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,               // <-- ADD this line
    });

    const stream = await exec.start({ stdin: false, hijack: true });   // <-- ADD hijack: true
    let stdout = "";
    let stderr = "";

    // exec was started without Tty:true, so Docker multiplexes stdout and
    // stderr into a single stream, each chunk prefixed with an 8-byte frame
    // header (1 byte stream type, 3 reserved, 4-byte big-endian length).
    // container.modem.demuxStream splits that back into separate streams —
    // reading the raw stream directly (as before) mixes binary header bytes
    // into the text and breaks line parsing below.
    const stdoutStream = new PassThrough();
    const stderrStream = new PassThrough();
    stdoutStream.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
    stderrStream.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    docker.modem.demuxStream(stream, stdoutStream, stderrStream);

    await new Promise<void>((resolve, reject) => {
      stream.on("end", () => resolve());
      stream.on("error", reject);
    });

    if (stderr) {
      console.error(`[editor] find stderr for container ${containerId}:`, stderr);
    }

    // Parse output into tree structure, skipping the "/root" line itself
    // (find lists the starting path too — we only want what's inside it)
    const lines = stdout
      .trim()
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line !== "/root");
    const files = buildFileTree(lines);

    console.log(
      `[editor] listed ${lines.length} items from container ${containerId}`
    );

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Failed to list files:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

function buildFileTree(paths: string[]): FileNode[] {
  const root: Record<string, FileNode> = {};

  paths.forEach((path) => {
    if (!path) return;

    // Skip hidden files and common non-code directories
    if (
      path.includes("/.") ||
      path.includes("/.cache") ||
      path.includes("/.npm")
    )
      return;

    const parts = path.replace("/root/", "").split("/").filter(Boolean);
    if (parts.length === 0) return;

    let current = root;
    let fullPath = "/root";

    parts.forEach((part, index) => {
      fullPath += "/" + part;
      const isFile = index === parts.length - 1;

      if (!current[part]) {
        current[part] = {
          name: part,
          type: isFile ? "file" : "directory",
          path: fullPath,
          children: isFile ? undefined : [],
        };
      }

      if (!isFile && current[part].children) {
        current = current[part].children as any;
      }
    });
  });

  return Object.values(root);
}