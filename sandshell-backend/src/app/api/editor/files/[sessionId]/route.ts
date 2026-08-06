import { NextRequest, NextResponse } from "next/server";
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

    // Parse output into tree structure
    const lines = output
      .trim()
      .split("\n")
      .filter((line) => line.length > 0);
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