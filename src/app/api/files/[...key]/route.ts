import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getObjectStream } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { key } = await params;
  const objectKey = key.join("/");

  try {
    const { stream, contentType } = await getObjectStream(objectKey);
    return new NextResponse(stream, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
