import { NextRequest, NextResponse } from "next/server";
import { PassThrough } from "stream";
import { getContainerId } from "@/lib/sessionStore";
import { docker } from "@/lib/docker";

import { Readable } from "stream";

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

    // Use Docker's putArchive to write file directly
    // This is more reliable than shell commands
    const tarStream = createSimpleTarArchive(fileName, content);

    await container.putArchive(tarStream, { path: "/" });

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

function createSimpleTarArchive(fileName: string, content: string): Readable {
  const tarHeader = Buffer.alloc(512);
  const contentBuffer = Buffer.from(content);
  const contentSize = contentBuffer.length;

  // Build tar header (simplified)
  const nameBuffer = Buffer.from(fileName);
  nameBuffer.copy(tarHeader, 0);
  
  // File size in octal (offset 124, 12 bytes)
  const sizeOctal = contentSize.toString(8).padStart(11, "0") + "\0";
  Buffer.from(sizeOctal).copy(tarHeader, 124);

  // Mode (offset 100, 8 bytes)
  Buffer.from("0000644\0").copy(tarHeader, 100);

  // Type flag (offset 156) - '0' for regular file
  tarHeader[156] = 48;

  // Checksum calculation
  let checksum = 0;
  for (let i = 0; i < 512; i++) {
    if (i >= 148 && i < 156) {
      checksum += 32; // space character for checksum field
    } else {
      checksum += tarHeader[i];
    }
  }
  const checksumOctal = checksum.toString(8).padStart(6, "0") + "\0 ";
  Buffer.from(checksumOctal).copy(tarHeader, 148);

  // Padding after content
  const paddingSize = 512 - (contentSize % 512);
  const padding = Buffer.alloc(paddingSize);
  const endMarker = Buffer.alloc(1024); // Two zero blocks to mark end of tar

  return Readable.from([tarHeader, contentBuffer, padding, endMarker]);
}